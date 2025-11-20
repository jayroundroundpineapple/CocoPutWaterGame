import { _decorator, Component, Node, Sprite, SpriteFrame, UITransform, Vec3, Prefab, instantiate, resources } from 'cc';
import { PuzzlePiece } from './PuzzlePiece';
const { ccclass, property } = _decorator;

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
    
    // 位置数组（4个位置）
    private positions: Vec3[] = [];
    
    // 当前关卡
    private currentLevel: number = 1;
    
    // 图片资源列表（关卡图片）
    private imagePaths: string[] = [
        'images/puzzle/puzzle1/pic',
        'images/puzzle/puzzle2/pic',
        'images/puzzle/puzzle3/pic',
    ];
    
    // 完成回调
    public onPuzzleComplete: (level: number) => void = null;
    
    protected onLoad() {
        this.initPositions();
    }
    
    protected start() {
        if (this.currentImage) {
            this.startPuzzle(this.currentImage);
        }
    }
    
    /**
     * 初始化4个位置（2x2网格）
     */
    private initPositions() {
        if (!this.puzzleContainer) return;
        
        const uiTransform = this.puzzleContainer.getComponent(UITransform);
        if (!uiTransform) return;
        
        const width = uiTransform.width;
        const height = uiTransform.height;
        
        // 计算4个位置（2x2网格）
        const cellWidth = width / 2;
        const cellHeight = height / 2;
        
        // 位置布局：
        // 0 1
        // 2 3
        this.positions = [
            new Vec3(-cellWidth / 2, cellHeight / 2, 0),   // 左上 (0)
            new Vec3(cellWidth / 2, cellHeight / 2, 0),    // 右上 (1)
            new Vec3(-cellWidth / 2, -cellHeight / 2, 0),  // 左下 (2)
            new Vec3(cellWidth / 2, -cellHeight / 2, 0),  // 右下 (3)
        ];
    }
    
    /**
     * 开始拼图游戏
     */
    public startPuzzle(spriteFrame: SpriteFrame) {
        this.currentImage = spriteFrame;
        this.clearPieces();
        this.createPieces(spriteFrame);
        this.shufflePieces();
    }
    
    /**
     * 创建4个拼图块
     */
    private createPieces(spriteFrame: SpriteFrame) {
        if (!this.piecePrefab || !this.puzzleContainer) return;
        
        // 创建4个拼图块
        for (let i = 0; i < 4; i++) {
            const pieceNode = instantiate(this.piecePrefab);
            pieceNode.parent = this.puzzleContainer;
            const piece = pieceNode.getComponent(PuzzlePiece);
            if (piece) {
                piece.init(spriteFrame, i, i);
                piece.onPositionChanged = (p, newIndex) => {
                    this.onPiecePositionChanged(p, newIndex);
                };
                this.pieces.push(piece);
            }
        }
    }
    /**
     * 打乱拼图块位置
     */
    private shufflePieces() {
        const indices = [0, 1, 2, 3];
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
    }
    
    /**
     * 检查拼图块是否移动到其他位置
     */
    private checkPiecePosition(piece: PuzzlePiece) {
        // 找到最近的位置
        let nearestIndex = -1;
        let minDistance = Infinity;
        
        for (let i = 0; i < this.positions.length; i++) {
            const distance = Vec3.distance(piece.node.position, this.positions[i]);
            if (distance < minDistance) {
                minDistance = distance;
                nearestIndex = i;
            }
        }
        
        // 如果距离足够近，尝试交换位置
        if (nearestIndex >= 0 && minDistance < 100) {
            const targetPiece = this.pieces.find(p => p.currentIndex === nearestIndex);
            
            if (targetPiece && targetPiece !== piece) {
                // 交换位置
                this.swapPieces(piece, targetPiece);
            } else if (piece.currentIndex !== nearestIndex) {
                // 移动到空位置
                piece.moveToPosition(this.positions[nearestIndex], nearestIndex);
            }
            
            // 检查是否完成
            this.checkComplete();
        } else {
            // 距离太远，返回原位置
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
        let allCorrect = true;
        
        for (const piece of this.pieces) {
            if (!piece.isInCorrectPosition) {
                allCorrect = false;
                break;
            }
        }
        
        if (allCorrect) {
            this.handlePuzzleComplete();
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
        
        // 延迟后进入下一关
        this.scheduleOnce(() => {
            this.nextLevel();
        }, 1.5);
    }
    
    /**
     * 播放完成动画
     */
    private playCompleteAnimation() {
        // 可以添加闪烁、缩放等动画效果
        for (const piece of this.pieces) {
            // 简单的闪烁效果
            piece.node.setScale(1.1, 1.1, 1);
            this.scheduleOnce(() => {
                piece.node.setScale(1, 1, 1);
            }, 0.2);
        }
    }
    
    /**
     * 下一关
     */
    private nextLevel() {
        this.currentLevel++;
        
        // 加载下一张图片
        if (this.currentLevel <= this.imagePaths.length) {
            const imagePath = this.imagePaths[this.currentLevel - 1];
            resources.load(imagePath, SpriteFrame, (err, spriteFrame) => {
                if (err) {
                    console.error('加载图片失败:', err);
                    return;
                }
                this.startPuzzle(spriteFrame);
            });
        } else {
            console.log('所有关卡完成！');
            // 可以显示完成界面或重新开始
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
}

