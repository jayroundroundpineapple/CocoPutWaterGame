import { _decorator, Component, Node, SpriteFrame } from 'cc';
import { AdManager } from './adManager';
import { AdType } from './ad-enums';
import { PuzzleManager } from './PuzzleManager';
const { ccclass, property } = _decorator;

@ccclass('GameUI')
export class GameUI extends Component {
    @property(Node)
    private initButton: Node = null;
    @property(Node)
    private showrewardBtn: Node = null;
    
    @property(PuzzleManager)
    private puzzleManager: PuzzleManager = null;  //拼图管理器
    
    @property(SpriteFrame)
    private puzzleImage: SpriteFrame = null;  // 拼图图片
    
    start() {
        this.initButton.on(Node.EventType.TOUCH_END, this.onInitButtonClick, this);
        this.showrewardBtn.on(Node.EventType.TOUCH_END, this.onShowRewardButtonClick, this);
        this.initPuzzle();
    }
    
    /**
     * 初始化拼图游戏
     */
    private initPuzzle() {
        if (!this.puzzleManager) {
            console.error('PuzzleManager 未设置！');
            return;
        }
        let spriteFrame: SpriteFrame = null;
        if (this.puzzleImage) {
            spriteFrame = this.puzzleImage;
        } 
        if (spriteFrame) {
            this.puzzleManager.onPuzzleComplete = (level: number) => {
                this.onPuzzleComplete(level);
            };
            // this.puzzleManager.startPuzzle(spriteFrame);
        } else {
            console.error('无法获取拼图图片！请设置 puzzleImage');
        }
    }
    
    /**
     * 拼图完成回调
     */
    private onPuzzleComplete(level: number) {
        console.log(`恭喜！完成第 ${level} 关拼图！`);
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

