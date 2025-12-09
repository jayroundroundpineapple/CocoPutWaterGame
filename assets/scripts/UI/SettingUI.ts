import { _decorator, Component, Node, director, UITransform, Color, Sprite, SpriteFrame, view, EventTouch, Button, utils, Label, RichText } from 'cc';
import { Utils } from '../utils/Utils';
import { AudioManager } from '../utils/AudioManager';
import { Macro } from '../game/Macro';
const { ccclass, property } = _decorator;

/**
 * 设置界面组件
 * 管理设置界面的显示和隐藏
 */
@ccclass('SettingUI')
export class SettingUI extends Component {
    @property(Node)
    private reloadBtn: Node = null;
    @property(Node)
    private PolicyBtn: Node = null;
    @property(Node)
    private PolicyPanel: Node = null;
    @property(Label)
    private policyLabel: Label = null;
    @property(RichText)
    private policyRichlb: RichText = null;
    @property(Node)
    private homeBtn: Node = null;
    @property(Node)
    private closeBtn: Node = null;
    @property(Node)
    private soundBtn: Node = null;
    @property(Node)
    private bgmBtn: Node = null;
    @property(SpriteFrame)
    private soundOnSprite: SpriteFrame = null;
    @property(SpriteFrame)
    private soundOffSprite: SpriteFrame = null;
    @property(SpriteFrame)
    private musicOnSprite: SpriteFrame = null;
    @property(SpriteFrame)
    private musicOffSprite: SpriteFrame = null;
    @property(Node)
    private backgroundMask: Node = null;  // 背景遮罩层

    private isShowing: boolean = false;
    private audioManager: AudioManager = null;
    // 关闭回调
    public onClose: () => void = null;
    public clickBackgroundToClose: boolean = true;

    // 返回首页回调
    public onHome: () => void = null;

    // 重置关卡回调（仅在游戏中有效）
    public onReloadLevel: () => void = null;

    private isInGame: boolean = false;
    private isPolicyTextLoaded: boolean = false; // 标记文本是否已加载

    protected onLoad() {
        this.audioManager = AudioManager.getInstance();
        if (!this.backgroundMask) {
            this.createBackgroundMask();
        } else {
            // 如果已经设置了背景遮罩，确保它能够拦截触摸事件
            this.setupBackgroundMask(this.backgroundMask);
        }
    }

    protected start() {
        this.PolicyPanel.active = false;
        // 不在 start 中设置文本，延迟到面板打开时再加载，提升性能
        // this.policyRichlb.string = Macro.policyTxt;
        this.policyLabel.overflow = Label.Overflow.RESIZE_HEIGHT;
        this.policyLabel.string = Macro.policyTxt;
        if (this.closeBtn) {
            this.closeBtn.on(Node.EventType.TOUCH_END, this.onCloseBtnClick, this);
        } else {
            console.warn('[SettingUI] 未设置关闭按钮');
        }
        if (this.PolicyBtn) {
            this.PolicyBtn.on(Node.EventType.TOUCH_END, this.onPolicyBtnClick, this);
        } else {
            console.warn('[SettingUI] 未设置隐私政策按钮');
        }
        if (this.homeBtn) {
            this.homeBtn.on(Node.EventType.TOUCH_END, this.onHomeBtnClick, this);
        } else {
            console.warn('[SettingUI] 未设置首页按钮');
        }
        if (this.soundBtn) {
            this.soundBtn.on(Node.EventType.TOUCH_END, this.onSoundBtnClick, this);
        }
        if (this.bgmBtn) {
            this.bgmBtn.on(Node.EventType.TOUCH_END, this.onbgmBtnClick, this);
        }
        if (this.reloadBtn) {
            this.reloadBtn.on(Node.EventType.TOUCH_END, this.onReloadBtnClick, this);
        }
        this.updateButtonStates();
    }
    onPolicyBtnClick(){
        this.audioManager.playClickSound();
        Utils.setScale(this.PolicyBtn, 0.95, 0.1, () => {
            // 显示面板动画
            Utils.showPopup(this.PolicyPanel, 0.3, 'backOut', () => {
                console.log('PolicyPanel打开');
                // 文本已经在设置面板打开时预加载了，这里不需要再加载
            });
        });
        
    }

    /**
     * 异步加载隐私政策文本
     * 在设置面板打开时预加载，这样点击隐私按钮时可以立即显示
     */
    private loadPolicyTextAsync(): void {
        if (!this.policyRichlb) {
            return;
        }

        // 如果文本已经加载过，直接返回
        if (this.isPolicyTextLoaded) {
            return;
        }

        // 延迟加载文本，避免阻塞设置面板的打开动画
        this.scheduleOnce(() => {
            if (this.policyRichlb && Macro.policyTxt) {
                this.policyRichlb.string = Macro.policyTxt;
                this.isPolicyTextLoaded = true;
                console.log('[SettingUI] 隐私政策文本预加载完成');
            }
        }, 0.1); // 延迟 0.1 秒，确保设置面板动画已经开始
    }
    closePolicyPanel(){
        this.audioManager.playClickSound();
        Utils.setScale(this.PolicyBtn, 0.95, 0.1, () => {
            Utils.hidePopup(this.PolicyPanel, 0.3, 'linear', () => {
                this.PolicyPanel.active = false;
            });
        });
    }
    /**
     * 更新按钮状态（根据音频管理器）
     */
    private updateButtonStates(): void {
        if (!this.audioManager) {
            return;
        }
        if (this.soundBtn) {
            const sprite = this.soundBtn.children[0].getComponent(Sprite);
            if (sprite) {
                sprite.spriteFrame = this.audioManager.isSoundEnabled()
                    ? this.soundOnSprite
                    : this.soundOffSprite;
            }
        }
        if (this.bgmBtn) {
            const sprite = this.bgmBtn.children[0].getComponent(Sprite);
            if (sprite) {
                sprite.spriteFrame = this.audioManager.isMusicEnabled()
                    ? this.musicOnSprite
                    : this.musicOffSprite;
            }
        }
    }

    /**
     * 音效按钮点击事件
     */
    private onSoundBtnClick(): void {
        if (!this.audioManager) {
            return;
        }
        this.audioManager.playClickSound();
        const newState = !this.audioManager.isSoundEnabled();
        this.audioManager.setSoundEnabled(newState);
        if (this.soundBtn) {
            const sprite = this.soundBtn.children[0].getComponent(Sprite);
            if (sprite) {
                sprite.spriteFrame = newState ? this.soundOnSprite : this.soundOffSprite;
            }
        }
    }

    /**
     * 音乐按钮点击事件
     */
    private onbgmBtnClick(): void {
        if (!this.audioManager) {
            return;
        }
        // 播放点击音效
        this.audioManager.playClickSound();
        // 切换音乐开关
        const newState = !this.audioManager.isMusicEnabled();
        this.audioManager.setMusicEnabled(newState);
        // 更新按钮图标
        if (this.bgmBtn) {
            const sprite = this.bgmBtn.children[0].getComponent(Sprite);
            if (sprite) {
                sprite.spriteFrame = newState ? this.musicOnSprite : this.musicOffSprite;
            }
        }
    }

    /**
     * 重置关卡按钮点击事件
     */
    private onReloadBtnClick(): void {
        // 如果不在游戏中，不响应点击
        if (!this.isInGame) {
            console.log('[SettingUI] 不在游戏中，重置按钮无效');
            return;
        }
        Utils.setScale(this.reloadBtn, 0.95, 0.1, () => {
            // 触发重置关卡回调
            if (this.onReloadLevel) {
                this.onReloadLevel();
            } else {
                console.warn('[SettingUI] 未设置 onReloadLevel 回调');
            }
        })
        this.audioManager.playClickSound();
    }
    /**
     * 创建背景遮罩层
     */
    private createBackgroundMask(): void {
        // 创建背景遮罩节点
        const maskNode = new Node('BackgroundMask');
        maskNode.parent = this.node;
        // 设置为第一个子节点（在最底层）
        maskNode.setSiblingIndex(0);
        const uiTransform = maskNode.addComponent(UITransform);
        const visibleSize = view.getVisibleSize();
        uiTransform.width = visibleSize.width;
        uiTransform.height = visibleSize.height;

        // 设置位置为屏幕中心
        maskNode.setPosition(0, 0, 0);
        // 添加 Sprite 组件用于显示半透明背景
        const sprite = maskNode.addComponent(Sprite);
        // 如果没有设置 SpriteFrame，可以创建一个纯色背景
        // 这里我们只使用 UITransform 来拦截触摸事件

        // 设置背景遮罩属性
        this.setupBackgroundMask(maskNode);
        this.backgroundMask = maskNode;
    }

    /**
     * 设置背景遮罩层属性
     */
    private setupBackgroundMask(maskNode: Node): void {
        // 添加触摸事件监听，拦截所有触摸事件
        maskNode.on(Node.EventType.TOUCH_START, this.onBackgroundTouch, this);
        maskNode.on(Node.EventType.TOUCH_END, this.onBackgroundTouch, this);
        // 确保节点在最底层
        if (maskNode.parent) {
            maskNode.setSiblingIndex(0);
        }
    }

    /**
     * 背景遮罩触摸事件
     */
    private onBackgroundTouch(event: EventTouch): void {
        event.propagationStopped = true;
    }


    /**
     * 显示设置界面
     * @param duration 动画时长（秒），默认 0.3
     * @param isInGame 是否在游戏中（用于控制 reloadBtn 的显示/隐藏）
     */
    public show(duration: number = 0.3, isInGame: boolean = false): void {
        if (this.isShowing) {
            console.warn('SettingUI已经显示了');
            return;
        }
        
        this.isShowing = true;
        this.isInGame = isInGame;
        this.PolicyBtn.active = !isInGame;
        this.reloadBtn.active = isInGame;
        // 更新按钮状态（包括 reloadBtn）
        this.updateButtonStates();

        Utils.showPopup(this.node, duration, 'backOut', () => {
            console.log('SettingUI打开');
            // 设置面板打开后，异步预加载隐私政策文本
            // 这样当用户点击隐私按钮时，文本已经加载好了，可以立即显示
            // if (!isInGame && this.PolicyBtn.active) {
            //     this.loadPolicyTextAsync();
            // }
        });
    }

    /**
     * 隐藏设置界面
     * @param duration 动画时长（秒），默认 0.3
     */
    public hide(duration: number = 0.15): void {
        if (!this.isShowing) {
            console.warn('[SettingUI] 设置界面已经隐藏');
            return;
        }
        this.isShowing = false;
        Utils.hidePopup(this.node, duration, 'linear', () => {
            console.log('[SettingUI] 设置界面隐藏完成');
            // 通知外部设置界面已关闭
            if (this.onClose) {
                this.onClose();
            }
        });
    }

    /**
     * 切换显示/隐藏
     * @param duration 动画时长（秒），默认 0.3
     */
    public toggle(duration: number = 0.2): void {
        if (this.isShowing) {
            this.hide(duration);
        } else {
            this.show(duration);
        }
    }

    /**
     * 关闭按钮点击事件
     */
    private onCloseBtnClick(): void {
        this.audioManager.playClickSound();
        Utils.setScale(this.closeBtn, 0.95, 0.1, () => {
            this.hide();
        });
    }

    /**
     * 首页按钮点击事件
     */
    private onHomeBtnClick(): void {
        console.log('[SettingUI] 点击首页按钮');
        // 播放点击音效
        if (this.audioManager) {
            this.audioManager.playClickSound();
        }
        Utils.setScale(this.homeBtn, 0.95, 0.1, () => {
            this.hide();
            if (this.onHome) {
                this.onHome();
            } else {
                console.warn('[SettingUI] 未设置返回首页回调');
            }
        });
    }

    /**
     * 获取是否正在显示
     */
    public getIsShowing(): boolean {
        return this.isShowing;
    }

    protected onDestroy() {
        // 清理事件监听
        if (this.closeBtn) {
            this.closeBtn.off(Node.EventType.TOUCH_END, this.onCloseBtnClick, this);
        }
        if (this.homeBtn) {
            this.homeBtn.off(Node.EventType.TOUCH_END, this.onHomeBtnClick, this);
        }
        if (this.soundBtn) {
            this.soundBtn.off(Node.EventType.TOUCH_END, this.onSoundBtnClick, this);
        }
        if (this.bgmBtn) {
            this.bgmBtn.off(Node.EventType.TOUCH_END, this.onbgmBtnClick, this);
        }
        if (this.reloadBtn) {
            this.reloadBtn.off(Node.EventType.TOUCH_END, this.onReloadBtnClick, this);
        }
        if (this.backgroundMask) {
            this.backgroundMask.off(Node.EventType.TOUCH_START, this.onBackgroundTouch, this);
            this.backgroundMask.off(Node.EventType.TOUCH_END, this.onBackgroundTouch, this);
        }
    }
}

