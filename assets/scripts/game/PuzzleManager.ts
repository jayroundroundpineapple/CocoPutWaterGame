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
        this.updatePieceBorders();
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

        console.log(`[PuzzleManager] 创建了 ${totalPieces} 个拼图块 (${rows}x${cols})`);
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
            dragOffset
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

        // 步骤4：基于原始组内偏移（确保组内块相对位置不变）
        const originalCenter = this.calculateGroupCenter({
            pieces: group,
            originalPositions: this.currentDraggingGroup.originalPositions
        });
        const pieceOffsets = group.map((piece, idx) => {
            const originalPos = this.currentDraggingGroup.originalPositions[idx];
            return new Vec3(
                originalPos.x - originalCenter.x,
                originalPos.y - originalCenter.y,
                0
            );
        });

        // 步骤5：移动组内所有块（跟手优化，无延迟）
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

        const { pieces: group, originalPositions, originalIndices } = this.currentDraggingGroup;
        const containerTransform = this.puzzleContainer.getComponent(UITransform);

        // 步骤1：计算当前组中心（容器本地坐标）
        const groupCenter = this.calculateGroupCenter(group);

        // 步骤2：优化目标索引计算（基于组中心最近的网格，增加吸附阈值）
        const snapThreshold = 50; // 50像素内自动吸附到网格
        let referenceTargetIdx = -1;
        let minDistance = Infinity;

        for (let i = 0; i < this.positions.length; i++) {
            const dist = Vec3.distance(groupCenter, this.positions[i]);
            if (dist < minDistance && dist < snapThreshold) {
                minDistance = dist;
                referenceTargetIdx = i;
            }
        }

        // 步骤3：如果没有找到合适的吸附位置，恢复原始位置（避免飞出去后无法复位）
        if (referenceTargetIdx === -1) {
            this.restoreGroupPosition();
            return true;
        }

        // 步骤4：计算组内所有块的目标索引（确保不超出容器边界）
        const targetIndices = group.map((piece, idx) => {
            const originalIdx = originalIndices[idx];
            const indexOffset = referenceTargetIdx - originalIndices[0]; // 基于参考块的偏移
            const targetIdx = originalIdx + indexOffset;
            // 边界约束：目标索引必须在 0 ~ 总块数-1 之间
            return Math.max(0, Math.min(this.positions.length - 1, targetIdx));
        });

        // 步骤5：校验目标索引是否唯一（避免重叠）
        const uniqueIndices = new Set(targetIndices);
        if (uniqueIndices.size !== targetIndices.length) {
            this.restoreGroupPosition();
            return true;
        }

        // 步骤6：移动组到目标位置（带吸附动画，避免生硬）
        const moveSuccess = this.moveGroupToTarget(group, targetIndices);
        if (!moveSuccess) {
            this.restoreGroupPosition();
        }

        this.currentDraggingGroup = null;
        return true;
    }

    // 优化6：修正移动组到目标位置（动画时长缩短，避免拖沓）
    private moveGroupToTarget(group: PuzzlePiece[], targetIndices: number[]): boolean {
        if (group.length !== targetIndices.length) return false;

        const targetPieces: (PuzzlePiece | null)[] = targetIndices.map(idx =>
            this.pieces.find(p => p?.currentIndex === idx && p !== group.find(g => g.currentIndex === idx))
        );

        const groupOriginalIndices = group.map(p => p.currentIndex);

        // 缩短动画时长（0.2秒，更跟手）
        const moveDuration = 0.2;

        // 1. 移动组到目标位置
        for (let i = 0; i < group.length; i++) {
            const piece = group[i];
            const targetIdx = targetIndices[i];
            piece.moveToPosition(this.positions[targetIdx], targetIdx, moveDuration);
        }

        // 2. 移动目标位置的原有块到组的原始位置
        for (let i = 0; i < targetPieces.length; i++) {
            const targetPiece = targetPieces[i];
            if (targetPiece) {
                targetPiece.moveToPosition(
                    this.positions[groupOriginalIndices[i]],
                    groupOriginalIndices[i],
                    moveDuration
                );
            }
        }

        // 3. 延迟更新边框和组信息
        this.scheduleOnce(() => {
            this.updatePieceBorders();
            this.checkComplete();
        }, moveDuration);

        return true;
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

        // 计算所有块的平均位置（组中心）
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
     * 打乱拼图块位置
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
        // 将拼图块移动到随机位置
        for (let i = 0; i < this.pieces.length; i++) {
            const targetIndex = indices[i];
            this.pieces[i].setPosition(this.positions[targetIndex], targetIndex);
        }
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
        // 新增：当前块属于组 → 直接恢复原位置，禁止单个操作
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
        // 设置一个较小的阈值，如果移动距离很小，直接返回原位置
        const snapThreshold = 5;  // 如果距离原位置小于这个值，直接返回原位置
        // 设置一个检测阈值，用于判断是否应该交换或移动到新位置,小于这个值，才考虑交换或移动
        const detectThreshold = 80;

        if (nearestIndex >= 0 && minDistance < detectThreshold) {
            const targetPiece = this.pieces.find(p => p?.currentIndex === nearestIndex && p !== piece);
            // 新增：目标块属于组 → 禁止交换，恢复原位置
            const isTargetPieceInGroup = targetPiece ? this.isPieceInGroup(targetPiece) : false;
            if (isTargetPieceInGroup) {
                piece.moveToPosition(this.positions[piece.currentIndex], piece.currentIndex);
                this.scheduleOnce(() => {
                    this.updatePieceBorders();
                    this.checkComplete();
                }, 0.35);
                return;
            }
            if (targetPiece) {
                // 交换位置（swapPieces 内部会处理边框更新）
                this.swapPieces(piece, targetPiece);
                // 延迟检查完成（等待动画完成）
                this.scheduleOnce(() => {
                    this.checkComplete();
                }, 0.35);  // 略大于动画时长 0.3 秒
            } else if (piece.currentIndex !== nearestIndex) {
                // 移动到其他空位置
                piece.moveToPosition(this.positions[nearestIndex], nearestIndex);
                // 延迟更新边框和检查完成（等待动画完成）
                this.scheduleOnce(() => {
                    // this.updatePieceBorders();
                    this.checkComplete();
                }, 0.35);
            } else {
                // 最近位置就是当前位置
                // 如果距离原位置超过阈值，移回原位置；否则保持不动
                if (distanceToOriginal > snapThreshold) {
                    piece.moveToPosition(this.positions[piece.currentIndex], piece.currentIndex);
                    this.scheduleOnce(() => {
                        // this.updatePieceBorders();
                        this.checkComplete();
                    }, 0.35);
                } else {
                    // 距离很小，直接更新边框并检查完成（无需动画）
                    // this.updatePieceBorders();
                    this.checkComplete();
                }
            }
        } else {
            // 距离所有位置都很远，或者距离最近位置超过阈值，返回原位置
            if (distanceToOriginal > snapThreshold) {
                piece.moveToPosition(this.positions[piece.currentIndex], piece.currentIndex);
                this.scheduleOnce(() => {
                    // this.updatePieceBorders();
                    this.checkComplete();
                }, 0.35);
            } else {
                // 距离原位置很近，直接更新边框并检查完成（无需动画）
                // this.updatePieceBorders();
                this.checkComplete();
            }
        }
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

