import { _decorator, Component, Node, SpriteFrame, Sprite, UITransform, Rect, resources, Prefab, instantiate, tween, Vec3, sys } from 'cc';
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
    private cardSprite: SpriteFrame = null;  // 扑克牌图片（用于覆盖）

    @property(Prefab)
    private cardPrefab: Prefab = null;  // 扑克牌预制体（可选）

    @property(Node)
    private startGameBtn: Node = null;  // 开始游戏按钮

    // 关卡配置
    private totalLevels: number = 4;  // 总关卡数
    private gridRows: number = 2;  // 网格行数
    private gridCols: number = 2;  // 网格列数

    // 开始游戏回调
    public onStartGame: () => void = null;

    // 小块节点数组
    private pieceNodes: Node[] = [];
    // 扑克牌节点数组
    private cardNodes: Node[] = [];
    // 解锁状态数组
    private unlockStates: boolean[] = [];

    // 存储键名
    private readonly STORAGE_KEY = 'puzzle_unlock_states';

    protected start() {
        // 绑定开始游戏按钮事件
        if (this.startGameBtn) {
            this.startGameBtn.on(Node.EventType.TOUCH_END, this.onStartGameBtnClick, this);
        } else {
            console.warn('[LevelUnlockUI] 未设置开始游戏按钮');
        }
    }

    /**
     * 初始化关卡解锁UI
     * @param totalLevels 总关卡数
     * @param gridRows 网格行数（用于分割图片）
     * @param gridCols 网格列数（用于分割图片）
     */
    public init(totalLevels: number, gridRows: number, gridCols: number): void {
        this.totalLevels = totalLevels;
        this.gridRows = gridRows;
        this.gridCols = gridCols;

        // 加载解锁状态
        this.loadUnlockStates();

        // 创建UI
        this.createUnlockUI();
    }

    /**
     * 开始游戏按钮点击事件
     */
    private onStartGameBtnClick(): void {
        console.log('[LevelUnlockUI] 点击开始游戏按钮');
        
        // 通知外部开始游戏
        if (this.onStartGame) {
            this.onStartGame();
        } else {
            console.warn('[LevelUnlockUI] 未设置 onStartGame 回调');
        }
    }

    /**
     * 加载解锁状态
     */
    private loadUnlockStates(): void {
        // 从本地存储加载解锁状态
        const saved = sys.localStorage.getItem(this.STORAGE_KEY);
        if (saved) {
            try {
                this.unlockStates = JSON.parse(saved);
                // 确保数组长度正确
                if (this.unlockStates.length !== this.totalLevels) {
                    this.unlockStates = new Array(this.totalLevels).fill(false);
                }
            } catch (e) {
                console.error('[LevelUnlockUI] 加载解锁状态失败:', e);
                this.unlockStates = new Array(this.totalLevels).fill(false);
            }
        } else {
            // 初始状态：全部未解锁
            this.unlockStates = new Array(this.totalLevels).fill(false);
        }
    }

    /**
     * 保存解锁状态
     */
    private saveUnlockStates(): void {
        try {
            sys.localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.unlockStates));
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
        // 清空容器
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
        // 获取背景图尺寸
        const bgTexture = this.backgroundImage.texture;
        const bgWidth = bgTexture.width;
        const bgHeight = bgTexture.height;
        // 创建所有小块
        for (let i = 0; i < this.totalLevels; i++) {
            const row = Math.floor(i / this.gridCols);
            const col = i % this.gridCols;
            let pieceNode = instantiate(this.piecePrefab);
            // 创建小块节点
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
            if (this.unlockStates[i]) {
                cardNode.active = false;  
            } else {
                cardNode.active = true;  
            }
        }
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
        // 添加 UITransform
        const uiTransform = pieceNode.getComponent(UITransform);
        uiTransform.width = pieceWidth;
        uiTransform.height = pieceHeight;
        // 设置位置
        const x = (col + 0.5) * pieceWidth - this.container.getComponent(UITransform).width / 2;
        const y = this.container.getComponent(UITransform).height / 2 - (row + 0.5) * pieceHeight;
        pieceNode.setPosition(x, y, 0);
        // 添加 Sprite 组件
        const sprite = pieceNode.getComponent(Sprite);
        // 创建裁剪后的 SpriteFrame
        const croppedFrame = this.createCroppedSpriteFrame(
            this.backgroundImage,
            row, col
        );
        
        if (croppedFrame && croppedFrame.texture) {
            console.log(`[LevelUnlockUI] 小块 ${index} 创建成功:`, croppedFrame.rect);
            sprite.spriteFrame = croppedFrame;
            // sprite.markForUpdateRenderData();
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
        // newFrame.rect = new Rect(x, height - y - cellHeight, cellWidth, cellHeight);
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
        cardNode.setSiblingIndex(20);
        return cardNode;
    }

    /**
     * 解锁指定关卡
     * @param level 关卡编号（从1开始）
     * @param withAnimation 是否播放动画
     */
    public unlockLevel(level: number, withAnimation: boolean = true): void {
        const index = level - 1;  // 转换为数组索引（从0开始）

        if (index < 0 || index >= this.totalLevels) {
            console.warn(`[LevelUnlockUI] 关卡编号无效: ${level}`);
            return;
        }
        if (this.unlockStates[index]) {
            console.log(`[LevelUnlockUI] 关卡 ${level} 已经解锁`);
            return;
        }
        // 更新解锁状态
        this.unlockStates[index] = true;
        this.saveUnlockStates();
        // 移除扑克牌（播放动画）
        const cardNode = this.cardNodes[index];
        if (cardNode && cardNode.isValid) {
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
        console.log(`[LevelUnlockUI] 关卡 ${level} 已解锁`);
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

    protected onDestroy() {
        // 清理事件监听
        if (this.startGameBtn) {
            this.startGameBtn.off(Node.EventType.TOUCH_END, this.onStartGameBtnClick, this);
        }
    }
}

