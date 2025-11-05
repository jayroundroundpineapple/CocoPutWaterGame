
import {_decorator, Component, instantiate, EventTouch, Node, v3, Vec2, Prefab, UITransform} from 'cc';
import { CwgPools } from './CwgPools';
import Glass from './Glass';

const {ccclass, menu, property} = _decorator;

@ccclass('VwEffect')
@menu('cwg/VwEffect')
export class VwEffect extends Component {

    @property({type: CwgPools})
    protected pools: CwgPools;

    public showFullSeled(glass: Glass) {
        const fullSeled = this.pools.getFullSealedEffect(glass.node.position, this.node);
        if (fullSeled) {
            fullSeled.ps.startColor = glass.waterColor;
            // fullSeled.ps.endColor = glass.waterColor;
            fullSeled.play(() => {
                this.pools.recycleFullSealedEffect(fullSeled.node);
            });
        }
    }

    
}