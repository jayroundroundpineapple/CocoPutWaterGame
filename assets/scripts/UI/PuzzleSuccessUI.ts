import { _decorator, Component, Node, Sprite, SpriteFrame, UITransform, EventTouch, view, Color } from 'cc';
import { Utils } from '../utils/Utils';
import { AudioManager } from '../utils/AudioManager';
const { ccclass, property } = _decorator;

/**
 * 拼图成功弹窗组件
 * 显示拼图完成后的成功界面
 */
@ccclass('PuzzleSuccessUI')
export class PuzzleSuccessUI extends Component {
    @property(Node)
    private nextLevelBtn: Node = null;  // 下一关按钮
    
    @property(Node)
    private backgroundMask: Node = null;  // 背景遮罩层
    
    @property(Sprite)
    private successImage: Sprite = null;  // 显示完成的拼图图片
    
    private isShowing: boolean = false;
    private audioManager: AudioManager = null;
    
    // 下一关回调
    public onNextLevel: () => void = null;
    
    // 当前显示的图片
    private currentImage: SpriteFrame = null;

    protected onLoad() {
        this.audioManager = AudioManager.getInstance();
        if (!this.backgroundMask) {
            this.createBackgroundMask();
        } else {
            this.setupBackgroundMask(this.backgroundMask);
        }
    }
    
    protected start() {
        if (this.nextLevelBtn) {
            this.nextLevelBtn.on(Node.EventType.TOUCH_END, this.onNextLevelBtnClick, this);
        } else {
            console.warn('[PuzzleSuccessUI] 未设置下一关按钮');
        }
    }
    
    /**
     * 显示成功弹窗
     * @param image 完成的拼图图片
     * @param duration 动画时长（秒），默认 0.3
     */
    public show(image: SpriteFrame, duration: number = 0.3): void {
        if (this.isShowing) {
            console.warn('[PuzzleSuccessUI] 成功弹窗已经显示');
            return;
        }
        
        // 设置图片
        if (image && this.successImage) {
            this.currentImage = image;
            this.successImage.spriteFrame = image;
        }
        
        this.isShowing = true;
        Utils.showPopup(this.node, duration, 'backOut', () => {
            console.log('[PuzzleSuccessUI] 成功弹窗显示完成');
        });
    }

    /**
     * 隐藏成功弹窗
     * @param duration 动画时长（秒），默认 0.3
     */
    public hide(duration: number = 0.3): void {
        if (!this.isShowing) {
            console.warn('[PuzzleSuccessUI] 成功弹窗已经隐藏');
            return;
        }
        this.isShowing = false;
        Utils.hidePopup(this.node, duration, 'quadIn', () => {
            console.log('[PuzzleSuccessUI] 成功弹窗隐藏完成');
        });
    }

    /**
     * 下一关按钮点击事件
     */
    private onNextLevelBtnClick(): void {
        console.log('[PuzzleSuccessUI] 点击下一关按钮');
        // 播放点击音效
        if (this.audioManager) {
            this.audioManager.playClickSound();
        }
        // 先隐藏弹窗
        this.hide();
        // 触发下一关回调
        if (this.onNextLevel) {
            this.onNextLevel();
        } else {
            console.warn('[PuzzleSuccessUI] 未设置 onNextLevel 回调');
        }
    }

    /**
     * 创建背景遮罩层
     */
    private createBackgroundMask(): void {
        const mask = new Node('BackgroundMask');
        mask.parent = this.node;
        mask.setSiblingIndex(0);  // 放在最底层
        
        const transform = mask.addComponent(UITransform);
        const viewSize = view.getVisibleSize();
        transform.setContentSize(viewSize.width, viewSize.height);
        mask.setPosition(0, 0, 0);
        
        const sprite = mask.addComponent(Sprite);
        sprite.color = new Color(0, 0, 0, 180);  // 半透明黑色
        
        this.backgroundMask = mask;
        this.setupBackgroundMask(mask);
    }

    /**
     * 设置背景遮罩层
     */
    private setupBackgroundMask(mask: Node): void {
        if (!mask) return;
        
        // 拦截触摸事件，防止点击穿透
        mask.on(Node.EventType.TOUCH_START, (event: EventTouch) => {
            event.propagationStopped = true;
        }, this);
    }

    protected onDestroy() {
        // 清理事件监听
        if (this.nextLevelBtn) {
            this.nextLevelBtn.off(Node.EventType.TOUCH_END, this.onNextLevelBtnClick, this);
        }
        if (this.backgroundMask) {
            this.backgroundMask.off(Node.EventType.TOUCH_START, this.setupBackgroundMask, this);
        }
    }
}

