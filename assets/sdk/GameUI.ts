import { _decorator, Component, Node } from 'cc';
import { IAAAdManager } from './IAAAdManager';
const { ccclass, property } = _decorator;

@ccclass('GameUI')
export class GameUI extends Component {
    @property(Node)
    private initButton: Node = null;
    start() {
        this.initButton.on(Node.EventType.TOUCH_END, this.onInitButtonClick, this);
    }

    onInitButtonClick() {
        console.log('onInitButtonClick');
        IAAAdManager.initSdk(
            (attributed: boolean, info: string) => {
                console.log('User Attribute:', attributed, info);
            },
            (initialized: boolean) => {
                console.log('Ad Init:', initialized);
            }
        );
    }
    update(deltaTime: number) {
        
    }
}

