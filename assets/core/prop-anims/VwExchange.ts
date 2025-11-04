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

const {ccclass, menu, property} = _decorator;

@ccclass('VwExchange')
@menu('cwg/VwExchange')
export class VwExchange extends Component {

    @property(Node)
    protected contentNode: Node;

    @property(Prefab)
    protected dmNode: Prefab;

    @property(VwFunland)
    protected funlandView: VwFunland;

    public show() {
        this.node.active = true;
        this.contentNode.removeAllChildren();
        let showCount = 0;
        this.funlandView.glasses.forEach((glass) => {
            if (glass.isAd() || glass.isEmpty || glass.isSealed() || glass.isAllHide()) {
                return;
            }
            const node = instantiate(this.dmNode);
            node.active = true;
            node.parent = this.contentNode;
            node.worldPosition = glass.node.worldPosition;

            node.once(Node.EventType.TOUCH_END, () => {
                this.funlandView.handleRandExchangeColors(glass);
                this.hide();
            }, this);
            showCount ++;
        });
        if (showCount === 0) {
            this.hide();
        }
    }

    public hide() {
        this.contentNode.removeAllChildren();
        this.node.active = false;
    }


}