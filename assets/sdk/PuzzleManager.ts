import { _decorator, Component, Node, Sprite, SpriteFrame, UITransform, Vec3, Prefab, instantiate, resources, JsonAsset } from 'cc';
import { PuzzlePiece } from './PuzzlePiece';
const { ccclass, property } = _decorator;

/**
 * 关卡配置接口
 */
interface LevelConfig {
    level: number;
    rows: number;
    cols: number;
    imagePath: string;
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
    
    // 完成回调
    public onPuzzleComplete: (level: number) => void = null;
    
    // 是否已完成（防止重复触发）
    private isCompleted: boolean = false;
    
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
    
    /**
     * 加载关卡配置JSON
     */
    private loadLevelConfigs() {
        resources.load('config/puzzle-levels', JsonAsset, (err, jsonAsset) => {
            if (err) {
                console.error('加载关卡配置失败:', err);
                this.loadDefaultConfig();
                return;
            }
            
            const data = jsonAsset.json as { levels: LevelConfig[] };
            if (data && data.levels && Array.isArray(data.levels)) {
                this.levelConfigs = data.levels;
                console.log('[PuzzleManager] 加载关卡配置成功，共', this.levelConfigs.length, '关');
            } else {
                console.error('[PuzzleManager] 关卡配置格式错误');
                this.loadDefaultConfig();
            }
        });
    }
    
    /**
     * 加载默认配置（如果JSON加载失败）
     */
    private loadDefaultConfig() {
        this.levelConfigs = [
            { level: 1, rows: 2, cols: 2, imagePath: 'images/puzzle/puzzle1/pic/spriteFrame' },
            { level: 2, rows: 3, cols: 3, imagePath: 'images/puzzle/puzzle2/pic/spriteFrame' },
            { level: 3, rows: 4, cols: 4, imagePath: 'images/puzzle/puzzle3/pic/spriteFrame' },
        ];
        console.log('[PuzzleManager] 使用默认关卡配置');
    }
    
    /**
     * 获取当前关卡配置
     */
    private getCurrentLevelConfig(): LevelConfig | null {
        if (this.levelConfigs.length === 0) {
            this.loadDefaultConfig();
        }
        
        const config = this.levelConfigs.find(c => c.level === this.currentLevel);
        if (!config && this.levelConfigs.length > 0) {
            // 如果找不到当前关卡，使用第一关的配置
            return this.levelConfigs[0];
        }
        return config || null;
    }
    
    /**
     * 初始化位置（根据rows和cols动态计算）
     */
    private initPositions(rows: number, cols: number) {
        if (!this.puzzleContainer) return;
        
        const uiTransform = this.puzzleContainer.getComponent(UITransform);
        if (!uiTransform) return;
        
        const width = uiTransform.width;
        const height = uiTransform.height;
        
        // 计算每个单元格的尺寸
        const cellWidth = width / cols;
        const cellHeight = height / rows;
        
        // 清空位置数组
        this.positions = [];
        
        // 计算所有位置
        // 索引布局（从左到右，从上到下）：
        // 0  1  2  ... (cols-1)
        // cols  cols+1  ... (2*cols-1)
        // ...
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
        
        // 初始化位置
        this.initPositions(this.currentConfig.rows, this.currentConfig.cols);
        
        // 创建拼图块
        this.clearPieces();
        this.createPieces(spriteFrame, this.currentConfig.rows, this.currentConfig.cols);
        this.shufflePieces();
    }
    
    /**
     * 创建拼图块（根据rows和cols动态创建）
     */
    private createPieces(spriteFrame: SpriteFrame, rows: number, cols: number) {
        if (!this.piecePrefab || !this.puzzleContainer || !this.currentConfig) return;
        
        const totalPieces = rows * cols;
        
        // 创建所有拼图块
        for (let i = 0; i < totalPieces; i++) {
            const pieceNode = instantiate(this.piecePrefab);
            pieceNode.parent = this.puzzleContainer;
            const piece = pieceNode.getComponent(PuzzlePiece);
            if (piece) {
                piece.init(spriteFrame, i, i, rows, cols);
                piece.onPositionChanged = (p, newIndex) => {
                    this.onPiecePositionChanged(p, newIndex);
                };
                this.pieces.push(piece);
            }
        }
        
        console.log(`[PuzzleManager] 创建了 ${totalPieces} 个拼图块 (${rows}x${cols})`);
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
        // let arr = [0,1,2,3];
        // for (let i = 0; i < this.pieces.length; i++) {
        //     const targetIndex = arr[i];
        //     this.pieces[i].setPosition(this.positions[targetIndex], targetIndex);
        //     console.log("节点名字：",this.pieces[i].node.name,"正确位置：",this.pieces[i].correctIndex,"当前位置：",this.pieces[i].currentIndex);
        // }
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
    }
    
    /**
     * 检查拼图块是否移动到其他位置
     */
    private checkPiecePosition(piece: PuzzlePiece) {
        let nearestIndex = -1;
        let minDistance = Infinity;
        
        for (let i = 0; i < this.positions.length; i++) {
            const distance = Vec3.distance(piece.node.position, this.positions[i]);
            if (distance < minDistance) {
                minDistance = distance;
                nearestIndex = i;
            }
        }
        
        if (nearestIndex >= 0 && minDistance < 100) {
            const targetPiece = this.pieces.find(p => p.currentIndex === nearestIndex && p !== piece);
            if (targetPiece) {
                // 交换位置
                this.swapPieces(piece, targetPiece);
                // 延迟检查完成（等待动画完成）
                this.scheduleOnce(() => {
                    this.checkComplete();
                }, 0.35);  // 略大于动画时长 0.3 秒
            } else if (piece.currentIndex !== nearestIndex) {
                piece.moveToPosition(this.positions[nearestIndex], nearestIndex);
                this.scheduleOnce(() => {
                    this.checkComplete();
                }, 0.35); 
            } else {
                this.checkComplete();
            }
        } else {
            piece.moveToPosition(this.positions[piece.currentIndex], piece.currentIndex);
        }
    }
    
    /**
     * 交换两个拼图块的位置
     */
    private swapPieces(piece1: PuzzlePiece, piece2: PuzzlePiece) {
        const index1 = piece1.currentIndex;
        const index2 = piece2.currentIndex;
        
        piece1.moveToPosition(this.positions[index2], index2);
        piece2.moveToPosition(this.positions[index1], index1);
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
            console.log('[PuzzleManager] 拼图未完成:', status);
        }
    }
    
    /**
     * 拼图完成处理
     */
    private handlePuzzleComplete() {
        console.log(`拼图完成！关卡 ${this.currentLevel}`);
        
        // 调用外部回调
        if (this.onPuzzleComplete) {
            this.onPuzzleComplete(this.currentLevel);
        }
        
        // 播放完成动画
        this.playCompleteAnimation();
        this.scheduleOnce(() => {
            this.nextLevel();
        }, 1);
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
    
    private nextLevel() {
        this.currentLevel++;
        const nextConfig = this.levelConfigs.find(c => c.level === this.currentLevel);
        if (!nextConfig) {
            console.log('所有关卡完成！');
            // 可以显示完成界面或重新开始
            return;
        }
        
        console.log(`[PuzzleManager] 进入第 ${this.currentLevel} 关: ${nextConfig.rows}x${nextConfig.cols}`);
        console.log('[PuzzleManager] 尝试加载图片:', nextConfig.imagePath);
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
}

