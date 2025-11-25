import { _decorator, Component, Node, Label, Sprite, Button, EventTouch, Color } from 'cc';
import { AudioManager } from '../utils/AudioManager';
import { Utils } from '../utils/Utils';
const { ccclass, property } = _decorator;

/**
 * 卡牌组件
 * 显示关卡数字，处理点击事件
 */
@ccclass('CardItem')
export class CardItem extends Component {
    @property(Label)
    private levelLabel: Label = null;  // 关卡数字标签

    @property(Sprite)
    private cardSprite: Sprite = null; 

    private levelNumber: number = 0;

    private isUnlocked: boolean = false;

    // 是否可以玩（第一关默认可以玩，或者上一关已解锁）
    private canPlay: boolean = false;

    // 点击回调
    public onClick: (level: number) => void = null;

    /**
     * 初始化卡牌
     * @param level 关卡编号（从1开始）
     * @param isUnlocked 是否已解锁
     * @param canPlay 是否可以玩（第一关默认可以玩，或者上一关已解锁）
     */
    public init(level: number, isUnlocked: boolean, canPlay: boolean): void {
        this.levelNumber = level;
        this.isUnlocked = isUnlocked;
        this.canPlay = canPlay;

        if (this.levelLabel) {
            this.levelLabel.string = level.toString();
        }

        // 根据解锁状态设置交互
        this.updateInteractable();

        // 绑定点击事件
        this.node.on(Node.EventType.TOUCH_END, this.onCardClick, this);
    }

    /**
     * 更新解锁状态
     * @param isUnlocked 是否已解锁
     */
    public setUnlocked(isUnlocked: boolean): void {
        this.isUnlocked = isUnlocked;
        this.updateInteractable();
    }

    /**
     * 更新可玩状态
     * @param canPlay 是否可以玩
     */
    public setCanPlay(canPlay: boolean): void {
        this.canPlay = canPlay;
        this.updateInteractable();
    }

    /**
     * 更新交互状态
     */
    private updateInteractable(): void {
        const button = this.node.getComponent(Button);
        if (button) {
            button.interactable = this.canPlay;
        }

        // 通过设置节点透明度（可选）
        if (this.cardSprite) {
            const color = this.cardSprite.color.clone();
            if (this.isUnlocked) {
                color.a = 255;  // 已解锁，完全不透明
            } else if (this.canPlay) {
                color.a = 255;  // 可以玩的关卡完全不透明
            } else {
                color.a = 200;  // 不能玩的关卡稍微变暗
            }
            this.cardSprite.color = color;
        }
    }

    /**
     * 卡牌点击事件
     */
    private onCardClick(event: EventTouch): void {
        AudioManager.getInstance().playClickSound();
        Utils.setScale(this.node, 0.95, 0.1, () => {
            if (!this.canPlay) {
                console.log(`[CardItem] 关卡 ${this.levelNumber} 未解锁，无法进入`);
                return;
            }
            if (this.onClick) {
                this.onClick(this.levelNumber);
            } else {
                console.warn(`[CardItem] 关卡 ${this.levelNumber} 未设置 onClick 回调`);
            }
        });
    }

    /**
     * 获取关卡编号
     */
    public getLevel(): number {
        return this.levelNumber;
    }

    /**
     * 获取解锁状态
     */
    public getIsUnlocked(): boolean {
        return this.isUnlocked;
    }

    protected onDestroy(): void {
        // 清理事件监听
        this.node.off(Node.EventType.TOUCH_END, this.onCardClick, this);
    }
}

