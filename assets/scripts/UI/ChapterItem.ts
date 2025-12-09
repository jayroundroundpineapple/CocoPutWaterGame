import { _decorator, Component, Label, Node, Button, Sprite, SpriteFrame } from 'cc';
import { Utils } from '../utils/Utils';
import { AudioManager } from '../utils/AudioManager';
const { ccclass, property } = _decorator;

/**
 * 章节项组件
 * 用于显示单个章节的信息
 */
@ccclass('ChapterItem')
export class ChapterItem extends Component {
    @property(Node)
    private chapterBg: Node = null;  // 章节背景节点
    @property(Node)
    private passNode: Node = null;
    @property(Node)
    private unLockImage: Node = null;  
    @property(Node)
    private lockImage: Node = null;  
    @property(Label)
    private chapterLvLabel: Label = null; 
    @property(Label)
    private describeLabel: Label = null; 

    private chapter: number = 0;  // 章节编号
    private startLevel: number = 0;  
    private endLevel: number = 0; 
    private describe: string = ''; 
    private isUnlocked: boolean = false; 
    private isCompleted: boolean = false;  // 是否已完成（全部关卡通关）

    // 点击回调
    public onClick: (chapter: number) => void = null;

    protected onLoad() {
        this.node.on(Node.EventType.TOUCH_END, this.onItemClick, this);
    }

    /**
     * 初始化章节项
     * @param chapter 章节编号（从1开始）
     * @param startLevel 起始关卡（全局关卡编号）
     * @param endLevel 结束关卡（全局关卡编号）
     * @param describe 描述
     * @param isUnlocked 是否解锁
     * @param isCompleted 是否已完成（全部关卡通关），默认false
     */
    public init(chapter: number, startLevel: number, endLevel: number, describe: string, isUnlocked: boolean, isCompleted: boolean = false): void {
        this.chapter = chapter;
        this.startLevel = startLevel;
        this.endLevel = endLevel;
        this.describe = describe;
        this.isUnlocked = isUnlocked;
        this.isCompleted = isCompleted;
        this.updateUI();
    }
    public setSpriteFrame(spriteFrame: SpriteFrame): void {
        const sprite = this.chapterBg.getComponent(Sprite);
        if (sprite) {
            sprite.spriteFrame = spriteFrame;
        }
    }
    /**
     * 更新UI显示
     */
    private updateUI(): void {
        // 更新章节等级标签
        if (this.chapterLvLabel) {
            this.chapterLvLabel.string = `${this.startLevel}-${this.endLevel}`;
        }

        if (this.describeLabel) {
            this.describeLabel.string = `${this.describe}`;
        }

        this.unLockImage.active = !this.isUnlocked;
        this.lockImage.active = !this.isUnlocked;

        // 更新通关节点显示状态（只有解锁且完成时才显示）
        if (this.passNode) {
            this.passNode.active = this.isUnlocked && this.isCompleted;
        }

        // 设置按钮交互状态
        const button = this.node.getComponent(Button);
        if (button) {
            button.interactable = this.isUnlocked;
        }

        // 如果章节背景有 Sprite 组件，可以根据解锁状态调整颜色
        if (this.chapterBg) {
            const sprite = this.chapterBg.getComponent(Sprite);
            if (sprite) {
                const color = sprite.color.clone();
                if (this.isUnlocked) {
                    // 解锁状态：正常颜色
                    color.r = 255;
                    color.g = 255;
                    color.b = 255;
                } else {
                    // 锁定状态：变暗
                    color.r = 10;
                    color.g = 10;
                    color.b = 10;
                }
                sprite.color = color;
            }
        }
    }
    /**
     * 设置解锁状态
     * @param isUnlocked 是否解锁
     */
    public setUnlocked(isUnlocked: boolean): void {
        if (this.isUnlocked === isUnlocked) {
            return;
        }
        this.isUnlocked = isUnlocked;
        this.updateUI();
    }

    /**
     * 设置完成状态（章节全部通关）
     * @param isCompleted 是否已完成
     */
    public setCompleted(isCompleted: boolean): void {
        if (this.isCompleted === isCompleted) {
            return;
        }
        this.isCompleted = isCompleted;
        this.updateUI();
    }

    /**
     * 获取是否已完成
     */
    public getIsCompleted(): boolean {
        return this.isCompleted;
    }

    /**
     * 章节项点击事件
     */
    private onItemClick(): void {
        AudioManager.getInstance().playClickSound();
        Utils.setScale(this.node, 0.95, 0.1, () => {
            if (!this.isUnlocked) {
                // console.log(`[ChapterItem] 章节 ${this.chapter} 未解锁，无法进入`);
                return;
            }
            // 触发回调
            if (this.onClick) {
                this.onClick(this.chapter);
            } else {
                console.warn(`[ChapterItem] 章节 ${this.chapter} 未设置 onClick 回调`);
            }
        });
    }

    /**
     * 获取章节编号
     */
    public getChapter(): number {
        return this.chapter;
    }

    /**
     * 获取是否解锁
     */
    public getIsUnlocked(): boolean {
        return this.isUnlocked;
    }

    protected onDestroy() {
        // 清理事件监听
        this.node.off(Node.EventType.TOUCH_END, this.onItemClick, this);
    }
}

