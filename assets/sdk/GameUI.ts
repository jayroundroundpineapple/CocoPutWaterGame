import { _decorator, Component, Node } from 'cc';
import { AdManager } from './adManager';
import { AdType } from './ad-enums';
const { ccclass, property } = _decorator;

@ccclass('GameUI')
export class GameUI extends Component {
    @property(Node)
    private initButton: Node = null;
    @property(Node)
    private showrewardBtn: Node = null;
    start() {
        this.initButton.on(Node.EventType.TOUCH_END, this.onInitButtonClick, this);
        this.showrewardBtn.on(Node.EventType.TOUCH_END, this.onShowRewardButtonClick, this);
    }

    onInitButtonClick() {
        console.log('onInitButtonClick');
        AdManager.InitSdk(
            (attributed: boolean, info: string) => {
                console.log('User Attribute:', attributed, info);
            },
            (initialized: boolean) => {
                console.log('Ad Init:', initialized);
            }
        );
    }
    onShowRewardButtonClick() {
        console.log('onShowRewardButtonClick');
        AdManager.ShowAd(AdType.AD_TYPE_Reward, 'reward_placement',(adtype,adevent,error)=>{
            console.log('Ad Event:', adtype, adevent, error);
        });
    }
    update(deltaTime: number) {
        
    }
}

