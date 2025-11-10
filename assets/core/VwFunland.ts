
import {_decorator, Component, EventTouch, Node, v3, Vec2} from 'cc';
import {CwgPools} from "./CwgPools";
import Glass from "./Glass";
import {WaterColor} from './CwgConstant';
import Toolkit from "../common/Toolkit";
import FunlandInfo, { GlassInfo } from './FunlandInfo';
import EventMng from '../common/EventMng';
import { VwEffect } from './VwEffect';
import SoundComp from './SoundComp';

const {ccclass, menu, property} = _decorator;

@ccclass('VwFunland')
@menu('cwg/VwFunland')
export class VwFunland extends Component {

    @property(Node)
    protected contentNode: Node;

    @property(VwEffect)
    protected effectView: VwEffect;

    @property(CwgPools)
    protected pools: CwgPools;

    @property(Node)
    protected glassesNode: Node;

    @property(SoundComp)
    protected soundComp: SoundComp;

    public funland: FunlandInfo;

    public glasses: Glass[] = [];

    public undoStack: [Glass, WaterColor[]][] = undefined;

    public finished: boolean = false;

    protected onLoad() {
        console.log("StVwFunland")
    }

    // 初始化游乐场布局
    public reset(funland: FunlandInfo) {
        this.funland = funland;

        this.glassesNode.removeAllChildren();
        this.glasses = [];
        
        // 根据配置生成玻璃瓶阵列
        for (let i = 0, len = funland.glasses.length; i < len; i++) {
            const glassInfo = funland.glasses[i];
            const glass = this.createGlass(glassInfo);
            this.glasses.push(glass);
        }
        // 让水面显示出来
        this.scheduleOnce(() => {
            this.glasses.forEach(glass => {
                glass.resetSurface();
            })
        }, 0.0);
    }

    protected createGlass(glassInfo: GlassInfo) {
        // 从对象池获取玻璃瓶实例
        const glass = this.pools.getGlass();
        glass.init(Toolkit.cloneObj(glassInfo) as GlassInfo);

        // 设置玻璃瓶位置并激活
        const glassNode = glass.node;
        glassNode.position = v3(glassInfo.position.x, glassInfo.position.y, 0);
        glassNode.parent = this.glassesNode;
        glassNode.active = true;
        return glass;
    }

    // 触摸事件处理
    protected setTouchListener() {
        this.contentNode.targetOff(this);
        let lastSelectedGlass: Glass = undefined;
        // 注册触摸结束事件
        this.contentNode.on(Node.EventType.TOUCH_END, (touch: EventTouch) => {
            console.log("jay触摸事件处理")
            if (this.finished) {
                return;
            }
            // 判断哪个瓶子被点击到了
            // 查找被点击的玻璃瓶
            const currentSelected = this.handleTouchEnd(touch.getUILocation());
            // 有效性检查
            if (!this.isValidSelection(currentSelected)) {
                return;
            }
            if (currentSelected.isAd()) {
                this.handleAdGlass(currentSelected);
                return;
            }
            // 处理重复点击同一玻璃瓶
            if (lastSelectedGlass && currentSelected == lastSelectedGlass) {
                console.log('jay重复点击同一玻璃瓶')
                lastSelectedGlass.putDown();
                lastSelectedGlass = undefined;
                return;
            }

            // 倒水逻辑处理
            // 前面选择的不是空瓶，并且当前的瓶子没有满
            if (lastSelectedGlass && !lastSelectedGlass.isEmpty && !currentSelected.isFull) {
                // 如果选择的玻璃瓶的颜色和之前的选择的玻璃瓶的颜色是一样的
                // 把玻璃瓶的水导入之前玻璃瓶中
                // 1 判断顶层的水的颜色是否相同
                if (this.handleWaterTransfer(lastSelectedGlass, currentSelected)) {
                    lastSelectedGlass = undefined;
                    return;
                }
            }
            // 更新选中状态
            lastSelectedGlass?.putDown();
            this.pickup(currentSelected);
            lastSelectedGlass = currentSelected;
        }, this);
    }

    private handleTouchEnd(location: Vec2) {
        return this.glasses.find((glass, index) =>
            glass.getTouchBoundingBoxToWorld().contains(location)
        );
    }

    private isValidSelection(glass: Glass) {
        return glass?.node.active && !glass.isSealed();
    }

    private handleWaterTransfer(source: Glass, target: Glass) {
        if (source.waterColorID === target.waterColorID || target.isEmpty) {
            this.playPourOutWater(source, target);
            return true;
        }
        return false;
    }

    // 播放倒水动画并处理状态更新
    protected playPourOutWater(lastSelected: Glass, currentSelected: Glass): void {
        // 把两个瓶子隐藏起来，等待动画播放完成
        lastSelected.node.active = false;
        currentSelected.hide();

        // 保存当前的状态，方便撤销操作，恢复原来的状态
        const undoStack = [];
        undoStack.push([lastSelected, [...lastSelected.info.colors]]);
        undoStack.push([currentSelected, [...currentSelected.info.colors]]);
        this.undoStack = undefined;

        // 从对象池获取动画资源
        // 使用两个动画对象，一个是倒出水的动画，一个是装水的动画
        const pourAnim = this.pools.getPourOutAnim(lastSelected, this.effectView.node);
        const flowAnim = this.pools.getFlowingAnim(currentSelected, this.glassesNode);

        // 根据相对位置调整动画方向
        if (lastSelected.node.x > currentSelected.node.x) {
            pourAnim.node.scale = v3(-1, 1, 1);
        } else {
            pourAnim.node.scale = v3(1, 1, 1);
        }

        // 完成实际的倒水状态（非倒水），获得倒水的数据: addWaters
        const transferredWaters: WaterColor[] = [];
        // 倒水逻辑：当目标玻璃未满且（颜色相同或目标玻璃为空）时持续倒水
        while (this.canTransferWater(lastSelected, currentSelected)) {
            const water = lastSelected.pourOutWater();
            currentSelected.addIntoWater(water);
            transferredWaters.push(water);
        }

        // 更新玻璃瓶状态
        lastSelected.updateDisplayState();
        currentSelected.updateDisplayState();

        // 配置动画初始位置
        // 当前选择的瓶子飞到前面选择的瓶子上分
        const worldPosition = flowAnim.flowingNode.worldPosition;
        const pickupFromPosition = lastSelected.node.worldPosition.clone().add3f(17, 220, 0);
        pourAnim.pickUpMoveTo(pickupFromPosition.clone().add3f(0, lastSelected.pickupHeight, 0), worldPosition);

        // 播放倒水动画
        let started = false;
        pourAnim.play(transferredWaters).on('startPour', (layerIdx: number, color: WaterColor) => {
            // 水流动画在倒水开始时同步播放
            // 播放装水的动画
            flowAnim.play(color);
            // 水流声音只播放一次
            if (!started) {
                started = true;
                flowAnim.playWaterSound(transferredWaters.length);
            }
        }).on('completePour', async (layerIdx: number) => {
            // 接水动画结束，原来的瓶子显示出来
            flowAnim.complete().then(() => {
                this.pools.recycleFlowingAnim(flowAnim)
                currentSelected.show();

                // 已经满了盖上了
                if (currentSelected.isSealed()) {
                    // 水满了，显示一个特效
                    this.effectView.showFullSeled(currentSelected);
                    this.undoStack = undefined; // 不能再撤销
                } else {    // 没有满，可以撤销
                    this.undoStack = undoStack;
                }
            })
            // 动画完成后回收资源并恢复显示
            // 倒水动画结束后，把瓶子显示出来
            // 倒水结束后，瓶子回到原来的位置
            pourAnim.putDownBack().then(() => {

                // 倒水动画结束后，把瓶子显示出来
                this.pools.recyclePourOutAnim(pourAnim);
                lastSelected.node.active = true;
                lastSelected.putDown();
                
                this.scheduleOnce(() => {
                    // 判断是不是有隐藏的，判断隐藏的要不要显示出来
                    if (lastSelected.isAllHide()) {
                        lastSelected.showHide();
                    }
                    EventMng.emit('completePour');
                }, 0.1);
            })
        });
    }

    // 判断是否满足倒水条件
    private canTransferWater(source: Glass, target: Glass): boolean {
        return !target.isFull && !source.isAllHide() &&
            (source.waterColorID === target.waterColorID || target.isEmpty);
    }

    protected pickup(glass: Glass) {
        this.soundComp.playPickup();
        glass.pickup();
    }

    public playStart() {
        this.setTouchListener();
        this.finished = false;
    }

    protected handleAdGlass(glass: Glass) {
        console.log("观看广告解锁瓶子")
        if (!glass.isAd()) {
            return;
        }
        glass.removeAd();
    }

    public handleRandExchangeColors(glass: Glass) {
        this.schedule(() => {
            glass.randExchangeColors();
        }, 0.17, 8);
    }

    public handleUndo() {
        if (!this.undoStack) {
            return;
        }
        this.undoStack.forEach(([glass, colors]) => {
            glass.reset(colors);
        })
        this.undoStack = undefined;
    }

    public addEmptyGlass(addGlassInfo: GlassInfo) {
        console.log('addEmptyGlass')
        if (addGlassInfo) {
            this.funland.glasses.push(addGlassInfo);
            // 进行排序，按y从大到小排，x从小到大排序
            this.funland.glasses.sort((a, b) => {
                if (a.position.y != b.position.y) {
                    return b.position.y - a.position.y;
                }
                return a.position.x - b.position.x;
            })
            // 创建一个新瓶子
            const glass = this.createGlass(addGlassInfo);
            this.glasses.push(glass);
        }
    }
}