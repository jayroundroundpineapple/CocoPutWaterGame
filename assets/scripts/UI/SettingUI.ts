import { _decorator, Component, Node, director, UITransform, Color, Sprite, SpriteFrame, view, EventTouch } from 'cc';
import { Utils } from '../utils/Utils';
const { ccclass, property } = _decorator;

/**
 * 设置界面组件
 * 管理设置界面的显示和隐藏
 */
@ccclass('SettingUI')
export class SettingUI extends Component {
    @property(Node)
    private closeBtn: Node = null;  // 关闭按钮
    @property(Node)
    private soundBtn: Node = null;  // 声音按钮
    @property(Node)
    private musicBtn: Node = null;  // 音乐按钮
    @property(SpriteFrame)
    private soundOnSprite: SpriteFrame = null;  // 声音开启图片
    @property(SpriteFrame)
    private soundOffSprite: SpriteFrame = null;  // 声音关闭图片
    @property(SpriteFrame)
    private musicOnSprite: SpriteFrame = null;  // 音乐开启图片
    @property(SpriteFrame)
    private musicOffSprite: SpriteFrame = null;  // 音乐关闭图片
    @property(Node)
    private backgroundMask: Node = null;  // 背景遮罩层（可选，如果未设置会自动创建）

    private isShowing: boolean = false;
    private soundOn:boolean = true;
    private musicOn:boolean = true;
    // 关闭回调
    public onClose: () => void = null;

    // 是否点击背景关闭
    public clickBackgroundToClose: boolean = true;

    protected onLoad() {
        // 初始状态：隐藏
        this.node.active = false;
        
        // 如果没有设置背景遮罩，自动创建一个
        if (!this.backgroundMask) {
            this.createBackgroundMask();
        } else {
            // 如果已经设置了背景遮罩，确保它能够拦截触摸事件
            this.setupBackgroundMask(this.backgroundMask);
        }
    }
    Start() {
        this.soundBtn.on(Node.EventType.TOUCH_END, this.onSoundBtnClick, this);
        this.musicBtn.on(Node.EventType.TOUCH_END, this.onMusicBtnClick, this);
    }
    onSoundBtnClick(){
        this.soundOn = !this.soundOn;
        if(this.soundOn){
            this.soundBtn.getComponent(Sprite).spriteFrame = this.soundOnSprite;
        }else{
            this.soundBtn.getComponent(Sprite).spriteFrame = this.soundOffSprite;
        }
    }
    onMusicBtnClick(){
        this.musicOn = !this.musicOn;
        if(this.musicOn){
            this.musicBtn.getComponent(Sprite).spriteFrame = this.musicOnSprite;
        }else{
            this.musicBtn.getComponent(Sprite).spriteFrame = this.musicOffSprite;
        }
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
        
        // 添加 UITransform 组件，设置为全屏
        const uiTransform = maskNode.addComponent(UITransform);
        const visibleSize = view.getVisibleSize();
        uiTransform.width = visibleSize.width;
        uiTransform.height = visibleSize.height;
        
        // 设置位置为屏幕中心
        maskNode.setPosition(0, 0, 0);
        
        // 添加 Sprite 组件用于显示半透明背景（可选）
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

    protected start() {
        // 绑定关闭按钮事件
        if (this.closeBtn) {
            this.closeBtn.on(Node.EventType.TOUCH_END, this.onCloseBtnClick, this);
        } else {
            console.warn('[SettingUI] 未设置关闭按钮');
        }
    }

    /**
     * 显示设置界面
     * @param duration 动画时长（秒），默认 0.3
     */
    public show(duration: number = 0.3): void {
        if (this.isShowing) {
            console.warn('SettingUI已经显示了');
            return;
        }
        this.isShowing = true;
        Utils.showPopup(this.node, duration, 'backOut', () => {
            console.log('SettingUI打开');
        });
    }

    /**
     * 隐藏设置界面
     * @param duration 动画时长（秒），默认 0.3
     */
    public hide(duration: number = 0.3): void {
        if (!this.isShowing) {
            console.warn('[SettingUI] 设置界面已经隐藏');
            return;
        }
        this.isShowing = false;
        Utils.hidePopup(this.node, duration, 'backIn', () => {
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
    public toggle(duration: number = 0.3): void {
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
        this.hide();
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
        if(this.soundBtn){
            this.soundBtn.off(Node.EventType.TOUCH_END, this.onSoundBtnClick, this);
        }
        if(this.musicBtn){
            this.musicBtn.off(Node.EventType.TOUCH_END, this.onMusicBtnClick, this);
        }
        if (this.backgroundMask) {
            this.backgroundMask.off(Node.EventType.TOUCH_START, this.onBackgroundTouch, this);
            this.backgroundMask.off(Node.EventType.TOUCH_END, this.onBackgroundTouch, this);
        }
    }
}

