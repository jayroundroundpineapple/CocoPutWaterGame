import { _decorator, Component, Node, Sprite, SpriteFrame, UITransform, Button, sys, tween, Vec3, Prefab, instantiate } from 'cc';
import { ChapterItem } from './ChapterItem';
const { ccclass, property } = _decorator;

/**
 * 章节配置接口
 */
interface ChapterConfig {
    chapter: number;  // 章节编号（从1开始）
    startLevel: number;  // 起始关卡
    endLevel: number;  // 结束关卡
    chapterPassPic: SpriteFrame;  // 章节解锁背景图(大图进行分割)
    unlockImage: SpriteFrame;  //item背景图
    describe:string
}

/**
 * 章节选择UI组件
 * 显示所有章节，点击进入对应章节的关卡解锁界面
 */
@ccclass('ChapterUI')
export class ChapterUI extends Component {
    @property(Node)
    private container: Node = null;  // 容器节点

    @property(Prefab)
    private chapterItemPrefab: Prefab = null; 
    
    @property(SpriteFrame)
    private chapter1Image: SpriteFrame = null;  // 第一章背景图
    @property(SpriteFrame)
    private chapterPassPic1: SpriteFrame = null;  // 第一章解锁大图
    
    @property(SpriteFrame)
    private chapter2Image: SpriteFrame = null;  // 第二章背景图
    @property(SpriteFrame)
    private chapterPassPic2: SpriteFrame = null;  // 第二章解锁大图

    // 章节配置
    private chapters: ChapterConfig[] = [];
    
    // 章节解锁状态
    private chapterUnlockStates: boolean[] = [];
    
    // 存储键名
    private readonly STORAGE_KEY = 'puzzle_chapter_unlock_states';
    
    // 章节项节点数组
    private chapterNodes: Node[] = [];
    
    // 进入章节回调
    public onEnterChapter: (chapter: number, startLevel: number, endLevel: number) => void = null;

    protected onLoad() {
        this.node.active = true;
    }

    protected start() {
        this.initChapters();
        this.loadChapterUnlockStates();
        this.createChapterUI();
    }

    /**
     * 初始化章节配置
     */
    private initChapters(): void {
        this.chapters = [
            {
                chapter: 1,
                startLevel: 1,
                endLevel: 25,
                chapterPassPic: this.chapterPassPic1,
                unlockImage: this.chapter1Image,
                describe: 'Landmarks'
            },
            {
                chapter: 2,
                startLevel: 26,
                endLevel: 50,
                chapterPassPic: this.chapterPassPic2,
                unlockImage: this.chapter2Image,
                describe: 'Cute Pets'
            }
        ];
    }

    /**
     * 加载章节解锁状态
     */
    private loadChapterUnlockStates(): void {
        const saved = sys.localStorage.getItem(this.STORAGE_KEY);
        if (saved) {
            try {
                this.chapterUnlockStates = JSON.parse(saved);
                if (this.chapterUnlockStates.length !== this.chapters.length) {
                    this.chapterUnlockStates = new Array(this.chapters.length).fill(false);
                    // 第一章默认解锁
                    this.chapterUnlockStates[0] = true;
                }
            } catch (e) {
                console.error('[ChapterUI] 加载章节解锁状态失败:', e);
                this.chapterUnlockStates = new Array(this.chapters.length).fill(false);
                this.chapterUnlockStates[0] = true;  // 第一章默认解锁
            }
        } else {
            // 初始状态：第一章解锁，其他章节未解锁
            this.chapterUnlockStates = new Array(this.chapters.length).fill(false);
            this.chapterUnlockStates[0] = true;  // 第一章默认解锁
        }
    }

    /**
     * 保存章节解锁状态
     */
    private saveChapterUnlockStates(): void {
        try {
            sys.localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.chapterUnlockStates));
        } catch (e) {
            console.error('[ChapterUI] 保存章节解锁状态失败:', e);
        }
    }

    /**
     * 创建章节UI
     */
    private createChapterUI(): void {
        if (!this.container) {
            console.error('[ChapterUI] 容器未设置');
            return;
        }

        // 清空容器
        // this.container.removeAllChildren();
        this.chapterNodes = [];

        const containerTransform = this.container.getComponent(UITransform);
        if (!containerTransform) {
            console.error('[ChapterUI] 容器缺少 UITransform 组件');
            return;
        }

        const containerWidth = containerTransform.width;
        const containerHeight = containerTransform.height;

        // 计算每个章节项的尺寸（假设横向排列）
        const chapterWidth = containerWidth / this.chapters.length;
        const chapterHeight = containerHeight;

        // 创建章节项
        for (let i = 0; i < this.chapters.length; i++) {
            const chapterConfig = this.chapters[i];
            const chapterNode = this.createChapterItem(
                chapterConfig,
                i,
                chapterWidth,
                chapterHeight
            );
            this.chapterNodes.push(chapterNode);
        }
    }

    /**
     * 创建章节项
     */
    private createChapterItem(
        config: ChapterConfig,
        index: number,
        width: number,
        height: number
    ): Node {
        if (!this.chapterItemPrefab) {
            console.error('[ChapterUI] 章节项预制体未设置');
            return null;
        }

        const chapterNode = instantiate(this.chapterItemPrefab);
        chapterNode.name = `chapter_${config.chapter}`;
        chapterNode.parent = this.container;

        // 设置大小和位置
        const uiTransform = chapterNode.getComponent(UITransform) || chapterNode.addComponent(UITransform);
        let xArr = [-180,180]
        // const x = (index + 0.5) * width - this.container.getComponent(UITransform).width / 2;
        const x = xArr[index];
        const y =  -uiTransform.width / 2;
        chapterNode.setPosition(x, y, 0);
        const chapterItem = chapterNode.getComponent(ChapterItem);
        if (chapterItem) {
            const isUnlocked = this.chapterUnlockStates[index];
            const isCompleted = this.isChapterCompleted(config.chapter);
            chapterItem.setSpriteFrame(config.unlockImage);
            chapterItem.init(config.chapter, config.startLevel, config.endLevel, config.describe, isUnlocked, isCompleted);
            // 设置点击回调
            chapterItem.onClick = (chapter: number) => {
                this.onChapterClick(chapter, index);
            };
        } 
        return chapterNode;
    }

    /**
     * 章节点击事件
     */
    private onChapterClick(chapter: number, index: number): void {
        if (!this.chapterUnlockStates[index]) {
            return;
        }
        const config = this.chapters[index];
        // 触发回调
        if (this.onEnterChapter) {
            this.onEnterChapter(config.chapter, config.startLevel, config.endLevel);
        } else {
            console.warn('未设置章节onEnterChapter 回调');
        }
    }

    /**
     * 解锁章节
     * @param chapter 章节编号（从1开始）
     */
    public unlockChapter(chapter: number): void {
        const index = chapter - 1;
        if (index < 0 || index >= this.chapters.length) {
            console.warn(`[ChapterUI] 章节编号无效: ${chapter}`);
            return;
        }

        if (this.chapterUnlockStates[index]) {
            return;
        }

        // 更新解锁状态
        this.chapterUnlockStates[index] = true;
        this.saveChapterUnlockStates();

        // 更新章节项状态
        const chapterNode = this.chapterNodes[index];
        if (chapterNode && chapterNode.isValid) {
            // 如果有 ChapterItem 组件，更新其解锁状态
            const chapterItem = chapterNode.getComponent(ChapterItem);
            if (chapterItem) {
                chapterItem.setUnlocked(true);
            } else {
                // 后备方案：手动更新按钮和颜色
                const button = chapterNode.getComponent(Button);
                if (button) {
                    button.interactable = true;
                }

                // 恢复颜色
                if (chapterNode.getComponent(Sprite)) {
                    const color = chapterNode.getComponent(Sprite).color.clone();
                    color.r = 255;
                    color.g = 255;
                    color.b = 255;
                    chapterNode.getComponent(Sprite).color = color;
                }
            }
            // 播放解锁动画
            tween(chapterNode)
                .to(0.2, { scale: new Vec3(1.1, 1.1, 1) })
                .to(0.2, { scale: new Vec3(1, 1, 1) })
                .start();
        }
    }

    /**
     * 检查章节是否已解锁
     */
    public isChapterUnlocked(chapter: number): boolean {
        const index = chapter - 1;
        if (index < 0 || index >= this.chapters.length) {
            return false;
        }
        return this.chapterUnlockStates[index];
    }

    /**
     * 获取章节背景图
     * @param chapter 章节编号（从1开始）
     * @returns 章节背景图 SpriteFrame，如果章节不存在则返回null
     */
    public getChapterBackgroundImage(chapter: number): SpriteFrame | null {
        const index = chapter - 1;
        if (index < 0 || index >= this.chapters.length) {
            console.warn(`[ChapterUI] 章节编号无效: ${chapter}`);
            return null;
        }
        
        const config = this.chapters[index];
        return config.chapterPassPic || null;
    }

    /**
     * 检查章节是否已完成（全部关卡通关）
     * @param chapter 章节编号（从1开始）
     */
    public isChapterCompleted(chapter: number): boolean {
        // 检查该章节的所有关卡是否都已解锁
        const chapterKey = `puzzle_unlock_states_chapter_${chapter}`;
        const saved = sys.localStorage.getItem(chapterKey);
        
        if (!saved) {
            return false;
        }
        
        try {
            const unlockStates = JSON.parse(saved);
            // 检查所有关卡是否都已解锁
            return unlockStates.every((state: boolean) => state === true);
        } catch (e) {
            console.error('[ChapterUI] 检查章节完成状态失败:', e);
            return false;
        }
    }

    /**
     * 更新章节完成状态（当章节完成时调用）
     * @param chapter 章节编号（从1开始）
     */
    public updateChapterCompleted(chapter: number): void {
        const index = chapter - 1;
        if (index < 0 || index >= this.chapterNodes.length) {
            return;
        }
        
        const chapterNode = this.chapterNodes[index];
        if (chapterNode && chapterNode.isValid) {
            const chapterItem = chapterNode.getComponent(ChapterItem);
            if (chapterItem) {
                const isCompleted = this.isChapterCompleted(chapter);
                chapterItem.setCompleted(isCompleted);
            }
        }
    }

    /**
     * 显示章节界面
     */
    public show(): void {
        this.node.active = true;
    }

    /**
     * 隐藏章节界面
     */
    public hide(): void {
        this.node.active = false;
    }

    protected onDestroy() {
        // 清理事件监听
        for (const chapterNode of this.chapterNodes) {
            if (chapterNode && chapterNode.isValid) {
                chapterNode.off(Node.EventType.TOUCH_END);
            }
        }
    }
}

