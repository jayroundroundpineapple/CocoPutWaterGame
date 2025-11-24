import { _decorator, Button, Component, Node, SpriteFrame, AudioSource } from 'cc';
import { AdManager } from './adManager';
import { AdType } from './ad-enums';
import { PuzzleManager } from './PuzzleManager';
import { SettingUI } from '../UI/SettingUI';
import { LevelUnlockUI } from '../UI/LevelUnlockUI';
import { AudioManager } from '../utils/AudioManager';
const { ccclass, property } = _decorator;

@ccclass('GameUI')
export class GameUI extends Component {
    @property(Node)
    private initButton: Node = null;
    @property(Node)
    private showrewardBtn: Node = null;
    @property(Node)
    private settingBtn: Node = null;
    @property(SettingUI)
    private settingUI: SettingUI = null; 
    @property(PuzzleManager)
    private puzzleManager: PuzzleManager = null;  //拼图管理器
    @property(LevelUnlockUI)
    private levelUnlockUI: LevelUnlockUI = null;  // 关卡解锁UI
    @property(Node)
    private puzzleGameUI: Node = null;  // 拼图游戏UI
    @property(Node)
    private exitGameBtn: Node = null;  
    @property(SpriteFrame)
    private puzzleImage: SpriteFrame = null;  // 拼图图片
    
    
    
    private bgmNode:Node = null; // 背景音乐节点
    private sfxNode:Node = null; // 音效节点
    private audioManager: AudioManager = null;
    
    start() {
        this.puzzleGameUI.active = false;
        this.initButton.on(Node.EventType.TOUCH_END, this.onInitButtonClick, this);
        this.showrewardBtn.on(Node.EventType.TOUCH_END, this.onShowRewardButtonClick, this);
        this.initPuzzle();
        this.initSettingUI();
        this.initLevelUnlockUI();
        this.initExitButton();
        this.initAudio();
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
        
        console.log('[GameUI] 音频系统初始化完成，背景音乐已开始播放');
    }
    
    /**
     * 初始化设置界面
     */
    private initSettingUI() {
        if (this.settingUI) {
            // 设置关闭回调
            this.settingUI.onClose = () => {
                console.log('[GameUI] 设置界面已关闭');
                this.restoreSettingButton();
            };
        }
    }

    /**
     * 初始化关卡解锁UI
     */
    private initLevelUnlockUI() {
        if (this.levelUnlockUI) {
            // 初始化关卡解锁UI（50关，使用 10x5 网格布局）
            this.levelUnlockUI.init(25, 5, 5);
            // 设置开始游戏回调
            this.levelUnlockUI.onStartGame = () => {
                this.startPuzzleGame();
            };
            
            // 设置进入关卡回调（点击卡牌时触发）
            this.levelUnlockUI.onEnterLevel = (level: number) => {
                this.enterLevel(level);
            };
        }
    }

    /**
     * 进入指定关卡
     */
    private enterLevel(level: number): void {
        console.log(`[GameUI] 进入关卡 ${level}`);
        
        // 隐藏关卡解锁UI
        if (this.levelUnlockUI && this.levelUnlockUI.node) {
            this.levelUnlockUI.node.active = false;
        }
        
        // 显示拼图游戏UI
        if (this.puzzleGameUI) {
            this.puzzleGameUI.active = true;
        }
        
        // 开始指定关卡的拼图
        if (this.puzzleManager) {
            this.puzzleManager.startLevel(level);
        } else {
            console.error('[GameUI] PuzzleManager 未设置');
        }
    }

    /**
     * 初始化退出按钮
     */
    private initExitButton() {
        if (this.exitGameBtn) {
            this.exitGameBtn.on(Node.EventType.TOUCH_END, this.onExitGameBtnClick, this);
        } else {
            console.warn('[GameUI] 未设置退出游戏按钮');
        }
    }
    
    /**
     * 恢复设置按钮状态
     */
    private restoreSettingButton(): void {
        if (this.settingBtn) {
            const button = this.settingBtn.getComponent(Button);
            if (button) {
                button.interactable = true;
            }
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
            // this.puzzleManager.startPuzzle(spriteFrame);
        } else {
            console.error('无法获取拼图图片！请设置 puzzleImage');
        }
    }
    public openSetting(): void {
        if (this.settingUI) {
            // 播放点击音效
            if (this.audioManager) {
                this.audioManager.playClickSound();
            }
            
            this.settingUI.show();
            // 禁用设置按钮，防止重复打开
            if (this.settingBtn) {
                const button = this.settingBtn.getComponent(Button);
                if (button) {
                    button.interactable = false;
                }
            }
        } else {
            console.error('[GameUI] 设置界面未设置');
        }
    }
    
    public closeSetting(): void {
        if (this.settingUI) {
            this.settingUI.hide();
        }
    }
    public toggleSetting(): void {
        if (this.settingUI) {
            this.settingUI.toggle();
        }
    }
    
    /**
     * 开始拼图游戏
     */
    public startPuzzleGame(): void {
        console.log('[GameUI] 开始拼图游戏');
        
        // 隐藏关卡解锁UI
        if (this.levelUnlockUI && this.levelUnlockUI.node) {
            this.levelUnlockUI.node.active = false;
        }
        
        // 显示拼图游戏UI
        if (this.puzzleGameUI) {
            this.puzzleGameUI.active = true;
        }
        
        // 开始第一关拼图
        if (this.puzzleManager && this.puzzleImage) {
            // 这里可以加载第一关的图片
            // 或者让 PuzzleManager 自己从配置加载
            console.log('[GameUI] 准备开始拼图游戏');
        }
    }

    /**
     * 退出游戏按钮点击事件
     */
    private onExitGameBtnClick(): void {
        console.log('[GameUI] 点击退出游戏按钮');
        // 播放点击音效
        if (this.audioManager) {
            this.audioManager.playClickSound();
        }
        this.backToLevelUnlock();
    }

    /**
     * 返回关卡解锁界面
     */
    public backToLevelUnlock(): void {
        console.log('[GameUI] 返回关卡解锁界面');
        
        // 隐藏拼图游戏UI
        if (this.puzzleGameUI) {
            this.puzzleGameUI.active = false;
        }
        
        // 显示关卡解锁UI
        if (this.levelUnlockUI && this.levelUnlockUI.node) {
            this.levelUnlockUI.node.active = true;
        }
    }

    /**
     * 拼图完成回调
     */
    private onPuzzleComplete(level: number) {
        console.log(`恭喜！完成第 ${level} 关拼图！`);
        
        // 解锁对应关卡
        if (this.levelUnlockUI) {
            this.levelUnlockUI.unlockLevel(level, true);
        }
        // 可以选择返回关卡解锁界面，或者继续下一关
        // this.backToLevelUnlock();
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

    protected onDestroy() {
        // 清理事件监听
        if (this.exitGameBtn) {
            this.exitGameBtn.off(Node.EventType.TOUCH_END, this.onExitGameBtnClick, this);
        }
        if (this.initButton) {
            this.initButton.off(Node.EventType.TOUCH_END, this.onInitButtonClick, this);
        }
        if (this.showrewardBtn) {
            this.showrewardBtn.off(Node.EventType.TOUCH_END, this.onShowRewardButtonClick, this);
        }
    }
}

