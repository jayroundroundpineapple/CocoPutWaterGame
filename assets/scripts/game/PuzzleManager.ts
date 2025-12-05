import { _decorator, Component, Node, Sprite, SpriteFrame, UITransform, Vec3, Prefab, instantiate, resources, JsonAsset, EventTouch } from 'cc';
import { PuzzlePiece } from './PuzzlePiece';
import { UnionFind } from './UnionFind';
const { ccclass, property } = _decorator;

/**
 * 关卡配置接口
 */
interface LevelConfig {
    level: number;
    rows: number;
    cols: number;
    imagePath: string;
    isHardTip?: boolean;  // 是否为困难模式
}

/**
 * 拼图管理器
 * 管理拼图游戏的逻辑
 */
@ccclass('PuzzleManager')
export class PuzzleManager extends Component {
    @property(Node)
    private puzzleContainer: Node = null;  // 拼图容器节点
    @property(Prefab)
    private piecePrefab: Prefab = null;  // 拼图块预制体
    @property(SpriteFrame)
    private currentImage: SpriteFrame = null;  // 当前拼图的图片

    // 拼图块数组
    private pieces: PuzzlePiece[] = [];
    // 位置数组
    private positions: Vec3[] = [];
    private currentLevel: number = 1;

    // 当前关卡的配置
    private currentConfig: LevelConfig = null;
    // 所有关卡配置
    private levelConfigs: LevelConfig[] = [];

    // 当前关卡的网格信息
    private currentRows: number = 0;
    private currentCols: number = 0;

    // 相邻关系映射：记录每个拼图块在正确位置时，上下左右应该是什么拼图块（用correctIndex表示）
    // Map<correctIndex, { top: number, bottom: number, left: number, right: number }>
    // -1 表示该方向没有相邻拼图块（边界情况）
    private adjacentMap: Map<number, { top: number; bottom: number; left: number; right: number }> = new Map();
    // 完成回调
    public onPuzzleComplete: (level: number) => void = null;
    // 是否已完成（防止重复触发）
    private isCompleted: boolean = false;
    // 图片资源缓存
    private imageCache: Map<number, SpriteFrame> = new Map();
    // 预加载进度回调
    public onPreloadProgress: (loaded: number, total: number) => void = null;
    // 预加载完成回调
    public onPreloadComplete: () => void = null;

    private unionFind: UnionFind | null = null; // 并查集实例
    private groupMap: Map<number, number[]> = new Map(); // groupId -> [correctIndex1, correctIndex2, ...]
    private pieceToGroup: Map<number, number> = new Map(); // correctIndex -> groupId
    private currentDraggingGroup: {
        pieces: PuzzlePiece[], // 组内所有拼图块
        originalPositions: Vec3[], // 原始位置（用于恢复）
        originalIndices: number[], // 原始索引（用于恢复）
        dragOffset: Vec3, // 触摸点相对于组中心的偏移
        dragDirection: Vec3, // 拖拽方向（用于计算目标位置）
    } | null = null;
    private readonly GROUP_DRAG_THRESHOLD = 80; // 组拖动触发阈值
    private readonly GROUP_SNAP_THRESHOLD = 5; // 组吸附阈值（防止误触）
    /**
     * 获取当前关卡编号
     */
    public getCurrentLevel(): number {
        return this.currentLevel;
    }

    /**
     * 检查是否有下一关
     */
    public hasNextLevel(): boolean {
        const nextConfig = this.levelConfigs.find(c => c.level === this.currentLevel + 1);
        return nextConfig !== undefined;
    }

    protected onLoad() {
        this.loadLevelConfigs();
    }

    protected start() {
        if (this.currentImage) {
            // 如果没有配置，使用默认配置
            if (this.levelConfigs.length === 0) {
                this.loadDefaultConfig();
            }
            this.startPuzzle(this.currentImage);
        }
    }

    // 加载重试次数
    private loadRetryCount: number = 0;
    private readonly MAX_RETRY_COUNT: number = 3;

    /**
     * 加载关卡配置JSON
     */
    private loadLevelConfigs() {
        resources.load('config/puzzle-levels', JsonAsset, (err, jsonAsset) => {
            if (err) {
                console.error('[PuzzleManager] 加载关卡配置失败:', err);
                // 重试加载
                if (this.loadRetryCount < this.MAX_RETRY_COUNT) {
                    this.loadRetryCount++;
                    console.log(`[PuzzleManager] 重试加载关卡配置 (${this.loadRetryCount}/${this.MAX_RETRY_COUNT})`);
                    this.scheduleOnce(() => {
                        this.loadLevelConfigs();
                    }, 0.5);
                } else {
                    console.error('[PuzzleManager] 加载关卡配置失败，已达到最大重试次数');
                    this.loadDefaultConfig();
                }
                return;
            }

            const data = jsonAsset.json as { levels: LevelConfig[] };
            if (data && data.levels && Array.isArray(data.levels)) {
                this.levelConfigs = data.levels;
                this.loadRetryCount = 0;  // 重置重试计数
                console.log('[PuzzleManager] 加载关卡配置成功，共', this.levelConfigs.length, '关');
            } else {
                console.error('[PuzzleManager] 关卡配置格式错误');
                // 如果格式错误，也尝试重试
                if (this.loadRetryCount < this.MAX_RETRY_COUNT) {
                    this.loadRetryCount++;
                    this.scheduleOnce(() => {
                        this.loadLevelConfigs();
                    }, 0.5);
                } else {
                    this.loadDefaultConfig();
                }
            }
        });
    }

    /**
     * 加载默认配置（从JSON文件读取，如果多次重试都失败则使用空配置）
     */
    private loadDefaultConfig() {
        resources.load('config/puzzle-levels', JsonAsset, (err, jsonAsset) => {
            if (err) {
                console.error('[PuzzleManager] 最终加载失败，使用空配置:', err);
                this.levelConfigs = [];
                console.warn('[PuzzleManager] 警告：关卡配置为空，游戏可能无法正常运行');
                return;
            }

            const data = jsonAsset.json as { levels: LevelConfig[] };
            if (data && data.levels && Array.isArray(data.levels) && data.levels.length > 0) {
                this.levelConfigs = data.levels;
                console.log('[PuzzleManager] 最终加载成功，共', this.levelConfigs.length, '关');
            } else {
                console.error('[PuzzleManager] JSON格式错误或为空，使用空配置');
                this.levelConfigs = [];
            }
        });
    }

    /**
     * 获取当前关卡配置
     */
    private getCurrentLevelConfig(): LevelConfig | null {
        if (this.levelConfigs.length === 0) {
            console.warn('[PuzzleManager] 关卡配置为空，尝试重新加载...');
            this.loadRetryCount = 0;  // 重置重试计数
            this.loadLevelConfigs();
            return null;
        }

        const config = this.levelConfigs.find(c => c.level === this.currentLevel);
        if (!config && this.levelConfigs.length > 0) {
            // 如果找不到当前关卡，使用第一关的配置
            console.warn(`[PuzzleManager] 找不到关卡 ${this.currentLevel} 的配置，使用第一关配置`);
            return this.levelConfigs[0];
        }
        return config || null;
    }

    /**
     * 初始化相邻关系映射
     * 记录每个拼图块在正确位置时，上下左右应该是什么拼图块
     */
    private initAdjacentMap(rows: number, cols: number): void {
        this.adjacentMap.clear();

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const correctIndex = row * cols + col;

                // 计算上下左右的正确相邻拼图块的 correctIndex
                const top = row > 0 ? (row - 1) * cols + col : -1;
                const bottom = row < rows - 1 ? (row + 1) * cols + col : -1;
                const left = col > 0 ? row * cols + (col - 1) : -1;
                const right = col < cols - 1 ? row * cols + (col + 1) : -1;

                this.adjacentMap.set(correctIndex, { top, bottom, left, right });
            }
        }

        console.log(`[PuzzleManager] 初始化相邻关系映射: ${rows}x${cols}, 共${this.adjacentMap.size}个拼图块`);
    }

    private initPositions(rows: number, cols: number) {
        if (!this.puzzleContainer) return;

        const uiTransform = this.puzzleContainer.getComponent(UITransform);
        if (!uiTransform) return;

        const width = uiTransform.width;
        const height = uiTransform.height;

        const cellWidth = width / cols;
        const cellHeight = height / rows;

        // 清空位置数组
        this.positions = [];

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                // 计算中心点位置（相对于容器中心）
                const x = (col + 0.5) * cellWidth - width / 2;
                const y = height / 2 - (row + 0.5) * cellHeight;
                const index = row * cols + col;
                this.positions[index] = new Vec3(x, y, 0);
            }
        }

        console.log(`[PuzzleManager] 初始化位置: ${rows}x${cols}, 共${this.positions.length}个位置`);
    }

    /**
     * 开始拼图游戏
     */
    public startPuzzle(spriteFrame: SpriteFrame) {
        this.currentImage = spriteFrame;
        this.isCompleted = false;  // 重置完成标志

        // 获取当前关卡配置
        this.currentConfig = this.getCurrentLevelConfig();
        if (!this.currentConfig) {
            console.error('[PuzzleManager] 无法获取关卡配置');
            return;
        }
        // 保存网格信息
        this.currentRows = this.currentConfig.rows;
        this.currentCols = this.currentConfig.cols;

        this.initAdjacentMap(this.currentRows, this.currentCols);// 初始化相邻关系映射
        this.initPositions(this.currentConfig.rows, this.currentConfig.cols);// 初始化位置
        this.clearPieces();
        this.createPieces(spriteFrame, this.currentConfig.rows, this.currentConfig.cols);
        this.shufflePieces();
        // 延迟更新边框，等待发牌动画完成
        const totalPieces = this.currentRows * this.currentCols;
        const dealDuration = 0.3;
        const dealDelay = 0.05;
        const totalAnimationTime = totalPieces * dealDelay + dealDuration;
        this.scheduleOnce(() => {
            this.updatePieceBorders();
        }, totalAnimationTime + 0.1);
    }

    /**
     * 开始指定关卡
     * @param level 关卡编号（从1开始）
     */
    public startLevel(level: number): void {
        console.log(`[PuzzleManager] 开始关卡 ${level}`);
        // 设置当前关卡
        this.currentLevel = level;
        this.isCompleted = false;  // 重置完成标志
        // 如果配置为空，尝试重新加载
        if (this.levelConfigs.length === 0) {
            console.warn('[PuzzleManager] 关卡配置为空，尝试重新加载...');
            this.loadRetryCount = 0;  // 重置重试计数
            this.loadLevelConfigs();
            // 延迟执行，等待配置加载完成
            this.scheduleOnce(() => {
                this.tryStartLevel(level);
            }, 0.5);
            return;
        }

        this.tryStartLevel(level);
    }

    /**
     * 尝试开始关卡（内部方法）
     */
    private tryStartLevel(level: number): void {
        const config = this.levelConfigs.find(c => c.level === level);
        if (!config) {
            console.error(`[PuzzleManager] 找不到关卡 ${level} 的配置`);
            console.error(`[PuzzleManager] 当前配置数量: ${this.levelConfigs.length}`);
            if (this.levelConfigs.length > 0) {
                console.error(`[PuzzleManager] 可用关卡: ${this.levelConfigs.map(c => c.level).join(', ')}`);
            }
            return;
        }

        this.currentConfig = config;

        // 先从缓存获取图片
        const cachedImage = this.getCachedImage(level);
        if (cachedImage) {
            console.log(`[PuzzleManager] 从缓存获取关卡 ${level} 图片`);
            this.startPuzzle(cachedImage);
            return;
        }

        // 如果缓存中没有，则加载图片
        console.log(`[PuzzleManager] 加载关卡 ${level} 图片: ${config.imagePath}`);
        resources.load(config.imagePath, SpriteFrame, (err, spriteFrame) => {
            if (err) {
                console.error(`[PuzzleManager] 加载关卡 ${level} 图片失败:`, err);
                console.error(`[PuzzleManager] 路径: ${config.imagePath}`);
                console.error(`[PuzzleManager] 提示：请确保资源路径正确，且资源已正确导入到 resources 目录`);
                return;
            }

            // 缓存图片
            this.imageCache.set(level, spriteFrame);
            console.log(`[PuzzleManager] 关卡 ${level} 图片加载成功`);
            this.startPuzzle(spriteFrame);
        });
    }
    public isPieceInGroup(piece: PuzzlePiece): boolean {
        const groupId = this.pieceToGroup.get(piece.correctIndex);
        if (groupId === undefined) return false;
        const groupPieces = this.groupMap.get(groupId);
        // 组内块数>1 才视为“组”，禁止单独操作
        return !!groupPieces && groupPieces.length > 1;
    }

    /**
     * 创建拼图块（根据rows和cols动态创建）
     */
    private createPieces(spriteFrame: SpriteFrame, rows: number, cols: number) {
        if (!this.piecePrefab || !this.puzzleContainer || !this.currentConfig) return;
        // 获取容器大小
        const containerTransform = this.puzzleContainer.getComponent(UITransform);
        if (!containerTransform) return;
        const containerWidth = containerTransform.width;
        const containerHeight = containerTransform.height;

        // 计算每个拼图块的大小
        const pieceWidth = containerWidth / cols;
        const pieceHeight = containerHeight / rows;

        const totalPieces = rows * cols;

        // 计算右下角位置（所有拼图块初始堆叠在这里）
        const stackPosition = new Vec3(
            containerWidth / 2 - pieceWidth / 2,  // 右下角X
            -containerHeight / 2 + pieceHeight / 2,  // 右下角Y
            0
        );

        // 创建所有拼图块
        for (let i = 0; i < totalPieces; i++) {
            const pieceNode = instantiate(this.piecePrefab);
            pieceNode.parent = this.puzzleContainer;
            // 设置拼图块的大小
            const pieceTransform = pieceNode.getComponent(UITransform);
            if (pieceTransform) {
                pieceTransform.width = pieceWidth;
                pieceTransform.height = pieceHeight;
            }

            const piece = pieceNode.getComponent(PuzzlePiece);
            if (piece) {
                piece.init(spriteFrame, i, i, rows, cols);
                // 初始位置设置为右下角（堆叠）
                piece.setPosition(stackPosition, -1);  // -1 表示未分配位置
                piece.onPositionChanged = (p, newIndex) => {
                    this.onPiecePositionChanged(p, newIndex);
                };
                piece.onGroupDragStart = (p, event) => {
                    this.onGroupDragStart(p, event);
                };
                piece.onGroupDragMove = (p, event) => {
                    return this.onGroupDragMove(p, event);
                };
                piece.onGroupDragEnd = (p, event) => {
                    return this.onGroupDragEnd(p, event);
                };
                this.pieces.push(piece);
            }
        }

        console.log(`[PuzzleManager] 创建了 ${totalPieces} 个拼图块 (${rows}x${cols})，初始位置在右下角`);
    }
    private getDragBoundThreshold(): number {
        if (!this.puzzleContainer) return 100;
        const uiTransform = this.puzzleContainer.getComponent(UITransform);
        return Math.max(uiTransform.width, uiTransform.height) * 0.3; // 限制在容器外30%范围内
    }
    // 新增：识别连通的相邻组（并查集实现）
    private calculateConnectedGroups(): void {
        if (this.pieces.length === 0) return;

        // 初始化并查集（以correctIndex为节点）
        const allCorrectIndices = this.pieces.map(p => p.correctIndex);
        this.unionFind = new UnionFind(allCorrectIndices);

        // 遍历所有拼图块，合并正确相邻的块
        for (const piece of this.pieces) {
            const correctIdx = piece.correctIndex;
            const currentIdx = piece.currentIndex;
            const [currentRow, currentCol] = [
                Math.floor(currentIdx / this.currentCols),
                currentIdx % this.currentCols
            ];
            const adjacent = this.adjacentMap.get(correctIdx);
            if (!adjacent) continue;

            // 检查上方相邻
            if (adjacent.top !== -1 && currentRow > 0) {
                const topCurrentIdx = currentIdx - this.currentCols;
                const topPiece = this.pieces.find(p => p.currentIndex === topCurrentIdx);
                if (topPiece && topPiece.correctIndex === adjacent.top && piece.hideTop) {
                    this.unionFind.union(correctIdx, topPiece.correctIndex);
                }
            }

            // 检查下方相邻
            if (adjacent.bottom !== -1 && currentRow < this.currentRows - 1) {
                const bottomCurrentIdx = currentIdx + this.currentCols;
                const bottomPiece = this.pieces.find(p => p.currentIndex === bottomCurrentIdx);
                if (bottomPiece && bottomPiece.correctIndex === adjacent.bottom && piece.hideBottom) {
                    this.unionFind.union(correctIdx, bottomPiece.correctIndex);
                }
            }

            // 检查左侧相邻
            if (adjacent.left !== -1 && currentCol > 0) {
                const leftCurrentIdx = currentIdx - 1;
                const leftPiece = this.pieces.find(p => p.currentIndex === leftCurrentIdx);
                if (leftPiece && leftPiece.correctIndex === adjacent.left && piece.hideLeft) {
                    this.unionFind.union(correctIdx, leftPiece.correctIndex);
                }
            }
            // 检查右侧相邻
            if (adjacent.right !== -1 && currentCol < this.currentCols - 1) {
                const rightCurrentIdx = currentIdx + 1;
                const rightPiece = this.pieces.find(p => p.currentIndex === rightCurrentIdx);
                if (rightPiece && rightPiece.correctIndex === adjacent.right && piece.hideRight) {
                    this.unionFind.union(correctIdx, rightPiece.correctIndex);
                }
            }
        }
        // 构建组映射
        this.groupMap.clear();
        this.pieceToGroup.clear();
        const rootToGroupId = new Map<number, number>();
        let groupId = 0;

        for (const piece of this.pieces) {
            const correctIdx = piece.correctIndex;
            const root = this.unionFind!.find(correctIdx);
            if (!rootToGroupId.has(root)) {
                rootToGroupId.set(root, groupId++);
                this.groupMap.set(rootToGroupId.get(root)!, []);
            }
            const gId = rootToGroupId.get(root)!;
            this.groupMap.get(gId)!.push(correctIdx);
            this.pieceToGroup.set(correctIdx, gId);
        }
        // 调试日志
        console.log("当前相邻组：");
        this.groupMap.forEach((members, id) => {
            console.log(`组${id}：${members.map(idx => `块${idx}`).join(', ')}`);
        });
    }
    // 新增：获取拼图块所在的组
    private getPieceGroup(piece: PuzzlePiece): PuzzlePiece[] | null {
        const groupId = this.pieceToGroup.get(piece.correctIndex);
        if (groupId === undefined) return null;

        const groupCorrectIndices = this.groupMap.get(groupId);
        if (!groupCorrectIndices) return null;

        // 转换为PuzzlePiece实例数组
        const groupPieces = groupCorrectIndices
            .map(idx => this.pieces.find(p => p.correctIndex === idx))
            .filter(p => p !== undefined) as PuzzlePiece[];

        return groupPieces.length > 0 ? groupPieces : null;
    }

    // 新增：组拖动开始
    private onGroupDragStart(touchPiece: PuzzlePiece, event: EventTouch): void {
        const group = this.getPieceGroup(touchPiece);
        if (!group || group.length <= 1) {
            this.currentDraggingGroup = null;
            return;
        }

        const containerTransform = this.puzzleContainer.getComponent(UITransform);
        if (!containerTransform) {
            this.currentDraggingGroup = null;
            return;
        }
        //正确转换触摸位置（屏幕坐标 → 容器节点本地坐标）
        const touchScreenPos = new Vec3(event.getUILocation().x, event.getUILocation().y, 0);
        const touchLocalPos = containerTransform.convertToNodeSpaceAR(touchScreenPos);
        // 计算组当前中心（基于容器本地坐标，不受触摸位置影响）
        const groupCenter = this.calculateGroupCenter(group);
        // 计算触摸点相对于组中心的偏移（不管触摸组内哪个位置，偏移量都正确）
        const dragOffset = new Vec3(
            touchLocalPos.x - groupCenter.x,
            touchLocalPos.y - groupCenter.y,
            0
        );
        //记录原始状态（克隆向量，避免后续修改影响）
        const originalPositions = group.map(p => p.node.position.clone());
        const originalIndices = group.map(p => p.currentIndex);

        // 只要点击的是组内块，不管点击位置在哪，都触发组拖动
        this.currentDraggingGroup = {
            pieces: group,
            originalPositions,
            originalIndices,
            dragOffset,
            dragDirection: new Vec3(0, 0, 0) // 初始方向为0
        };

        // 提升层级（视觉上在最上层，避免被其他块遮挡）
        group.forEach(p => p.node.setSiblingIndex(this.puzzleContainer.children.length - 1));
    }

    // 新增：组拖动中
    private onGroupDragMove(touchPiece: PuzzlePiece, event: EventTouch): boolean {
        if (!this.currentDraggingGroup || !this.puzzleContainer) return false;
        const { pieces: group, dragOffset } = this.currentDraggingGroup;
        const containerTransform = this.puzzleContainer.getComponent(UITransform);
        const boundThreshold = this.getDragBoundThreshold();
        // 步骤1：实时转换触摸位置（每帧更新，确保准确性）
        const touchScreenPos = new Vec3(event.getUILocation().x, event.getUILocation().y, 0);
        const touchLocalPos = containerTransform.convertToNodeSpaceAR(touchScreenPos);
        // 步骤2：计算目标组中心（触摸位置 - 偏移量 → 确保组跟着触摸点走）
        const targetCenter = new Vec3(
            touchLocalPos.x - dragOffset.x,
            touchLocalPos.y - dragOffset.y,
            0
        );
        // 步骤3：范围约束（避免组拖出屏幕太远）
        const containerHalfWidth = containerTransform.width / 2;
        const containerHalfHeight = containerTransform.height / 2;
        targetCenter.x = Math.max(-containerHalfWidth - boundThreshold, Math.min(containerHalfWidth + boundThreshold, targetCenter.x));
        targetCenter.y = Math.max(-containerHalfHeight - boundThreshold, Math.min(containerHalfHeight + boundThreshold, targetCenter.y));

        // 步骤4：计算拖拽方向（相对于原始中心）
        const originalCenter = this.calculateGroupCenter({
            pieces: group,
            originalPositions: this.currentDraggingGroup.originalPositions
        });
        const dragDirection = new Vec3(
            targetCenter.x - originalCenter.x,
            targetCenter.y - originalCenter.y,
            0
        );
        this.currentDraggingGroup.dragDirection = dragDirection;

        // 步骤5：基于原始组内偏移（确保组内块相对位置不变）
        const pieceOffsets = group.map((piece, idx) => {
            const originalPos = this.currentDraggingGroup.originalPositions[idx];
            return new Vec3(
                originalPos.x - originalCenter.x,
                originalPos.y - originalCenter.y,
                0
            );
        });

        // 步骤6：移动组内所有块（跟手优化，无延迟）
        group.forEach((piece, idx) => {
            const offset = pieceOffsets[idx];
            const targetPos = new Vec3(
                targetCenter.x + offset.x,
                targetCenter.y + offset.y,
                0
            );
            piece.node.position = targetPos; // 直接设置位置，跟手更灵敏
        });

        return true;
    }

    // 新增：组拖动结束
    private onGroupDragEnd(touchPiece: PuzzlePiece, event: EventTouch): boolean {
        if (!this.currentDraggingGroup || !this.puzzleContainer) return false;

        const { pieces: group, originalPositions, originalIndices, dragDirection } = this.currentDraggingGroup;
        const groupSize = group.length;
        const totalPieces = this.positions.length;
        const snapThreshold = 60; // 吸附阈值

        // 步骤1：计算拖拽方向对应的网格偏移量
        // 找到组内第一个拼图块的原始位置，计算它应该移动到的目标位置
        const referencePiece = group[0];
        const referenceOriginalIdx = originalIndices[0];
        const referenceOriginalRow = Math.floor(referenceOriginalIdx / this.currentCols);
        const referenceOriginalCol = referenceOriginalIdx % this.currentCols;

        // 计算拖拽方向（基于组中心移动）
        const originalCenter = this.calculateGroupCenter({
            pieces: group,
            originalPositions: originalPositions
        });
        const currentCenter = this.calculateGroupCenter(group);
        
        // 计算网格偏移（根据移动距离判断移动了几个格子）
        const cellWidth = this.puzzleContainer.getComponent(UITransform).width / this.currentCols;
        const cellHeight = this.puzzleContainer.getComponent(UITransform).height / this.currentRows;
        
        const offsetX = currentCenter.x - originalCenter.x;
        const offsetY = originalCenter.y - currentCenter.y; // Y轴向上为正，需要取反
        
        const colOffset = Math.round(offsetX / cellWidth);
        const rowOffset = Math.round(offsetY / cellHeight);

        // 如果移动距离太小，认为没有移动
        if (Math.abs(colOffset) === 0 && Math.abs(rowOffset) === 0) {
            // 检查是否在吸附范围内
            const minDist = Math.min(...this.positions.map((pos, idx) => {
                if (originalIndices.indexOf(idx) !== -1) return Infinity; // 跳过原始位置
                return Vec3.distance(currentCenter, pos);
            }));
            if (minDist > snapThreshold) {
                this.restoreGroupPosition();
                this.currentDraggingGroup = null;
                return true;
            }
            // 在吸附范围内，使用最近位置
            let nearestIdx = -1;
            let nearestDist = Infinity;
            for (let i = 0; i < this.positions.length; i++) {
                if (originalIndices.indexOf(i) !== -1) continue;
                const dist = Vec3.distance(currentCenter, this.positions[i]);
                if (dist < nearestDist && dist < snapThreshold) {
                    nearestDist = dist;
                    nearestIdx = i;
                }
            }
            if (nearestIdx === -1) {
                this.restoreGroupPosition();
                this.currentDraggingGroup = null;
                return true;
            }
            // 计算基于最近位置的偏移
            const nearestRow = Math.floor(nearestIdx / this.currentCols);
            const nearestCol = nearestIdx % this.currentCols;
            const newRowOffset = nearestRow - referenceOriginalRow;
            const newColOffset = nearestCol - referenceOriginalCol;
            
            // 计算目标索引
            const targetIndices = group.map((piece, idx) => {
                const originalIdx = originalIndices[idx];
                const originalRow = Math.floor(originalIdx / this.currentCols);
                const originalCol = originalIdx % this.currentCols;
                const targetRow = originalRow + newRowOffset;
                const targetCol = originalCol + newColOffset;
                if (targetRow < 0 || targetRow >= this.currentRows || targetCol < 0 || targetCol >= this.currentCols) {
                    return -1; // 无效
                }
                return targetRow * this.currentCols + targetCol;
            });

            if (targetIndices.some(idx => idx === -1)) {
                this.restoreGroupPosition();
                this.currentDraggingGroup = null;
                return true;
            }

            // 检查目标位置并执行置换
            const moveSuccess = this.moveGroupToPositions(group, targetIndices, originalIndices);
            if (!moveSuccess) {
                this.restoreGroupPosition();
            }
            this.currentDraggingGroup = null;
            return true;
        }

        // 步骤2：计算每个拼图块的目标索引（基于偏移量）
        const targetIndices: number[] = [];
        for (let i = 0; i < group.length; i++) {
            const originalIdx = originalIndices[i];
            const originalRow = Math.floor(originalIdx / this.currentCols);
            const originalCol = originalIdx % this.currentCols;
            
            const targetRow = originalRow + rowOffset;
            const targetCol = originalCol + colOffset;
            
            // 检查是否在边界内
            if (targetRow < 0 || targetRow >= this.currentRows || targetCol < 0 || targetCol >= this.currentCols) {
                this.restoreGroupPosition();
                this.currentDraggingGroup = null;
                return true;
            }
            
            targetIndices.push(targetRow * this.currentCols + targetCol);
        }

        // 步骤3：检查目标位置并执行置换
        const moveSuccess = this.moveGroupToPositions(group, targetIndices, originalIndices);
        if (!moveSuccess) {
            this.restoreGroupPosition();
        }

        this.currentDraggingGroup = null;
        return true;
    }

    /**
     * 移动整体块到目标位置（确保整体不被拆开，并填补空位置）
     * @param group 整体块
     * @param targetIndices 目标位置索引数组
     * @param originalIndices 原始位置索引数组
     * @returns 是否成功
     */
    private moveGroupToPositions(
        group: PuzzlePiece[],
        targetIndices: number[],
        originalIndices: number[]
    ): boolean {
        if (group.length !== targetIndices.length || group.length !== originalIndices.length) {
            return false;
        }

        // 检查所有目标位置是否在边界内
        for (const idx of targetIndices) {
            const row = Math.floor(idx / this.currentCols);
            const col = idx % this.currentCols;
            if (row < 0 || row >= this.currentRows || col < 0 || col >= this.currentCols) {
                return false; // 超出边界
            }
        }

        // 创建移动计划
        const movePlan = new Map<PuzzlePiece, number>();
        const processed = new Set<PuzzlePiece>();

        // 整体块移动到目标位置
        for (let i = 0; i < group.length; i++) {
            movePlan.set(group[i], targetIndices[i]);
            processed.add(group[i]);
        }

        // 填补空位置
        this.fillEmptyPositions(movePlan, processed);

        // 执行移动
        const moveDuration = 0.2;
        for (const [p, idx] of movePlan) {
            p.moveToPosition(this.positions[idx], idx, moveDuration);
        }

        // 更新边框和检查完成
        this.scheduleOnce(() => {
            this.updatePieceBorders();
            this.checkComplete();
        }, moveDuration + 0.1);

        return true;
    }

    /**
     * 验证并执行整体拼块的置换
     * @param group 整体拼块
     * @param targetIndices 目标位置索引数组
     * @param groupOriginalIndices 整体拼块的原始位置索引数组
     * @returns 是否成功
     */
    private validateAndSwapGroup(
        group: PuzzlePiece[],
        targetIndices: number[],
        groupOriginalIndices: number[]
    ): boolean {
        if (group.length !== targetIndices.length || group.length !== groupOriginalIndices.length) {
            return false;
        }

        // 步骤1：收集目标位置的拼图块（排除组内自身）
        const targetPieces: (PuzzlePiece | null)[] = targetIndices.map(idx =>
            this.pieces.find(p => p.currentIndex === idx && !group.some(g => g === p))
        );

        // 步骤2：检查目标位置的拼图块是否也是整体
        const targetGroupIds = new Set<number>();
        const targetGroupPieces: PuzzlePiece[] = [];
        const targetNonGroupPieces: PuzzlePiece[] = [];
        
        for (const piece of targetPieces) {
            if (piece) {
                const groupId = this.pieceToGroup.get(piece.correctIndex);
                if (groupId !== undefined) {
                    const groupMembers = this.groupMap.get(groupId);
                    if (groupMembers && groupMembers.length > 1) {
                        targetGroupIds.add(groupId);
                        targetGroupPieces.push(piece);
                    } else {
                        targetNonGroupPieces.push(piece);
                    }
                } else {
                    targetNonGroupPieces.push(piece);
                }
            }
        }

        // 步骤3：处理整体拼块的置换（移除个数和形状匹配限制）
        if (targetGroupIds.size > 0) {
            // 目标位置包含整体拼块
            if (targetGroupIds.size > 1) {
                // 目标位置有多个不同的整体，不允许置换
                console.log(`[PuzzleManager] 目标位置包含多个不同的整体拼块，不允许置换`);
                return false;
            }

            // 检查目标位置是否全部被整体拼块占用
            const allTargetPiecesAreGroup = targetNonGroupPieces.length === 0;
            
            if (allTargetPiecesAreGroup) {
                // 目标位置全部是整体拼块：直接使用链式交换，不需要匹配个数和形状
                const pushResult = this.pushPiecesWithGroup(group, targetIndices, targetGroupPieces, groupOriginalIndices);
                if (!pushResult) {
                    console.log(`[PuzzleManager] 整体拼块与整体拼块交换失败`);
                    return false;
                }
            } else {
                // 目标位置是混合的（整体拼块 + 非整体拼块）：使用链式交换逻辑
                // 不需要匹配形状和个数，直接进行一对一链式交换
                const allTargetPieces = [...targetGroupPieces, ...targetNonGroupPieces];
                const pushResult = this.pushPiecesWithGroup(group, targetIndices, allTargetPieces, groupOriginalIndices);
                if (!pushResult) {
                    console.log(`[PuzzleManager] 整体拼块与混合目标位置交换失败`);
                    return false;
                }
            }
        } else {
            // 目标位置是非整体拼块群：使用"推开"逻辑
            // 整体拼块会推开目标位置的拼图块，被推开的拼图块会继续移动
            const pushResult = this.pushPiecesWithGroup(group, targetIndices, targetNonGroupPieces, groupOriginalIndices);
            if (!pushResult) {
                console.log(`[PuzzleManager] 整体拼块推开拼图块失败`);
                return false;
            }
        }

        return true;
    }

    /**
     * 获取整体拼块的形状（相对位置关系）
     * @param pieces 拼图块数组
     * @param indices 位置索引数组
     * @returns 形状描述（相对位置偏移）
     */
    private getGroupShape(pieces: PuzzlePiece[], indices: number[]): Array<{ row: number; col: number }> {
        if (pieces.length === 0) return [];
        
        // 找到参考点（第一个拼图块的位置）
        const referenceIdx = indices[0];
        const referenceRow = Math.floor(referenceIdx / this.currentCols);
        const referenceCol = referenceIdx % this.currentCols;

        // 计算每个拼图块相对于参考点的偏移
        return indices.map(idx => {
            const row = Math.floor(idx / this.currentCols);
            const col = idx % this.currentCols;
            return {
                row: row - referenceRow,
                col: col - referenceCol
            };
        });
    }

    /**
     * 比较两个整体拼块的形状是否相同
     * @param shape1 形状1
     * @param shape2 形状2
     * @returns 是否相同
     */
    private compareGroupShapes(shape1: Array<{ row: number; col: number }>, shape2: Array<{ row: number; col: number }>): boolean {
        if (shape1.length !== shape2.length) return false;

        // 对形状进行排序（按行列顺序）
        const sortShape = (shape: Array<{ row: number; col: number }>) => {
            return [...shape].sort((a, b) => {
                if (a.row !== b.row) return a.row - b.row;
                return a.col - b.col;
            });
        };

        const sorted1 = sortShape(shape1);
        const sorted2 = sortShape(shape2);

        // 比较每个相对位置
        for (let i = 0; i < sorted1.length; i++) {
            if (sorted1[i].row !== sorted2[i].row || sorted1[i].col !== sorted2[i].col) {
                return false;
            }
        }

        return true;
    }

    /**
     * 整体拼块与非整体拼块群进行一对一链式交换
     * @param group 整体拼块
     * @param targetIndices 目标位置索引数组
     * @param targetPieces 目标位置的非整体拼图块数组
     * @param groupOriginalIndices 整体拼块的原始位置索引数组
     * @returns 是否成功
     */
    private pushPiecesWithGroup(
        group: PuzzlePiece[],
        targetIndices: number[],
        targetPieces: PuzzlePiece[],
        groupOriginalIndices: number[]
    ): boolean {
        // 创建目标位置到拼图块的映射
        const targetIndexToPiece = new Map<number, PuzzlePiece>();
        for (const piece of targetPieces) {
            targetIndexToPiece.set(piece.currentIndex, piece);
        }

        // 创建交换计划：整体拼块的每个拼图块与目标位置的对应拼图块交换
        const swapPlan = new Map<PuzzlePiece, number>(); // piece -> targetIndex
        const pieceToTargetIndex = new Map<PuzzlePiece, number>(); // piece -> 它应该移动到的目标索引
        const emptyIndices: number[] = []; // 记录空位置
        
        // 第一步：建立初始交换关系（整体拼块的每个拼图块与目标位置的对应拼图块）
        for (let i = 0; i < group.length; i++) {
            const groupPiece = group[i];
            const targetIdx = targetIndices[i];
            const targetPiece = targetIndexToPiece.get(targetIdx);
            
            if (targetPiece) {
                // 整体拼图的拼图块要移动到目标位置
                swapPlan.set(groupPiece, targetIdx);
                // 目标位置的拼图块要移动到整体拼图块的原始位置
                const originalIdx = groupOriginalIndices[i];
                pieceToTargetIndex.set(targetPiece, originalIdx);
            } else {
                // 目标位置为空，记录空位置
                emptyIndices.push(groupOriginalIndices[i]);
                swapPlan.set(groupPiece, targetIdx);
            }
        }

        // 第二步：优先使用空位置填补被替换的拼图块
        const finalSwapPlan = new Map<PuzzlePiece, number>();
        const processed = new Set<PuzzlePiece>();
        const usedEmptyIndices = new Set<number>();
        
        // 先处理整体拼块的移动
        for (const [piece, targetIdx] of swapPlan) {
            finalSwapPlan.set(piece, targetIdx);
        }
        
        // 优先将被替换的拼图块移动到空位置
        for (const [targetPiece, originalIdx] of pieceToTargetIndex) {
            if (processed.has(targetPiece)) continue;
            
            // 检查是否有空位置可以使用
            let foundEmpty = false;
            for (const emptyIdx of emptyIndices) {
                if (!usedEmptyIndices.has(emptyIdx)) {
                    // 找到空位置，直接移动
                    finalSwapPlan.set(targetPiece, emptyIdx);
                    processed.add(targetPiece);
                    usedEmptyIndices.add(emptyIdx);
                    foundEmpty = true;
                    break;
                }
            }
            
            if (!foundEmpty) {
                // 没有空位置，使用链式交换
                const chainResult = this.buildSwapChain(
                    targetPiece,
                    originalIdx,
                    group,
                    targetPieces,
                    processed,
                    finalSwapPlan
                );
                
                if (!chainResult) {
                    console.log(`[PuzzleManager] 链式交换失败: piece=${targetPiece.correctIndex}, targetIdx=${originalIdx}`);
                    return false;
                }
                
                // 合并链式交换结果
                for (const [p, idx] of chainResult) {
                    finalSwapPlan.set(p, idx);
                    processed.add(p);
                }
            }
        }

        // 验证：检查是否有重叠（同一个位置被多个拼图块占用）
        const positionToPiece = new Map<number, PuzzlePiece>();
        for (const [piece, targetIdx] of finalSwapPlan) {
            if (positionToPiece.has(targetIdx)) {
                const existingPiece = positionToPiece.get(targetIdx);
                console.error(`[PuzzleManager] 检测到重叠：位置 ${targetIdx} 被拼图块 ${piece.correctIndex} 和 ${existingPiece?.correctIndex} 同时占用`);
                return false;
            }
            positionToPiece.set(targetIdx, piece);
        }

        // 执行交换
        const moveDuration = 0.2;
        for (const [piece, targetIdx] of finalSwapPlan) {
            piece.moveToPosition(this.positions[targetIdx], targetIdx, moveDuration);
        }

        // 更新边框和组信息
        this.scheduleOnce(() => {
            this.updatePieceBorders();
            this.checkComplete();
        }, moveDuration + 0.1);

        return true;
    }

    /**
     * 构建链式交换路径（递归处理）
     * @param piece 需要移动的拼图块
     * @param targetIdx 目标位置索引
     * @param group 整体拼块（排除）
     * @param targetPieces 目标位置的拼图块（排除）
     * @param processed 已处理的拼图块
     * @param currentSwapPlan 当前的交换计划（用于查找已交换的拼图块）
     * @returns 交换计划 Map<piece, targetIndex>，如果失败返回null
     */
    private buildSwapChain(
        piece: PuzzlePiece,
        targetIdx: number,
        group: PuzzlePiece[],
        targetPieces: PuzzlePiece[],
        processed: Set<PuzzlePiece>,
        currentSwapPlan: Map<PuzzlePiece, number>
    ): Map<PuzzlePiece, number> | null {
        if (processed.has(piece)) {
            // 检测到循环，失败
            console.error(`[PuzzleManager] ：拼图块 ${piece.correctIndex}`);
            return null;
        }
        processed.add(piece);

        // 检查目标位置是否在边界内
        const targetRow = Math.floor(targetIdx / this.currentCols);
        const targetCol = targetIdx % this.currentCols;
        if (targetRow < 0 || targetRow >= this.currentRows || targetCol < 0 || targetCol >= this.currentCols) {
            console.error(`[PuzzleManager] 目标位置超出边界：targetIdx=${targetIdx}`);
            return null;
        }

        // 检查目标位置是否被占用
        // 首先检查目标位置是否已经在currentSwapPlan中被分配（整体拼块要移动到的位置）
        let occupyingPiece: PuzzlePiece | null = null;
        
        // 查找currentSwapPlan中是否有拼图块要移动到targetIdx
        for (const [p, idx] of currentSwapPlan) {
            if (idx === targetIdx && p !== piece) {
                // 这个拼图块要移动到targetIdx（可能是整体拼块）
                occupyingPiece = p;
                break;
            }
        }
        
        // 如果没找到，检查当前位置是否有其他拼图块（非整体拼块，且不在交换计划中）
        if (!occupyingPiece) {
            occupyingPiece = this.pieces.find(p => 
                p.currentIndex === targetIdx && 
                p !== piece &&
                !group.some(g => g === p) &&
                !targetPieces.some(tp => tp === p) &&
                !currentSwapPlan.has(p) // 不在当前交换计划中
            ) || null;
        }

        if (occupyingPiece) {
            // 目标位置被占用
            if (processed.has(occupyingPiece)) {
                // 占用的拼图块已经被处理过，形成循环，失败
                console.error(`[PuzzleManager] 检测到循环：拼图块 ${piece.correctIndex} 和 ${occupyingPiece.correctIndex}`);
                return null;
            }
            
            // 检查占用的拼图块是否已经在交换计划中
            if (currentSwapPlan.has(occupyingPiece)) {
                // 占用的拼图块已经在交换计划中（是整体拼块的一部分）
                // 当前拼图块应该移动到占用的拼图块要移动到的位置（递归查找）
                const occupyingPieceTargetIdx = currentSwapPlan.get(occupyingPiece)!;
                
                // 如果占用的拼图块要移动到的位置就是当前拼图块的原始位置，形成循环交换
                const currentPieceOriginalIdx = piece.currentIndex;
                if (occupyingPieceTargetIdx === currentPieceOriginalIdx) {
                    // 这是合法的循环交换：piece ↔ occupyingPiece
                    const result = new Map<PuzzlePiece, number>();
                    result.set(piece, targetIdx);
                    return result;
                }
                
                // 否则，需要递归处理：当前拼图块移动到占用的拼图块的目标位置
                const recursiveResult = this.buildSwapChain(
                    piece,
                    occupyingPieceTargetIdx,
                    group,
                    targetPieces,
                    processed,
                    currentSwapPlan
                );
                return recursiveResult;
            }
            
            // 占用的拼图块不在交换计划中，需要递归处理
            // 占用的拼图块应该移动到当前拼图块的原始位置
            const currentPieceOriginalIdx = piece.currentIndex;
            
            const recursiveResult = this.buildSwapChain(
                occupyingPiece,
                currentPieceOriginalIdx,
                group,
                targetPieces,
                processed,
                currentSwapPlan
            );
            
            if (!recursiveResult) {
                return null;
            }
            
            // 合并结果
            const result = new Map<PuzzlePiece, number>();
            result.set(piece, targetIdx);
            for (const [p, idx] of recursiveResult) {
                result.set(p, idx);
            }
            return result;
        }

        // 目标位置为空，直接移动
        const result = new Map<PuzzlePiece, number>();
        result.set(piece, targetIdx);
        return result;
    }

    /**
     * 整体拼块与整体拼块置换
     */
    private swapGroupWithGroup(
        group1: PuzzlePiece[],
        targetIndices: number[],
        group2: PuzzlePiece[],
        group1OriginalIndices: number[]
    ): void {
        const moveDuration = 0.2;

        // 整体互换：group1移动到group2的位置，group2移动到group1的位置
        // 需要保持各自的相对位置关系

        // 计算group2的原始位置
        const group2OriginalIndices = group2.map(p => p.currentIndex);

        // group1移动到group2的位置（保持相对位置）
        const group1ReferenceOffset = this.getGroupShape(group1, group1OriginalIndices);
        const group2ReferenceRow = Math.floor(targetIndices[0] / this.currentCols);
        const group2ReferenceCol = targetIndices[0] % this.currentCols;

        for (let i = 0; i < group1.length; i++) {
            const piece = group1[i];
            const offset = group1ReferenceOffset[i];
            const targetRow = group2ReferenceRow + offset.row;
            const targetCol = group2ReferenceCol + offset.col;
            const targetIdx = targetRow * this.currentCols + targetCol;
            piece.moveToPosition(this.positions[targetIdx], targetIdx, moveDuration);
        }

        // group2移动到group1的位置（保持相对位置）
        const group2ReferenceOffset = this.getGroupShape(group2, group2OriginalIndices);
        const group1ReferenceRow = Math.floor(group1OriginalIndices[0] / this.currentCols);
        const group1ReferenceCol = group1OriginalIndices[0] % this.currentCols;

        for (let i = 0; i < group2.length; i++) {
            const piece = group2[i];
            const offset = group2ReferenceOffset[i];
            const targetRow = group1ReferenceRow + offset.row;
            const targetCol = group1ReferenceCol + offset.col;
            const targetIdx = targetRow * this.currentCols + targetCol;
            piece.moveToPosition(this.positions[targetIdx], targetIdx, moveDuration);
        }

        // 更新边框和组信息
        this.scheduleOnce(() => {
            this.updatePieceBorders();
            this.checkComplete();
        }, moveDuration + 0.1);
    }

    /**
     * 计算组中心位置
     * @param group 支持：1. PuzzlePiece数组 2. 带pieces和原始位置的对象（用于拖动时计算原始中心）
     */
    private calculateGroupCenter(
        group: PuzzlePiece[] | { pieces: PuzzlePiece[]; originalPositions?: Vec3[] }
    ): Vec3 {
        const center = new Vec3(0, 0, 0);
        let targetPieces: PuzzlePiece[] = [];
        let useOriginalPos = false;
        let originalPositions: Vec3[] = [];
    
        if (Array.isArray(group)) {
            targetPieces = group;
        } else {
            targetPieces = group.pieces;
            useOriginalPos = !!group.originalPositions;
            originalPositions = group.originalPositions || [];
        }
    
        // 计算所有块的平均位置（确保上下组的中心在中间，方便吸附）
        targetPieces.forEach((piece, idx) => {
            const pos = useOriginalPos && originalPositions[idx]
                ? originalPositions[idx].clone()
                : piece.node.position.clone();
            Vec3.add(center, center, pos);
        });
    
        const pieceCount = targetPieces.length;
        if (pieceCount > 0) {
            Vec3.multiplyScalar(center, center, 1 / pieceCount);
        }
    
        return center;
    }

    // 新增：计算组的目标索引（基于参考点偏移）
    private calculateGroupTargetIndices(group: PuzzlePiece[], groupCenter: Vec3): number[] {
        // 找到组中心最近的网格位置（作为参考点）
        let referenceTargetIdx = -1;
        let minDistance = Infinity;
        for (let i = 0; i < this.positions.length; i++) {
            const dist = Vec3.distance(groupCenter, this.positions[i]);
            if (dist < minDistance) {
                minDistance = dist;
                referenceTargetIdx = i;
            }
        }
        if (referenceTargetIdx === -1) return [];

        // 计算组内每个块相对于参考块的偏移
        const referencePiece = group[0];
        const referenceOriginalIdx = referencePiece.currentIndex;
        const indexOffset = referenceTargetIdx - referenceOriginalIdx;

        // 生成所有块的目标索引
        return group.map(p => p.currentIndex + indexOffset);
    }

    // 新增：校验组是否在边界内
    private isGroupWithinBounds(targetIndices: number[]): boolean {
        const totalPieces = this.currentRows * this.currentCols;
        return targetIndices.every(idx => idx >= 0 && idx < totalPieces);
    }
    // 新增：恢复组的原始位置
    private restoreGroupPosition(): void {
        if (!this.currentDraggingGroup) return;

        const { pieces, originalPositions, originalIndices } = this.currentDraggingGroup;
        const restoreDuration = 0.2; // 快速恢复，避免飞出去后拖沓

        for (let i = 0; i < pieces.length; i++) {
            pieces[i].moveToPosition(originalPositions[i], originalIndices[i], restoreDuration);
        }
        this.scheduleOnce(() => this.updatePieceBorders(), restoreDuration);
    }

    /**
     * 打乱拼图块位置（带发牌动画）
     */
    private shufflePieces() {
        if (!this.currentConfig || this.pieces.length === 0) return;

        const totalPieces = this.pieces.length;
        const indices: number[] = [];
        for (let i = 0; i < totalPieces; i++) {
            indices.push(i);
        }

        this.shuffleArray(indices);
        // 确保不是已经完成的状态
        let attempts = 0;
        while (this.isSolved(indices) && attempts < 10) {
            this.shuffleArray(indices);
            attempts++;
        }
        
        // 播放发牌动画：依次将拼图块从右下角移动到目标位置
        const dealDuration = 0.3;  // 每个拼图块的动画时长
        const dealDelay = 0.05;    // 每个拼图块之间的延迟（发牌间隔）
        
        for (let i = 0; i < this.pieces.length; i++) {
            const targetIndex = indices[i];
            const piece = this.pieces[i];
            
            // 计算延迟时间（按顺序发牌）
            const delay = i * dealDelay;
            
            // 延迟后播放发牌动画
            this.scheduleOnce(() => {
                // 使用 moveToPosition 播放动画，不播放音效（发牌时不需要音效）
                piece.moveToPosition(this.positions[targetIndex], targetIndex, dealDuration, false);
            }, delay);
        }
        
        console.log(`[PuzzleManager] 开始发牌动画，共 ${totalPieces} 个拼图块`);
    }
    /**
     * 打乱数组
     */
    private shuffleArray(array: number[]) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    /**
     * 检查是否已解决
     */
    private isSolved(indices: number[]): boolean {
        for (let i = 0; i < indices.length; i++) {
            if (indices[i] !== i) return false;
        }
        return true;
    }

    /**
     * 拼图块位置改变回调
     */
    private onPiecePositionChanged(piece: PuzzlePiece, newIndex: number) {
        if (newIndex === -1) {
            // 需要检查是否移动到其他位置
            this.checkPiecePosition(piece);
        }
        // 注意：不在这里立即更新边框，因为位置可能还在变化中
        // 边框更新会在 checkPiecePosition 或 swapPieces 中统一处理
    }

    /**
     * 检查拼图块是否移动到其他位置
     */
    private checkPiecePosition(piece: PuzzlePiece) {
        // 当前块属于组 → 直接恢复原位置，禁止单个操作
        const isCurrentPieceInGroup = this.isPieceInGroup(piece);
        if (isCurrentPieceInGroup) {
            piece.moveToPosition(this.positions[piece.currentIndex], piece.currentIndex);
            this.scheduleOnce(() => {
                this.updatePieceBorders();
                this.checkComplete();
            }, 0.35);
            return;
        }

        let nearestIndex = -1;
        let minDistance = Infinity;

        for (let i = 0; i < this.positions.length; i++) {
            const distance = Vec3.distance(piece.node.position, this.positions[i]);
            if (distance < minDistance) {
                minDistance = distance;
                nearestIndex = i;
            }
        }

        // 计算到原位置的距离
        const distanceToOriginal = Vec3.distance(piece.node.position, this.positions[piece.currentIndex]);
        const snapThreshold = 5;  // 如果距离原位置小于这个值，直接返回原位置
        const detectThreshold = 80;  // 检测阈值

        if (nearestIndex >= 0 && minDistance < detectThreshold && nearestIndex !== piece.currentIndex) {
            // 检查目标位置是否在边界内
            const targetRow = Math.floor(nearestIndex / this.currentCols);
            const targetCol = nearestIndex % this.currentCols;
            if (targetRow < 0 || targetRow >= this.currentRows || targetCol < 0 || targetCol >= this.currentCols) {
                // 超出边界，恢复原位置
                piece.moveToPosition(this.positions[piece.currentIndex], piece.currentIndex);
                this.scheduleOnce(() => {
                    this.updatePieceBorders();
                    this.checkComplete();
                }, 0.35);
                return;
            }

            // 执行移动：单个块移动到目标位置，处理交换和空位置补全
            this.moveSinglePieceToPosition(piece, nearestIndex);
        } else if (distanceToOriginal > snapThreshold) {
            // 距离原位置超过阈值，移回原位置
            piece.moveToPosition(this.positions[piece.currentIndex], piece.currentIndex);
            this.scheduleOnce(() => {
                this.updatePieceBorders();
                this.checkComplete();
            }, 0.35);
        } else {
            // 距离很小，直接检查完成
            this.checkComplete();
        }
    }

    /**
     * 移动单个块到目标位置（处理交换和空位置补全）
     * @param piece 要移动的单个块
     * @param targetIndex 目标位置索引
     */
    private moveSinglePieceToPosition(piece: PuzzlePiece, targetIndex: number): void {
        const originalIndex = piece.currentIndex;
        const targetPiece = this.pieces.find(p => p?.currentIndex === targetIndex && p !== piece);

        // 创建移动计划
        const movePlan = new Map<PuzzlePiece, number>();
        const processed = new Set<PuzzlePiece>();

        // 单个块移动到目标位置
        movePlan.set(piece, targetIndex);
        processed.add(piece);

        // 如果目标位置有块，需要处理交换
        if (targetPiece) {
            const isTargetInGroup = this.isPieceInGroup(targetPiece);
            
            if (isTargetInGroup) {
                // 目标块属于整体，需要与整体交换
                const targetGroup = this.getPieceGroup(targetPiece);
                if (targetGroup && targetGroup.length > 1) {
                    // 计算整体块的目标位置（整体块移动到单个块的原始位置）
                    const groupOriginalIndices = targetGroup.map(p => p.currentIndex);
                    const groupTargetIndices = this.calculateGroupTargetIndicesForSwap(
                        targetGroup, 
                        originalIndex, 
                        targetPiece.currentIndex
                    );

                    if (groupTargetIndices && groupTargetIndices.length === targetGroup.length) {
                        // 整体块移动到目标位置
                        for (let i = 0; i < targetGroup.length; i++) {
                            movePlan.set(targetGroup[i], groupTargetIndices[i]);
                            processed.add(targetGroup[i]);
                        }
                    } else {
                        // 无法移动整体块（超出边界），恢复原位置
                        piece.moveToPosition(this.positions[originalIndex], originalIndex);
                        this.scheduleOnce(() => {
                            this.updatePieceBorders();
                            this.checkComplete();
                        }, 0.35);
                        return;
                    }
                } else {
                    // 目标块不是整体，直接交换
                    movePlan.set(targetPiece, originalIndex);
                    processed.add(targetPiece);
                }
            } else {
                // 目标块不是整体，直接交换
                movePlan.set(targetPiece, originalIndex);
                processed.add(targetPiece);
            }
        }

        // 填补空位置（如果有多个块需要移动，可能需要链式交换）
        this.fillEmptyPositions(movePlan, processed);

        // 执行移动
        const moveDuration = 0.2;
        for (const [p, idx] of movePlan) {
            p.moveToPosition(this.positions[idx], idx, moveDuration);
        }

        // 更新边框和检查完成
        this.scheduleOnce(() => {
            this.updatePieceBorders();
            this.checkComplete();
        }, moveDuration + 0.1);
    }

    /**
     * 计算整体块交换时的目标位置索引
     * @param group 整体块
     * @param singlePieceOriginalIndex 单个块的原始位置
     * @param targetPieceIndex 目标块的位置（整体块中的一个块）
     * @returns 整体块的目标位置索引数组，如果无法移动返回null
     */
    private calculateGroupTargetIndicesForSwap(
        group: PuzzlePiece[],
        singlePieceOriginalIndex: number,
        targetPieceIndex: number
    ): number[] | null {
        // 计算偏移量
        const targetPieceRow = Math.floor(targetPieceIndex / this.currentCols);
        const targetPieceCol = targetPieceIndex % this.currentCols;
        const singlePieceRow = Math.floor(singlePieceOriginalIndex / this.currentCols);
        const singlePieceCol = singlePieceOriginalIndex % this.currentCols;

        const rowOffset = singlePieceRow - targetPieceRow;
        const colOffset = singlePieceCol - targetPieceCol;

        // 计算整体块的目标位置
        const targetIndices: number[] = [];
        for (const groupPiece of group) {
            const groupPieceOriginalIdx = groupPiece.currentIndex;
            const groupPieceOriginalRow = Math.floor(groupPieceOriginalIdx / this.currentCols);
            const groupPieceOriginalCol = groupPieceOriginalIdx % this.currentCols;

            const targetRow = groupPieceOriginalRow + rowOffset;
            const targetCol = groupPieceOriginalCol + colOffset;

            // 检查是否在边界内
            if (targetRow < 0 || targetRow >= this.currentRows || targetCol < 0 || targetCol >= this.currentCols) {
                return null; // 超出边界
            }

            targetIndices.push(targetRow * this.currentCols + targetCol);
        }

        return targetIndices;
    }

    /**
     * 填补空位置（链式交换）
     * @param movePlan 移动计划
     * @param processed 已处理的块
     */
    private fillEmptyPositions(movePlan: Map<PuzzlePiece, number>, processed: Set<PuzzlePiece>): void {
        // 找出所有目标位置（movePlan中的目标位置）
        const targetIndices = new Set<number>();
        for (const [p, idx] of movePlan) {
            targetIndices.add(idx);
        }

        // 找出所有空位置（被移动的块的原始位置，但不在目标位置中）
        const emptyIndices: number[] = [];
        for (const [p, targetIdx] of movePlan) {
            const originalIdx = p.currentIndex;
            if (!targetIndices.has(originalIdx)) {
                emptyIndices.push(originalIdx);
            }
        }

        // 找出需要填补的块（不在movePlan中，但当前位置在目标位置中）
        const piecesToMove: PuzzlePiece[] = [];
        for (const piece of this.pieces) {
            if (processed.has(piece)) continue;
            if (targetIndices.has(piece.currentIndex)) {
                piecesToMove.push(piece);
            }
        }

        // 将需要移动的块移动到空位置
        let emptyIndexIdx = 0;
        for (const piece of piecesToMove) {
            if (emptyIndexIdx < emptyIndices.length) {
                // 有空位置，直接移动
                movePlan.set(piece, emptyIndices[emptyIndexIdx]);
                processed.add(piece);
                emptyIndexIdx++;
            } else {
                // 没有空位置了，使用链式交换
                const originalIdx = piece.currentIndex;
                const chainResult = this.buildSwapChainForFill(
                    piece,
                    originalIdx,
                    movePlan,
                    processed
                );
                if (chainResult) {
                    for (const [p, idx] of chainResult) {
                        movePlan.set(p, idx);
                        processed.add(p);
                    }
                }
            }
        }
    }

    /**
     * 为填补空位置构建链式交换
     */
    private buildSwapChainForFill(
        piece: PuzzlePiece,
        targetIdx: number,
        movePlan: Map<PuzzlePiece, number>,
        processed: Set<PuzzlePiece>
    ): Map<PuzzlePiece, number> | null {
        if (processed.has(piece)) {
            // 检测到循环，失败
            return null;
        }
        processed.add(piece);

        // 检查目标位置是否在边界内
        const targetRow = Math.floor(targetIdx / this.currentCols);
        const targetCol = targetIdx % this.currentCols;
        if (targetRow < 0 || targetRow >= this.currentRows || targetCol < 0 || targetCol >= this.currentCols) {
            return null;
        }

        // 检查目标位置是否被占用
        let occupyingPiece: PuzzlePiece | null = null;
        
        // 检查movePlan中是否有块要移动到targetIdx
        for (const [p, idx] of movePlan) {
            if (idx === targetIdx && p !== piece) {
                occupyingPiece = p;
                break;
            }
        }

        // 如果没找到，检查当前位置是否有其他块
        if (!occupyingPiece) {
            occupyingPiece = this.pieces.find(p => 
                p.currentIndex === targetIdx && 
                p !== piece &&
                !processed.has(p) &&
                !movePlan.has(p)
            ) || null;
        }

        if (occupyingPiece) {
            // 目标位置被占用，需要递归处理
            // 占用的块应该移动到当前块的原始位置
            const currentPieceOriginalIdx = piece.currentIndex;
            
            const recursiveResult = this.buildSwapChainForFill(
                occupyingPiece,
                currentPieceOriginalIdx,
                movePlan,
                processed
            );

            if (!recursiveResult) {
                return null;
            }

            // 合并结果
            const result = new Map<PuzzlePiece, number>();
            result.set(piece, targetIdx);
            for (const [p, idx] of recursiveResult) {
                result.set(p, idx);
            }
            return result;
        }

        // 目标位置为空，直接移动
        const result = new Map<PuzzlePiece, number>();
        result.set(piece, targetIdx);
        return result;
    }

    /**
     * 交换两个拼图块的位置
     */
    private swapPieces(piece1: PuzzlePiece, piece2: PuzzlePiece) {
        const isPiece1InGroup = this.isPieceInGroup(piece1);
        const isPiece2InGroup = this.isPieceInGroup(piece2);
        if (isPiece1InGroup || isPiece2InGroup) {
            console.warn(`[PuzzleManager] 禁止组内块与单个块交换：piece1=${piece1.correctIndex}（组内：${isPiece1InGroup}），piece2=${piece2.correctIndex}（组内：${isPiece2InGroup}）`);
            return;
        }
        const index1 = piece1.currentIndex;
        const index2 = piece2.currentIndex;

        piece1.moveToPosition(this.positions[index2], index2);
        piece2.moveToPosition(this.positions[index1], index1);

        // 延迟更新边框（等待动画完成）
        this.scheduleOnce(() => {
            this.updatePieceBorders();
        }, 0.35);
    }

    /**
     * 检查拼图是否完成
     */
    private checkComplete() {
        // 如果已经完成，不再检查
        if (this.isCompleted) {
            return;
        }

        let allCorrect = true;

        // 检查所有拼图块是否在正确位置
        // 重新计算每个拼图块的位置索引（基于实际位置）
        for (const piece of this.pieces) {
            // 找到拼图块实际所在的位置索引
            let actualIndex = -1;
            let minDist = Infinity;
            for (let i = 0; i < this.positions.length; i++) {
                const dist = Vec3.distance(piece.node.position, this.positions[i]);
                if (dist < minDist) {
                    minDist = dist;
                    actualIndex = i;
                }
            }

            // 如果位置很近，更新currentIndex
            if (actualIndex >= 0 && minDist < 50) {
                piece.currentIndex = actualIndex;
                piece.isInCorrectPosition = (actualIndex === piece.correctIndex);
            }

            if (!piece.isInCorrectPosition) {
                allCorrect = false;
            }
        }

        // 添加调试日志
        if (allCorrect) {
            console.log('[PuzzleManager] 拼图完成检测通过！');
            this.isCompleted = true;
            this.handlePuzzleComplete();
        } else {
            const status = this.pieces.map(p =>
                `Piece${p.correctIndex}: current=${p.currentIndex}, correct=${p.isInCorrectPosition}`
            ).join(', ');
        }
    }

    /**
     * 拼图完成处理
     */
    private handlePuzzleComplete() {
        console.log(`拼图完成！关卡 ${this.currentLevel}`);
        // 播放完成动画  先注释调 弹成功UI弹窗
        // this.playCompleteAnimation();
        if (this.onPuzzleComplete) {
            this.onPuzzleComplete(this.currentLevel);
        }
    }
    /**
     * 获取当前关卡的图片（用于成功弹窗显示）
     */
    public getCurrentLevelImage(): SpriteFrame | null {
        return this.currentImage || null;
    }

    /**
     * 获取当前关卡是否为困难模式
     */
    public isCurrentLevelHard(): boolean {
        if (!this.currentConfig) {
            return false;
        }
        return this.currentConfig.isHardTip === true;
    }
    /**
     * 进入下一关（由外部调用，例如成功弹窗的按钮点击后）
     */
    public nextLevel(): void {
        this.currentLevel++;
        const nextConfig = this.levelConfigs.find(c => c.level === this.currentLevel);
        if (!nextConfig) {
            console.log('所有关卡完成！');
            // 可以显示完成界面或重新开始
            return;
        }
        resources.load(nextConfig.imagePath, SpriteFrame, (err, spriteFrame) => {
            if (err) {
                console.error('加载图片失败:', err);
                console.error('路径:', nextConfig.imagePath);
                console.error('提示：请确保资源路径正确，且资源已正确导入到 resources 目录');
                return;
            }
            console.log('[PuzzleManager] 图片加载成功');
            this.startPuzzle(spriteFrame);
        });
    }
    /**
     * 播放完成动画
     */
    private playCompleteAnimation() {
        for (const piece of this.pieces) {
            piece.node.setScale(1.1, 1.1, 1);
            this.scheduleOnce(() => {
                piece.node.setScale(1, 1, 1);
            }, 0.2);
        }
    }


    /**
     * 清除所有拼图块
     */
    private clearPieces() {
        for (const piece of this.pieces) {
            piece.node.destroy();
        }
        this.pieces = [];
    }

    /**
     * 重新开始当前关卡
     */
    public restartLevel() {
        if (this.currentImage) {
            this.startPuzzle(this.currentImage);
        }
    }

    /**
     * 预加载所有关卡图片
     * @param onProgress 进度回调 (loaded, total)
     * @param onComplete 完成回调
     */
    public preloadAllImages(onProgress?: (loaded: number, total: number) => void, onComplete?: () => void): void {
        if (this.levelConfigs.length === 0) {
            console.warn('[PuzzleManager] 关卡配置为空，无法预加载图片');
            // 如果配置未加载，先加载配置，然后再预加载图片
            this.loadLevelConfigs();
            this.scheduleOnce(() => {
                this.preloadAllImages(onProgress, onComplete);
            }, 0.5);
            return;
        }

        const total = this.levelConfigs.length;
        let loaded = 0;
        let failed = 0;

        console.log(`[PuzzleManager] 开始预加载 ${total} 个关卡的图片资源...`);

        // 清空缓存
        this.imageCache.clear();

        // 遍历所有关卡配置，预加载图片
        for (const config of this.levelConfigs) {
            resources.load(config.imagePath, SpriteFrame, (err, spriteFrame) => {
                if (err) {
                    console.error(`[PuzzleManager] 预加载关卡 ${config.level} 图片失败:`, err);
                    console.error(`[PuzzleManager] 路径: ${config.imagePath}`);
                    failed++;
                } else {
                    // 缓存图片资源
                    this.imageCache.set(config.level, spriteFrame);
                    console.log(`[PuzzleManager] 预加载关卡 ${config.level} 图片成功`);
                }

                loaded++;

                // 更新进度
                if (onProgress) {
                    onProgress(loaded, total);
                }
                if (this.onPreloadProgress) {
                    this.onPreloadProgress(loaded, total);
                }

                // 所有资源加载完成
                if (loaded === total) {
                    console.log(`[PuzzleManager] 预加载完成！成功: ${total - failed}, 失败: ${failed}`);
                    if (onComplete) {
                        onComplete();
                    }
                    if (this.onPreloadComplete) {
                        this.onPreloadComplete();
                    }
                }
            });
        }
    }

    /**
     * 从缓存获取关卡图片
     * @param level 关卡编号
     */
    private getCachedImage(level: number): SpriteFrame | null {
        return this.imageCache.get(level) || null;
    }

    /**
     * 检查关卡图片是否已预加载
     * @param level 关卡编号
     */
    public isImagePreloaded(level: number): boolean {
        return this.imageCache.has(level);
    }

    /**
     * 获取预加载进度
     */
    public getPreloadProgress(): { loaded: number; total: number } {
        return {
            loaded: this.imageCache.size,
            total: this.levelConfigs.length
        };
    }

    /**
     * 更新所有拼图块的边框显示
     * 检测相邻拼图块是否相对位置正确，如果正确则隐藏相邻边
     */
    private updatePieceBorders(): void {
        if (this.pieces.length === 0 || this.currentRows === 0 || this.currentCols === 0 || this.adjacentMap.size === 0) {
            return;
        }

        // 使用Map跟踪每个拼图块的隐藏边状态
        const borderState = new Map<PuzzlePiece, { hideTop: boolean; hideBottom: boolean; hideLeft: boolean; hideRight: boolean }>();

        // 初始化所有拼图块的边框状态
        for (const piece of this.pieces) {
            if (!piece) {
                console.warn('[PuzzleManager] 发现空的拼图块，跳过');
                continue;
            }
            borderState.set(piece, { hideTop: false, hideBottom: false, hideLeft: false, hideRight: false });
        }

        // 验证初始化
        if (borderState.size !== this.pieces.length) {
            console.warn(`[PuzzleManager] 边框状态初始化不完整: borderState.size=${borderState.size}, pieces.length=${this.pieces.length}`);
        }

        // 遍历所有拼图块，检查它们的相邻关系
        for (const piece of this.pieces) {
            if (!piece) {
                continue;
            }

            const correctIndex = piece.correctIndex;
            const currentIndex = piece.currentIndex;

            // 获取该拼图块在正确位置时应该的相邻拼图块
            const adjacent = this.adjacentMap.get(correctIndex);
            if (!adjacent) {
                console.warn(`[PuzzleManager] 找不到 correctIndex=${correctIndex} 的相邻关系映射`);
                continue;
            }
            console.log(`拼图块 ${correctIndex} 当前位置 ${currentIndex}, 相邻关系:`, adjacent);

            // 计算当前拼图块在当前网格中的行列位置
            const currentRow = Math.floor(currentIndex / this.currentCols);
            const currentCol = currentIndex % this.currentCols;

            // 确保当前拼图块在 borderState 中
            if (!borderState.has(piece)) {
                console.warn(`[PuzzleManager] 拼图块 correctIndex=${correctIndex} 不在 borderState 中，重新添加`);
                borderState.set(piece, { hideTop: false, hideBottom: false, hideLeft: false, hideRight: false });
            }

            // 检查上方相邻的拼图块
            if (adjacent.top !== -1 && currentRow > 0) {
                const topIndex = currentIndex - this.currentCols;
                const topPiece = this.pieces.find(p => p?.currentIndex === topIndex);
                if (topPiece && topPiece.correctIndex === adjacent.top) {
                    // 确保 topPiece 在 borderState 中
                    if (!borderState.has(topPiece)) {
                        console.warn(`[PuzzleManager] topPiece correctIndex=${topPiece.correctIndex} 不在 borderState 中，重新添加`);
                        borderState.set(topPiece, { hideTop: false, hideBottom: false, hideLeft: false, hideRight: false });
                    }

                    // 上方是正确的相邻拼图块，隐藏相邻边
                    const state1 = borderState.get(piece);
                    const state2 = borderState.get(topPiece);
                    if (state1 && state2) {
                        state1.hideTop = true;
                        state2.hideBottom = true;
                    } else {
                        console.error(`[PuzzleManager] 边框状态未找到: piece=${piece?.correctIndex}, topPiece=${topPiece?.correctIndex}, state1=${!!state1}, state2=${!!state2}`);
                    }
                }
            }

            // 检查下方相邻的拼图块
            if (adjacent.bottom !== -1 && currentRow < this.currentRows - 1) {
                const bottomIndex = currentIndex + this.currentCols;
                const bottomPiece = this.pieces.find(p => p?.currentIndex === bottomIndex);
                if (bottomPiece && bottomPiece.correctIndex === adjacent.bottom) {
                    // 确保 bottomPiece 在 borderState 中
                    if (!borderState.has(bottomPiece)) {
                        console.warn(`[PuzzleManager] bottomPiece correctIndex=${bottomPiece.correctIndex} 不在 borderState 中，重新添加`);
                        borderState.set(bottomPiece, { hideTop: false, hideBottom: false, hideLeft: false, hideRight: false });
                    }

                    // 下方是正确的相邻拼图块，隐藏相邻边
                    const state1 = borderState.get(piece);
                    const state2 = borderState.get(bottomPiece);
                    if (state1 && state2) {
                        state1.hideBottom = true;
                        state2.hideTop = true;
                    } else {
                        console.error(`[PuzzleManager] 边框状态未找到: piece=${piece?.correctIndex}, bottomPiece=${bottomPiece?.correctIndex}, state1=${!!state1}, state2=${!!state2}`);
                    }
                }
            }

            // 检查左侧相邻的拼图块
            if (adjacent.left !== -1 && currentCol > 0) {
                const leftIndex = currentIndex - 1;
                const leftPiece = this.pieces.find(p => p?.currentIndex === leftIndex);
                if (leftPiece && leftPiece.correctIndex === adjacent.left) {
                    // 确保 leftPiece 在 borderState 中
                    if (!borderState.has(leftPiece)) {
                        console.warn(`[PuzzleManager] leftPiece correctIndex=${leftPiece.correctIndex} 不在 borderState 中，重新添加`);
                        borderState.set(leftPiece, { hideTop: false, hideBottom: false, hideLeft: false, hideRight: false });
                    }

                    // 左侧是正确的相邻拼图块，隐藏相邻边
                    const state1 = borderState.get(piece);
                    const state2 = borderState.get(leftPiece);
                    if (state1 && state2) {
                        state1.hideLeft = true;
                        state2.hideRight = true;
                    } else {
                        console.error(`[PuzzleManager] 边框状态未找到: piece=${piece?.correctIndex}, leftPiece=${leftPiece?.correctIndex}, state1=${!!state1}, state2=${!!state2}`);
                    }
                }
            }

            // 检查右侧相邻的拼图块
            if (adjacent.right !== -1 && currentCol < this.currentCols - 1) {
                const rightIndex = currentIndex + 1;
                const rightPiece = this.pieces.find(p => p?.currentIndex === rightIndex);
                if (rightPiece && rightPiece.correctIndex === adjacent.right) {
                    // 确保 rightPiece 在 borderState 中
                    if (!borderState.has(rightPiece)) {
                        console.warn(`[PuzzleManager] rightPiece correctIndex=${rightPiece.correctIndex} 不在 borderState 中，重新添加`);
                        borderState.set(rightPiece, { hideTop: false, hideBottom: false, hideLeft: false, hideRight: false });
                    }

                    // 右侧是正确的相邻拼图块，隐藏相邻边
                    const state1 = borderState.get(piece);
                    const state2 = borderState.get(rightPiece);
                    if (state1 && state2) {
                        state1.hideRight = true;
                        state2.hideLeft = true;
                    } else {
                        console.error(`[PuzzleManager] 边框状态未找到: piece=${piece?.correctIndex}, rightPiece=${rightPiece?.correctIndex}, state1=${!!state1}, state2=${!!state2}`);
                    }
                }
            }
        }

        // 应用边框状态到所有拼图块
        for (const [piece, state] of borderState) {
            piece.setHiddenEdges(state.hideTop, state.hideBottom, state.hideLeft, state.hideRight);
            console.log(`拼图块当前位置：${piece.correctIndex},拼块正确位置:${piece.correctIndex},
            隐藏边: top=${state.hideTop}, bottom=${state.hideBottom}, left=${state.hideLeft}, right=${state.hideRight}`);
        }
        // 更新边框后识别相邻组
        this.calculateConnectedGroups();
    }
}

