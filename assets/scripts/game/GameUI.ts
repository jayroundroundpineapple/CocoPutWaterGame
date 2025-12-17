import { _decorator, Button, Component, Node, SpriteFrame, AudioSource, sys, Tween, tween, Vec3, EditBox, Label, Graphics, UITransform, UIOpacity, EventTouch } from 'cc';
import { PuzzleManager } from './PuzzleManager';
import { PuzzleSuccessUI } from '../UI/PuzzleSuccessUI';
import { AudioManager } from '../utils/AudioManager';
import { PlayerAdSdk } from '../PlayerAdSdk';
const { ccclass, property } = _decorator;

@ccclass('GameUI')
export class GameUI extends Component {
    @property(Node)
    private finger: Node = null;
    @property(PuzzleManager)
    private puzzleManager: PuzzleManager = null;  //拼图管理器
    @property(PuzzleSuccessUI)
    private puzzleSuccessUI: PuzzleSuccessUI = null;  // 拼图成功弹窗UI
    @property(Node)
    private puzzleGameUI: Node = null;  // 拼图游戏UI
    @property(SpriteFrame)
    private puzzleImage: SpriteFrame = null;  // 拼图图片

    private static instance: GameUI = null;
    private bgmNode: Node = null; // 背景音乐节点
    private sfxNode: Node = null; // 音效节点
    private audioManager: AudioManager = null;
    private fingerTween: Tween<Node> = null; // 手指动画
    private audioInitialized: boolean = false; // 音频是否已初始化
    
    protected onLoad(): void {
        PlayerAdSdk.init();
        // 添加触摸事件监听器，等待用户第一次点击
        this.node.on(Node.EventType.TOUCH_START, this.onFirstTouch, this);
    }
    public static getInstance(): GameUI {
        if (!GameUI.instance) {
            GameUI.instance = new GameUI();
        }
        return GameUI.instance;
    }
    start() {
        GameUI.instance = this;
        (window as any).gameUI = this;
        // 初始化完成后自动开始游戏
        this.initPuzzle();
        this.finger.active = false;
        this.initPuzzleSuccessUI();
        this.puzzleSuccessUI.node.active = false;
        // 音频系统延迟到用户第一次点击后再初始化
        
        // 延迟一点时间，确保所有初始化完成后再开始游戏
        this.scheduleOnce(() => {
            this.autoStartGame();
        }, 0.1);
    }
    /**
     * 第一次触摸屏幕时调用（初始化音频系统）
     */
    private onFirstTouch(event: EventTouch): void {
        // 如果已经初始化过，直接返回
        if (this.audioInitialized) {
            return;
        }
        
        // 初始化音频系统
        this.initAudio();
        this.audioInitialized = true;
        
        // 移除触摸监听器（只需要初始化一次）
        this.node.off(Node.EventType.TOUCH_START, this.onFirstTouch, this);
    }
    
    /**
     * 初始化音频系统
     */
    private initAudio(): void {
        // 获取音频管理器实例
        this.audioManager = AudioManager.getInstance();

        // 创建音频节点（如果未设置）
        if (!this.bgmNode) {
            this.bgmNode = new Node('BGMNode');
            this.bgmNode.parent = this.node;
            this.bgmNode.addComponent(AudioSource);
        }

        if (!this.sfxNode) {
            this.sfxNode = new Node('SFXNode');
            this.sfxNode.parent = this.node;
            this.sfxNode.addComponent(AudioSource);
        }
        // 初始化音频管理器（会自动播放背景音乐）
        this.audioManager.init(this.bgmNode, this.sfxNode);
    }
    /**
     * 初始化拼图成功弹窗UI
     */
    private initPuzzleSuccessUI() {
        if (this.puzzleSuccessUI) {
            // 设置下一关回调
            this.puzzleSuccessUI.onNextLevel = () => {
                // this.onNextLevelClick();
            };
        }
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
            // 设置指引步骤变化回调
            this.puzzleManager.onTipStepChange = (step: number, fromPiece: any, backPiece: any | null) => {
                this.onTipStepChange(step, fromPiece, backPiece);
            };
        } else {
            console.log('无法获取拼图图片！请设置 puzzleImage');
        }
    }

    /**
     * 指引步骤变化回调
     */
    private onTipStepChange(step: number, fromPiece: any, backPiece: any | null): void {
        if (!this.finger) return;

        // 停止之前的动画
        if (this.fingerTween) {
            this.fingerTween.stop();
            this.fingerTween = null;
        }

        if (step === 0 || step === 3) {
            // 隐藏手指指引
            this.finger.active = false;
        } else if (step === 1 || step === 2) {
            // 显示手指指引
            if (fromPiece && backPiece) {
                this.finger.active = true;
                
                // 获取拼图块的世界坐标
                const pieceWorldPos = fromPiece.node.getWorldPosition();
                const targetWorldPos = backPiece.node.getWorldPosition();
                
                // 将世界坐标转换为手指父节点的本地坐标
                const fingerParent = this.finger.parent;
                if (!fingerParent) return;
                
                const fingerParentUITransform = fingerParent.getComponent(UITransform);
                if (!fingerParentUITransform) return;
                
                const startLocalPos = fingerParentUITransform.convertToNodeSpaceAR(pieceWorldPos);
                const targetLocalPos = fingerParentUITransform.convertToNodeSpaceAR(targetWorldPos);
                
                // 设置起始位置
                this.finger.setPosition(startLocalPos);
                
                // 创建循环动画：从起始位置移动到目标位置，再返回
                this.fingerTween = tween(this.finger)
                    .to(0.8, { position: targetLocalPos }, { easing: 'sineInOut' })
                    .to(0.8, { position: startLocalPos }, { easing: 'sineInOut' })
                    .union()
                    .repeatForever()
                    .start();
            }
        }
    }
    /**
     * 自动开始游戏（游戏启动时调用）
     */
    private autoStartGame(): void {
        // 显示拼图游戏UI
        if (this.puzzleGameUI) {
            this.puzzleGameUI.active = true;
        }
        
        // 开始拼图游戏
        if (this.puzzleManager && this.puzzleImage) {
            // 直接使用设置的拼图图片开始游戏
            this.puzzleManager.startPuzzle(this.puzzleImage);
        } else if (this.puzzleManager) {
            // 如果没有设置 puzzleImage，尝试从配置加载第一关
            this.puzzleManager.startLevel(1);
        } else {
            console.error('[GameUI] PuzzleManager 未设置，无法开始游戏');
        }
    }

    /**
     * 开始拼图游戏（外部调用）
     */
    public startPuzzleGame(): void {
        this.autoStartGame();
    }
    /**
     * 拼图完成回调
     */
    private onPuzzleComplete(level: number) {
        // 显示成功弹窗
        if (this.puzzleSuccessUI && this.puzzleManager) {
            const completedImage = this.puzzleManager.getCurrentLevelImage();
            if (completedImage) {
                this.puzzleGameUI.active = false;
                this.puzzleSuccessUI.show(completedImage, 0.3, level, true);
            } else {
                console.warn('[GameUI] 无法获取完成的拼图图片');
                this.puzzleGameUI.active = false;
                this.puzzleSuccessUI.show(null, 0.3, level, true);
            }
        } else {
            console.warn('[GameUI] PuzzleSuccessUI 或 PuzzleManager 未设置');
        }
    }
    cashoutFunc(){
        PlayerAdSdk.jumpStore();
        PlayerAdSdk.gameEnd();
    }
}

