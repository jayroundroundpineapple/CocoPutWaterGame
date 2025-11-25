import { _decorator, Component, Node, SpriteFrame, Sprite, UITransform, Rect, resources, Prefab, instantiate, tween, Vec3, sys, utils, Label } from 'cc';
import { CardItem } from './CardItem';
import { Utils } from '../utils/Utils';
const { ccclass, property } = _decorator;

/**
 * 关卡解锁UI组件
 * 显示通关背景图，用扑克牌覆盖，每完成一关解锁对应的小块
 */
@ccclass('LevelUnlockUI')
export class LevelUnlockUI extends Component {
    @property(Node)
    private container: Node = null;  // 容器节点
    @property(Prefab)
    private piecePrefab: Prefab = null;  // 小块预制体
    @property(SpriteFrame)
    private backgroundImage: SpriteFrame = null;  // 完整的通关背景图
    @property(SpriteFrame)
    private cardSprite: SpriteFrame = null;  
    @property(Prefab)
    private cardPrefab: Prefab = null;  
    @property(Node)
    private startGameBtn: Node = null;
    @property(Label) 
    private levelLb:Label = null;
    @property(Node)
    private backBtn: Node = null;  // 返回章节界面按钮

    // 关卡配置
    private totalLevels: number;  // 总关卡数
    private gridRows: number;  // 网格行数
    private gridCols: number;  // 网格列数
    private startLevel: number = 1;  // 起始关卡（章节内的起始关卡）
    private endLevel: number = 1;  // 结束关卡（章节内的结束关卡）
    private chapter: number = 1;  // 当前章节编号

    // 开始游戏回调
    public onStartGame: () => void = null;

    // 进入关卡回调（点击卡牌时触发）
    public onEnterLevel: (level: number) => void = null;
    
    // 返回章节界面回调
    public onBackToChapter: () => void = null;

    // 小块节点数组
    private pieceNodes: Node[] = [];
    // 扑克牌节点数组
    private cardNodes: Node[] = [];
    // 解锁状态数组
    private unlockStates: boolean[] = [];

    // 存储键名（按章节存储）
    private getStorageKey(): string {
        return `puzzle_unlock_states_chapter_${this.chapter}`;
    }

    protected start() {
        // 绑定开始游戏按钮事件
        if (this.startGameBtn) {
            this.startGameBtn.on(Node.EventType.TOUCH_END, this.onStartGameBtnClick, this);
        } else {
            console.warn('[LevelUnlockUI] 未设置开始游戏按钮');
        }
        
        // 绑定返回按钮事件
        if (this.backBtn) {
            this.backBtn.on(Node.EventType.TOUCH_END, this.onBackBtnClick, this);
            // 初始状态：返回按钮隐藏（章节未完成时）
            this.backBtn.active = false;
        }
    }
    
    /**
     * 返回按钮点击事件
     */
    private onBackBtnClick(): void {
        console.log('[LevelUnlockUI] 点击返回按钮');
        if (this.onBackToChapter) {
            this.onBackToChapter();
        }
    }

    /**
     * 初始化关卡解锁UI
     * @param chapter 章节编号（从1开始）
     * @param startLevel 章节起始关卡（从1开始，全局关卡编号）
     * @param endLevel 章节结束关卡（全局关卡编号）
     * @param gridRows 网格行数（用于分割图片）
     * @param gridCols 网格列数（用于分割图片）
     * @param backgroundImage 章节背景图（可选，如果不传则使用默认的backgroundImage）
     */
    public init(chapter: number, startLevel: number, endLevel: number, gridRows: number, gridCols: number, backgroundImage?: SpriteFrame): void {
        this.chapter = chapter;
        this.startLevel = startLevel;
        this.endLevel = endLevel;
        this.totalLevels = endLevel - startLevel + 1;  // 章节内的关卡数
        this.gridRows = gridRows;
        this.gridCols = gridCols;
        if (backgroundImage) {
            this.backgroundImage = backgroundImage;
        }

        // 加载解锁状态
        this.loadUnlockStates();

        // 创建UI
        this.createUnlockUI();
        
        // 检查章节是否已完成，更新按钮状态
        this.updateButtonsState();
        
        // 更新关卡标签显示
        this.updateLevelLabel();
    }
    
    /**
     * 更新关卡标签显示
     */
    private updateLevelLabel(): void {
        if (!this.levelLb) {
            return;
        }
        
        // 找到当前章节中已解锁的最高关卡
        let currentLevel = this.startLevel;  // 默认第一关
        
        // 从后往前查找已解锁的最高关卡
        for (let i = this.totalLevels - 1; i >= 0; i--) {
            if (this.unlockStates[i]) {
                currentLevel = this.startLevel + i;
                break;
            }
        }
        
        // 如果找到了已解锁的关卡，显示下一关（如果下一关存在）
        const nextLevel = currentLevel + 1;
        if (nextLevel <= this.endLevel) {
            currentLevel = nextLevel;
        }
        
        // 更新标签文本
        this.levelLb.string = `LEVEL ${currentLevel}`;
        console.log(`[LevelUnlockUI] 更新关卡标签: Level ${currentLevel}`);
    }
    
    /**
     * 更新按钮状态（根据章节完成情况）
     */
    private updateButtonsState(): void {
        const allCompleted = this.unlockStates.every(state => state === true);
        
        if (allCompleted) {
            // 章节已完成：隐藏开始游戏按钮，显示返回按钮
            if (this.startGameBtn) {
                this.startGameBtn.active = false;
            }
            if (this.backBtn) {
                this.backBtn.active = true;
            }
        } else {
            // 章节未完成：显示开始游戏按钮，隐藏返回按钮
            if (this.startGameBtn) {
                this.startGameBtn.active = true;
            }
            if (this.backBtn) {
                this.backBtn.active = false;
            }
        }
    }

    /**
     * 开始游戏按钮点击事件
     */
    private onStartGameBtnClick(): void {
        console.log('[LevelUnlockUI] 点击开始游戏按钮');
        
        // 找到当前章节中已解锁的最高关卡，如果没有解锁的关卡，则进入第一关
        let targetLevel = this.startLevel;  // 默认第一关
        
        // 从后往前查找已解锁的最高关卡
        for (let i = this.totalLevels - 1; i >= 0; i--) {
            if (this.unlockStates[i]) {
                targetLevel = this.startLevel + i;
                break;
            }
        }
        
        // 如果所有关卡都未解锁，进入第一关
        // 如果找到了已解锁的关卡，进入下一关（如果下一关存在）
        const nextLevel = targetLevel + 1;
        if (nextLevel <= this.endLevel) {
            targetLevel = nextLevel;
        }
        
        console.log(`[LevelUnlockUI] 进入关卡 ${targetLevel}`);
        
        // 触发进入关卡回调
        if (this.onEnterLevel) {
            Utils.setScale(this.startGameBtn, 0.95, 0.1, () => {
                this.onEnterLevel(targetLevel);
            });
        } else {
            console.warn('[LevelUnlockUI] 未设置 onEnterLevel 回调');
        }
    }

    /**
     * 加载解锁状态
     */
    private loadUnlockStates(): void {
        const storageKey = this.getStorageKey();
        const saved = sys.localStorage.getItem(storageKey);
        if (saved) {
            try {
                this.unlockStates = JSON.parse(saved);
                if (this.unlockStates.length !== this.totalLevels) {
                    this.unlockStates = new Array(this.totalLevels).fill(false);
                }
            } catch (e) {
                console.error('[LevelUnlockUI] 加载解锁状态失败:', e);
                this.unlockStates = new Array(this.totalLevels).fill(false);
            }
        } else {
            this.unlockStates = new Array(this.totalLevels).fill(false);
        }
    }

    /**
     * 保存解锁状态
     */
    private saveUnlockStates(): void {
        try {
            const storageKey = this.getStorageKey();
            sys.localStorage.setItem(storageKey, JSON.stringify(this.unlockStates));
        } catch (e) {
            console.error('[LevelUnlockUI] 保存解锁状态失败:', e);
        }
    }

    /**
     * 创建解锁UI
     */
    private createUnlockUI(): void {
        if (!this.container || !this.backgroundImage) {
            console.error('[LevelUnlockUI] 容器或背景图未设置');
            return;
        }
        this.container.removeAllChildren();
        this.pieceNodes = [];
        this.cardNodes = [];

        const containerTransform = this.container.getComponent(UITransform);
        if (!containerTransform) {
            console.error('[LevelUnlockUI] 容器缺少 UITransform 组件');
            return;
        }
        const containerWidth = containerTransform.width;
        const containerHeight = containerTransform.height;
        // 计算每个小块的尺寸
        const pieceWidth = containerWidth / this.gridCols;
        const pieceHeight = containerHeight / this.gridRows;
        for (let i = 0; i < this.totalLevels; i++) {
            const row = Math.floor(i / this.gridCols);
            const col = i % this.gridCols;
            let pieceNode = instantiate(this.piecePrefab);
            this.createPieceNode(
                pieceNode, i, row, col,
                pieceWidth, pieceHeight,
            );
            this.pieceNodes.push(pieceNode);
            // 创建扑克牌节点（覆盖在小块上）
            const cardNode = this.createCardNode(
                i, row, col,
                pieceWidth, pieceHeight
            );
            this.cardNodes.push(cardNode);
            // 设置卡牌初始状态
            const localLevel = i + 1;  // 章节内的关卡编号（从1开始）
            const globalLevel = this.startLevel + i;  // 全局关卡编号
            const isUnlocked = this.unlockStates[i];
            
            // 计算是否可以玩：章节内第一关默认可以玩，或者上一关已解锁
            let canPlay = false;
            if (localLevel === 1) {
                // 如果是第一章的第一关，或者上一章节已完成
                if (this.chapter === 1) {
                    canPlay = true;  // 第一章第一关默认可以玩
                } else {
                    // 检查上一章节是否全部完成
                    canPlay = this.isPreviousChapterCompleted();
                }
            } else {
                // 上一关已解锁，当前关就可以玩
                const prevLevelIndex = localLevel - 2;  // 上一关的索引
                canPlay = prevLevelIndex >= 0 && this.unlockStates[prevLevelIndex] === true;
            }
            
            // 初始化 CardItem 组件
            const cardItem = cardNode.getComponent(CardItem);
            if (cardItem) {
                cardItem.init(globalLevel, isUnlocked, canPlay);  // 使用全局关卡编号
                // 设置点击回调
                cardItem.onClick = (levelNum: number) => {
                    this.onCardItemClick(levelNum);
                };
            }
            // 已解锁的关卡直接显示最终状态（pieceNode显示，cardNode隐藏）
            // 未解锁的关卡显示卡牌，隐藏pieceNode
            if (isUnlocked) {
                // 已解锁的关卡：直接显示最终状态
                cardNode.active = false;
                pieceNode.active = true;
            } else {
                // 未解锁的关卡：显示卡牌，隐藏pieceNode
                cardNode.active = true;
                pieceNode.active = false;
            }
        }
    }
    
    /**
     * 播放指定关卡的解锁动画
     * 用于从成功弹窗返回时，只播放刚刚通关的关卡动画
     * @param level 关卡编号（全局关卡编号）
     */
    public playUnlockAnimationForLevel(level: number): void {
        const index = level - this.startLevel;
        
        if (index < 0 || index >= this.totalLevels) {
            console.warn(`[LevelUnlockUI] 关卡编号无效: ${level} (章节 ${this.chapter} 的范围是 ${this.startLevel}-${this.endLevel})`);
            return;
        }
        
        // 检查关卡是否已解锁
        if (!this.unlockStates[index]) {
            console.warn(`[LevelUnlockUI] 关卡 ${level} 未解锁，无法播放动画`);
            return;
        }
        
        console.log(`[LevelUnlockUI] 播放关卡 ${level} 的解锁动画`);
        
        // 先设置初始状态：cardNode显示，pieceNode隐藏
        const cardNode = this.cardNodes[index];
        const pieceNode = this.pieceNodes[index];
        
        if (cardNode && cardNode.isValid) {
            cardNode.active = true;
            cardNode.scale = new Vec3(1, 1, 1);
        }
        
        if (pieceNode && pieceNode.isValid) {
            pieceNode.active = false;
            pieceNode.setScale(0, 0, 1);
        }
        
        // 延迟一下，然后播放动画
        this.scheduleOnce(() => {
            // 显示pieceNode并播放动画
            if (pieceNode && pieceNode.isValid) {
                pieceNode.active = true;
                pieceNode.setScale(0, 1, 1);
                tween(pieceNode).delay(0.1)
                    .to(0.3, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
                    .start();
            }
            
            // 隐藏cardNode并播放翻牌动画
            if (cardNode && cardNode.isValid) {
                tween(cardNode)
                    .to(0.3, { scale: new Vec3(0, 1, 1) }, { easing: 'sineIn' })
                    .call(() => {
                        cardNode.active = false;
                        cardNode.scale = new Vec3(1, 1, 1);
                    })
                    .start();
            }
        }, 0.1);
    }

    /**
     * 创建小块节点
     */
    private createPieceNode(
        pieceNode: Node,
        index: number,
        row: number,
        col: number,
        pieceWidth: number,
        pieceHeight: number,
    ): void {
        pieceNode.name = "piece"+index.toString();
        pieceNode.parent = this.container;
        const uiTransform = pieceNode.getComponent(UITransform);
        uiTransform.width = pieceWidth;
        uiTransform.height = pieceHeight;
        const x = (col + 0.5) * pieceWidth - this.container.getComponent(UITransform).width / 2;
        const y = this.container.getComponent(UITransform).height / 2 - (row + 0.5) * pieceHeight;
        pieceNode.setPosition(x, y, 0);
        pieceNode.active = false;
        const sprite = pieceNode.getComponent(Sprite);
        const croppedFrame = this.createCroppedSpriteFrame(
            this.backgroundImage,
            row, col
        );
        
        if (croppedFrame && croppedFrame.texture) {
            sprite.spriteFrame = croppedFrame;
        } else {
            console.error(`[LevelUnlockUI] 创建小块 ${index} 的 SpriteFrame 失败`);
            // 如果创建失败，使用完整背景图作为占位符
            if (this.backgroundImage) {
                sprite.spriteFrame = this.backgroundImage;
                sprite.markForUpdateRenderData();
                console.log(`[LevelUnlockUI] 小块 ${index} 使用完整背景图作为占位符`);
            }
        }
    }

    /**
     * 创建裁剪后的 SpriteFrame
     */
    private createCroppedSpriteFrame(
        originalFrame: SpriteFrame,
        row: number,
        col: number
    ): SpriteFrame | null {
        if (!originalFrame || !originalFrame.texture) {
            console.error('[LevelUnlockUI] 原始 SpriteFrame 或纹理为空');
            return null;
        }
        const texture = originalFrame.texture;
        const width = texture.width;
        const height = texture.height;
        // 翻转行索引（因为纹理坐标系Y轴从下往上）
        let currentRow = this.gridRows - row - 1;
        // 计算每个单元格的尺寸（基于纹理尺寸）
        const cellWidth = width / this.gridCols;
        const cellHeight = height / this.gridRows;

        // 计算裁剪区域的起始位置
        const x = col * cellWidth;
        const y = currentRow * cellHeight;

        const newFrame = new SpriteFrame();
        newFrame.texture = texture;
        newFrame.rect = new Rect(x, height - y - cellHeight, cellWidth, cellHeight);
        return newFrame;
    }

    /**
     * 创建扑克牌节点
     */
    private createCardNode(
        index: number,
        row: number,
        col: number,
        pieceWidth: number,
        pieceHeight: number
    ): Node {
        let cardNode: Node;
        if (this.cardPrefab) {
            cardNode = instantiate(this.cardPrefab);
        } else {
            cardNode = new Node(`Card_${index}`);
            const sprite = cardNode.addComponent(Sprite);
            if (this.cardSprite) {
                sprite.spriteFrame = this.cardSprite;
            }
        }
        cardNode.parent = this.container;
        
        // 设置大小和位置（与小块完全重叠）
        const uiTransform = cardNode.getComponent(UITransform) || cardNode.addComponent(UITransform);
        uiTransform.width = pieceWidth;
        uiTransform.height = pieceHeight;

        const x = (col + 0.5) * pieceWidth - this.container.getComponent(UITransform).width / 2;
        const y = this.container.getComponent(UITransform).height / 2 - (row + 0.5) * pieceHeight;
        cardNode.setPosition(x, y, 0);
        
        // 确保扑克牌在小块之上
        cardNode.setSiblingIndex(100);
        
        // 如果预制体没有 CardItem 组件，自动添加（可选）
        // 注意：如果预制体中已经有 CardItem 组件，这里不会重复添加
        if (!cardNode.getComponent(CardItem)) {
            const cardItem = cardNode.addComponent(CardItem);
            // CardItem 的初始化会在 createUnlockUI 中调用
        }
        
        return cardNode;
    }

    /**
     * 卡牌点击事件处理
     */
    private onCardItemClick(level: number): void {
        console.log(`[LevelUnlockUI] 点击关卡 ${level} 的卡牌`);
        
        // 触发进入关卡回调
        if (this.onEnterLevel) {
            this.onEnterLevel(level);
        } else {
            console.warn('[LevelUnlockUI] 未设置 onEnterLevel 回调');
        }
    }
    /**
     * 解锁指定关卡
     * @param level 关卡编号（全局关卡编号，从1开始）
     * @param withAnimation 是否播放动画
     */
    public unlockLevel(level: number, withAnimation: boolean = true): void {
        // 转换为章节内的索引
        const index = level - this.startLevel;

        if (index < 0 || index >= this.totalLevels) {
            console.warn(`[LevelUnlockUI] 关卡编号无效: ${level} (章节 ${this.chapter} 的范围是 ${this.startLevel}-${this.endLevel})`);
            return;
        }
        if (this.unlockStates[index]) {
            console.log(`[LevelUnlockUI] 关卡 ${level} 已经解锁`);
            return;
        }
        // 更新解锁状态
        this.unlockStates[index] = true;
        this.saveUnlockStates();
        
        // 显示对应的pieceNode（显示解锁的图片小块）
        const pieceNode = this.pieceNodes[index];
        if (pieceNode && pieceNode.isValid) {
            if (withAnimation) {
                pieceNode.active = true;
                pieceNode.setScale(0, 0, 1);
                tween(pieceNode)
                    .to(0.3, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
                    .start();
            } else {
                pieceNode.active = true;
            }
        }
        
        // 更新 CardItem 组件的解锁状态
        const cardNode = this.cardNodes[index];
        if (cardNode && cardNode.isValid) {
            const cardItem = cardNode.getComponent(CardItem);
            if (cardItem) {
                cardItem.setUnlocked(true);
            }
            // 移除扑克牌（播放动画）
            if (withAnimation) {
                // 播放翻转或淡出动画
                tween(cardNode)
                    .to(0.3, { scale: new Vec3(0, 1, 1) }, { easing: 'sineIn' })
                    .call(() => {
                        cardNode.active = false;
                        cardNode.scale = new Vec3(1, 1, 1);  // 恢复缩放
                    })
                    .start();
            } else {
                cardNode.active = false;
            }
        }
        // 解锁下一关（如果存在）
        const nextLevelIndex = index + 1;
        if (nextLevelIndex < this.totalLevels) {
            const nextCardNode = this.cardNodes[nextLevelIndex];
            if (nextCardNode && nextCardNode.isValid) {
                const nextCardItem = nextCardNode.getComponent(CardItem);
                if (nextCardItem) {
                    // 下一关现在可以玩了
                    nextCardItem.setCanPlay(true);
                    console.log(`[LevelUnlockUI] 关卡 ${level + 1} 现在可以玩了`);
                }
            }
        }
        // 检查章节是否全部完成
        this.checkChapterComplete();
        
        // 更新关卡标签显示
        this.updateLevelLabel();
        
        console.log(`[LevelUnlockUI] 关卡 ${level} 已解锁`);
    }
    
    /**
     * 检查章节是否全部完成
     */
    private checkChapterComplete(): void {
        // 检查所有关卡是否都已解锁
        const allCompleted = this.unlockStates.every(state => state === true);
        if (allCompleted) {
            console.log(`[LevelUnlockUI] 章节 ${this.chapter} 全部完成！`);
            // 章节完成后，隐藏开始游戏按钮，显示返回按钮
            this.updateButtonsForChapterComplete();
            // 可以触发章节完成回调
            // 这里不直接解锁下一章节，由 GameUI 统一管理
        }
    }
    
    /**
     * 更新按钮状态（章节完成时）
     */
    private updateButtonsForChapterComplete(): void {
        // 隐藏开始游戏按钮
        if (this.startGameBtn) {
            this.startGameBtn.active = false;
        }
        
        // 显示返回按钮
        if (this.backBtn) {
            this.backBtn.active = true;
        }
        
        console.log('[LevelUnlockUI] 章节完成，已隐藏开始游戏按钮，显示返回按钮');
    }
    
    /**
     * 检查上一章节是否全部完成
     */
    private isPreviousChapterCompleted(): boolean {
        if (this.chapter === 1) {
            return true;  // 第一章没有上一章节
        }
        
        // 检查上一章节的解锁状态
        const prevChapterKey = `puzzle_unlock_states_chapter_${this.chapter - 1}`;
        const prevChapterSaved = sys.localStorage.getItem(prevChapterKey);
        
        if (!prevChapterSaved) {
            return false;
        }
        
        try {
            const prevChapterStates = JSON.parse(prevChapterSaved);
            // 检查上一章节的所有关卡是否都已解锁
            return prevChapterStates.every((state: boolean) => state === true);
        } catch (e) {
            console.error('[LevelUnlockUI] 检查上一章节状态失败:', e);
            return false;
        }
    }
    
    /**
     * 检查章节是否全部完成
     */
    public isChapterCompleted(): boolean {
        return this.unlockStates.every(state => state === true);
    }
    
    /**
     * 获取当前章节编号
     */
    public getChapter(): number {
        return this.chapter;
    }

    /**
     * 检查关卡是否已解锁
     */
    public isLevelUnlocked(level: number): boolean {
        const index = level - 1;
        if (index < 0 || index >= this.totalLevels) {
            return false;
        }
        return this.unlockStates[index];
    }

    /**
     * 重置所有解锁状态（用于测试）
     */
    public resetAll(): void {
        this.unlockStates = new Array(this.totalLevels).fill(false);
        this.saveUnlockStates();
        this.createUnlockUI();
    }

    /**
     * 解锁所有关卡（用于测试）
     */
    public unlockAll(): void {
        for (let i = 0; i < this.totalLevels; i++) {
            this.unlockStates[i] = true;
            if (this.cardNodes[i]) {
                this.cardNodes[i].active = false;
            }
        }
        this.saveUnlockStates();
    }

    /**
     * 快速通过第n关之前的所有关卡（用于测试）
     * @param level 关卡编号（全局关卡编号），会解锁该关卡之前的所有关卡（不包括该关卡本身）
     * @param withAnimation 是否播放解锁动画，默认false
     */
    public quickUnlockBeforeLevel(level: number, withAnimation: boolean = false): void {
        // 转换为章节内的索引
        const targetIndex = level - this.startLevel;
        
        if (targetIndex < 0) {
            console.warn(`[LevelUnlockUI] 关卡编号 ${level} 不在当前章节范围内（${this.startLevel}-${this.endLevel}）`);
            return;
        }
        
        // 如果目标关卡超出当前章节范围，解锁整个章节
        const maxIndex = Math.min(targetIndex, this.totalLevels);
        
        console.log(`[LevelUnlockUI] 快速解锁关卡 ${this.startLevel} 到 ${this.startLevel + maxIndex - 1}（共 ${maxIndex} 关）`);
        
        // 解锁指定关卡之前的所有关卡
        for (let i = 0; i < maxIndex; i++) {
            if (!this.unlockStates[i]) {
                const globalLevel = this.startLevel + i;
                
                // 更新解锁状态
                this.unlockStates[i] = true;
                
                // 更新UI
                const pieceNode = this.pieceNodes[i];
                const cardNode = this.cardNodes[i];
                
                if (pieceNode && pieceNode.isValid) {
                    if (withAnimation) {
                        // 播放动画
                        pieceNode.active = true;
                        pieceNode.setScale(0, 0, 1);
                        tween(pieceNode)
                            .to(0.3, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
                            .start();
                    } else {
                        // 直接显示
                        pieceNode.active = true;
                    }
                }
                
                if (cardNode && cardNode.isValid) {
                    const cardItem = cardNode.getComponent(CardItem);
                    if (cardItem) {
                        cardItem.setUnlocked(true);
                    }
                    
                    if (withAnimation) {
                        // 播放翻牌动画
                        tween(cardNode)
                            .to(0.3, { scale: new Vec3(0, 1, 1) }, { easing: 'sineIn' })
                            .call(() => {
                                cardNode.active = false;
                                cardNode.scale = new Vec3(1, 1, 1);
                            })
                            .start();
                    } else {
                        // 直接隐藏
                        cardNode.active = false;
                    }
                }
                
                // 解锁下一关（如果存在）
                const nextLevelIndex = i + 1;
                if (nextLevelIndex < this.totalLevels) {
                    const nextCardNode = this.cardNodes[nextLevelIndex];
                    if (nextCardNode && nextCardNode.isValid) {
                        const nextCardItem = nextCardNode.getComponent(CardItem);
                        if (nextCardItem) {
                            nextCardItem.setCanPlay(true);
                        }
                    }
                }
            }
        }
        
        // 保存解锁状态
        this.saveUnlockStates();
        
        // 检查章节是否全部完成
        this.checkChapterComplete();
        
        console.log(`[LevelUnlockUI] 快速解锁完成！`);
    }

    protected onDestroy() {
        // 清理事件监听
        if (this.startGameBtn) {
            this.startGameBtn.off(Node.EventType.TOUCH_END, this.onStartGameBtnClick, this);
        }
        if (this.backBtn) {
            this.backBtn.off(Node.EventType.TOUCH_END, this.onBackBtnClick, this);
        }
    }
}

