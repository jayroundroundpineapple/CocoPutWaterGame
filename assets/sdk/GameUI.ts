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
    @property(Node)
    private picNode: Node = null;  // 原始图片节点（用于获取SpriteFrame）
    
    @property(PuzzleManager)
    private puzzleManager: PuzzleManager = null;  // 拼图管理器
    
    @property(SpriteFrame)
    private puzzleImage: SpriteFrame = null;  // 拼图图片（可以从picNode获取或直接指定）
    
    start() {
        this.initButton.on(Node.EventType.TOUCH_END, this.onInitButtonClick, this);
        this.showrewardBtn.on(Node.EventType.TOUCH_END, this.onShowRewardButtonClick, this);
        // 初始化拼图游戏
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
        } else if (this.picNode) {
            const sprite = this.picNode.getComponent('cc.Sprite') as any;
            if (sprite && sprite.spriteFrame) {
                spriteFrame = sprite.spriteFrame;
            }
        }
        if (spriteFrame) {
            if (this.picNode) {
                this.picNode.active = false;
            }
            this.puzzleManager.onPuzzleComplete = (level: number) => {
                this.onPuzzleComplete(level);
            };
            this.puzzleManager.startPuzzle(spriteFrame);
        } else {
            console.error('无法获取拼图图片！请设置 puzzleImage 或确保 picNode 有 Sprite 组件');
        }
    }
    
    /**
     * 拼图完成回调
     */
    private onPuzzleComplete(level: number) {
        console.log(`恭喜！完成第 ${level} 关拼图！`);
        
        // 可以在这里添加完成效果
        // 例如：播放音效、显示奖励等
        
        // 如果需要，可以显示广告
        // AdManager.ShowAd(AdType.AD_TYPE_Reward, 'reward_placement', ...);
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

