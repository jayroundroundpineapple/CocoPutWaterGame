import { _decorator, Component, Node, Sprite, SpriteFrame, UITransform, EventTouch, view, Color, Label, tween, Vec3, sys } from 'cc';
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
    private nextLevelBtn: Node = null;  
    @property(Node)
    private coinIcon: Node = null; 
    @property(Label) 
    private coinLabel: Label = null;
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
    
    // 金币相关
    private readonly MAX_COMPLETED_LEVEL_KEY = 'puzzle_max_completed_level';  // 最大已通关关卡存储键
    private readonly COIN_PER_LEVEL = 10;  // 每关获得的金币数量
    private currentCoins: number = 0;  // 当前金币数量（根据最大已通关关卡数计算）
    private maxCompletedLevel: number = 0;  // 最大已通关关卡数（如果为5，表示1-5关都已通关）

    protected onLoad() {
        this.audioManager = AudioManager.getInstance();
        if (!this.backgroundMask) {
            this.createBackgroundMask();
        } else {
            this.setupBackgroundMask(this.backgroundMask);
        }
        // 加载最大已通关关卡数
        this.loadMaxCompletedLevel();
        // 根据最大已通关关卡数计算金币
        this.calculateAndUpdateCoins();
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
     * @param level 完成的关卡编号（用于更新最大已通关关卡数和计算金币）
     * @param shouldAddCoins 是否应该加金币，默认 true（重新玩同一关时为 false）
     * @param coinsToAdd 已废弃，保留用于兼容性
     */
    public show(image: SpriteFrame, duration: number = 0.3, level: number = 1, shouldAddCoins: boolean = true, coinsToAdd: number = -1): void {
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
        AudioManager.getInstance().playtrueSound();
        
        // 处理通关逻辑
        if (shouldAddCoins) {
            // 如果当前关卡大于最大已通关关卡，更新最大已通关关卡
            if (level > this.maxCompletedLevel) {
                this.maxCompletedLevel = level;
                this.saveMaxCompletedLevel();
                // 重新计算金币总数（最大已通关关卡数 × 10）
                this.calculateAndUpdateCoins();
            }
        }
        
        Utils.showPopup(this.node, duration, 'backOut', () => {
            console.log('[PuzzleSuccessUI] 成功弹窗显示完成');
            // 弹窗显示完成后，播放金币动画
            this.playCoinAnimation();
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
        AudioManager.getInstance().playClickSound();
        Utils.setScale(this.nextLevelBtn, 0.95, 0.1, () => {
            this.hide();
            if (this.onNextLevel) {
                this.onNextLevel();
            }
        });
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

    /**
     * 根据最大已通关关卡数计算并更新金币数量
     * 金币总数 = 最大已通关关卡数 × 10
     */
    private calculateAndUpdateCoins(): void {
        this.currentCoins = this.maxCompletedLevel * this.COIN_PER_LEVEL;
        // 更新显示
        this.updateCoinDisplay();
    }

    /**
     * 更新金币显示
     */
    private updateCoinDisplay(): void {
        if (this.coinLabel) {
            this.coinLabel.string = this.currentCoins.toString();
        }
    }

    /**
     * 播放金币动画（缩放效果）
     */
    private playCoinAnimation(): void {
        if (!this.coinIcon || !this.coinLabel) {
            return;
        }

        // 先更新金币数值
        this.updateCoinDisplay();

        // 保存原始缩放值
        const originalScale = new Vec3(1, 1, 1);
        
        // 金币图标和标签同时播放缩放动画
        const scaleSequence = [
            { scale: new Vec3(1.1, 1.1, 1), duration: 0.3 },  // 放大
            { scale: new Vec3(0.9, 0.9, 1), duration: 0.2 },  // 缩小
            { scale: new Vec3(1.2, 1.2, 1), duration: 0.2 },  // 再放大
            { scale: new Vec3(1, 1, 1), duration: 0.2 }        // 恢复
        ];

        // 金币图标动画
        let iconTween = tween(this.coinIcon);
        scaleSequence.forEach((step, index) => {
            iconTween = iconTween.to(step.duration, { scale: step.scale });
        });
        iconTween.start();

        // 金币标签动画
        let labelTween = tween(this.coinLabel.node);
        scaleSequence.forEach((step, index) => {
            labelTween = labelTween.to(step.duration, { scale: step.scale });
        });
        labelTween.start();
    }

    /**
     * 获取当前金币数量
     */
    public getCoins(): number {
        return this.currentCoins;
    }

    /**
     * 设置金币数量（用于测试或特殊场景）
     * 注意：此方法会根据金币数量反推最大已通关关卡数
     * @param amount 金币数量
     */
    public setCoins(amount: number): void {
        const targetLevels = Math.floor(Math.max(0, amount) / this.COIN_PER_LEVEL);
        this.maxCompletedLevel = targetLevels;
        this.saveMaxCompletedLevel();
        // 重新计算金币
        this.calculateAndUpdateCoins();
    }

    /**
     * 加载最大已通关关卡数
     */
    private loadMaxCompletedLevel(): void {
        const saved = sys.localStorage.getItem(this.MAX_COMPLETED_LEVEL_KEY);
        if (saved) {
            try {
                this.maxCompletedLevel = parseInt(saved, 10) || 0;
            } catch (e) {
                console.error('[PuzzleSuccessUI] 加载最大已通关关卡数失败:', e);
                this.maxCompletedLevel = 0;
            }
        } else {
            this.maxCompletedLevel = 0;
        }
    }

    /**
     * 保存最大已通关关卡数
     */
    private saveMaxCompletedLevel(): void {
        try {
            sys.localStorage.setItem(this.MAX_COMPLETED_LEVEL_KEY, this.maxCompletedLevel.toString());
        } catch (e) {
            console.error('[PuzzleSuccessUI] 保存最大已通关关卡数失败:', e);
        }
    }

    /**
     * 检查关卡是否已通关
     * @param level 关卡编号
     * @returns 是否已通关（如果关卡编号 <= 最大已通关关卡数，则已通关）
     */
    public isLevelCompleted(level: number): boolean {
        return level <= this.maxCompletedLevel;
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

