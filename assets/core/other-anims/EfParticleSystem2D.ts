/**
 * @Descripttion:
 * 水满了，显示一个特效
 * @version: 1.0
 * @Author: Lioesquieu
 * @Date: 2025-08-08
 * @LastEditors: Lioesquieu
 * @LastEditTime: 2025-08-08
 */
import {_decorator, Component, instantiate, EventTouch, Node, v3, Vec2, Prefab, UITransform, ParticleSystem2D} from 'cc';

const {ccclass, menu, property} = _decorator;

@ccclass('EfParticleSystem2D')
@menu('cwg/EfParticleSystem2D')
export class EfParticleSystem2D extends Component {

    @property(ParticleSystem2D)
    public ps: ParticleSystem2D;

    public play(complete?: () => void) {
        this.node.active = true;
        if (this.ps) {
            this.ps.resetSystem();
            if (this.ps.duration > 0) {
                this.scheduleOnce(complete, this.ps.duration + this.ps.life + this.ps.lifeVar);
            }
        }
    }

    public stop() {
        this.ps && this.ps.stopSystem();
        this.node.active = false;
    }
}