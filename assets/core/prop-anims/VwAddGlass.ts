/**
 * @Descripttion:
 * 使用交换道具：先显示一层选择特效，提示用户选择一个瓶子。选择瓶子后，完成选中瓶子内水层的随机交换
 * @version: 1.0
 * @Author: Lioesquieu
 * @Date: 2025-08-07
 * @LastEditors: Lioesquieu
 * @LastEditTime: 2025-08-07
 */
import {_decorator, Component, instantiate, EventTouch, Node, v3, Vec2, Prefab, UITransform} from 'cc';
import { VwFunland } from '../VwFunland';
import { GlassInfo } from '../FunlandInfo';

const {ccclass, menu, property} = _decorator;

@ccclass('VwAddGlass')
@menu('cwg/VwAddGlass')
export class VwAddGlass extends Component {

    @property(Node)
    protected contentNode: Node;

    @property(Prefab)
    protected dmNode: Prefab;

    @property(VwFunland)
    protected funlandView: VwFunland;

    public show() {
        // 把this.funland.glasses按列分组
        const glassMap: Map<number, GlassInfo[]> = new Map();
        this.funlandView.funland.glasses.forEach((glass) => {
            let column =  glassMap.get(glass.position.x);
            if (!column) {
                column = [];
                glassMap.set(glass.position.x, column);
            }
            column.push(glass);
        });

        let addGlassInfo = undefined;
        for (const [key, columns] of glassMap) {
            if (columns.length >= 4) {
                continue;
            }
            // 如果这一列的上面可以放
            if (columns[0].position.y <= 40) {
                addGlassInfo = {
                    position: { x: columns[0].position.x, y: columns[0].position.y + 260 },
                    colors: [],
                    hideCnt: 0,
                    ad: false,
                }
                break;
            }
            // 如果这一列的下面可以放
            const lastGlass = columns[columns.length - 1];
            if (lastGlass.position.y >= -220) {
                addGlassInfo = {
                    position: { x: lastGlass.position.x, y: lastGlass.position.y - 260 },
                    colors: [],
                    hideCnt: 0,
                    ad: false,
                }
                break;
            }
        }
        if (!addGlassInfo) {
            this.hide();
            return;
        }
        this.node.worldPosition = this.funlandView.node.worldPosition;
        this.node.active = true;

        this.scheduleOnce(() => {
            const node = instantiate(this.dmNode);
            node.active = true;
            node.parent = this.contentNode;
            node.position = v3(addGlassInfo.position.x, addGlassInfo.position.y, 0);

            this.funlandView.addEmptyGlass(addGlassInfo);
        }, 0.3);

        this.scheduleOnce(() => {
            this.hide();
        }, 1);
    }

    public hide() {
        this.contentNode.removeAllChildren();
        this.node.active = false;
    }
}