import { _decorator, Component, Label, Node, Button, Sprite, SpriteFrame } from 'cc';
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
    private unLockImage: Node = null;  // 解锁状态图片
    
    @property(Node)
    private lockImage: Node = null;  // 锁定状态图片
    
    @property(Label)
    private chapterLvLabel: Label = null;  // 章节等级标签（如：第一章、第二章）
    
    @property(Label)
    private describeLabel: Label = null;  // 描述标签（如：关卡 1-25）

    // 章节信息
    private chapter: number = 0;  // 章节编号
    private startLevel: number = 0;  // 起始关卡
    private endLevel: number = 0;  // 结束关卡
    private describe: string = '';  // 描述
    private isUnlocked: boolean = false;  // 是否解锁

    // 点击回调
    public onClick: (chapter: number) => void = null;

    protected onLoad() {
        // 绑定点击事件
        this.node.on(Node.EventType.TOUCH_END, this.onItemClick, this);
    }

    /**
     * 初始化章节项
     * @param chapter 章节编号（从1开始）
     * @param startLevel 起始关卡（全局关卡编号）
     * @param endLevel 结束关卡（全局关卡编号）
     * @param describe 描述
     * @param isUnlocked 是否解锁
     */
    public init(chapter: number, startLevel: number, endLevel: number,describe:string, isUnlocked: boolean): void {
        this.chapter = chapter;
        this.startLevel = startLevel;
        this.endLevel = endLevel;
        this.describe = describe;
        this.isUnlocked = isUnlocked;
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

        this.unLockImage.active = false;
        this.lockImage.active = !this.isUnlocked;

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
                    color.r = 100;
                    color.g = 100;
                    color.b = 100;
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
     * 章节项点击事件
     */
    private onItemClick(): void {
        if (!this.isUnlocked) {
            console.log(`[ChapterItem] 章节 ${this.chapter} 未解锁，无法进入`);
            return;
        }

        console.log(`[ChapterItem] 点击章节 ${this.chapter}，进入关卡 ${this.startLevel}-${this.endLevel}`);

        // 触发回调
        if (this.onClick) {
            this.onClick(this.chapter);
        } else {
            console.warn(`[ChapterItem] 章节 ${this.chapter} 未设置 onClick 回调`);
        }
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

