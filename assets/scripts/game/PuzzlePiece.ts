import { _decorator, Component, Node, Sprite, SpriteFrame, UITransform, Vec3, EventTouch, tween, Texture2D, Rect, Graphics, Color } from 'cc';
import { PuzzleManager } from './PuzzleManager';
import { AudioManager } from '../utils/AudioManager';
import { Utils } from '../utils/Utils';
const { ccclass, property } = _decorator;

/**
 * 拼图块组件
 * 每个拼图块代表原图的一部分
 */
@ccclass('PuzzlePiece')
export class PuzzlePiece extends Component {
    @property(Sprite)
    private sprite: Sprite = null;
    @property(Graphics)
    private borderGraphics: Graphics = null;
    @property(Node)
    private maskNode: Node = null;
    // 拼图块的正确位置索引 (0-3)
    public correctIndex: number = 0;

    // 当前所在的位置索引
    public currentIndex: number = 0;

    // 是否在正确位置
    public isInCorrectPosition: boolean = false;

    // 拖拽相关
    private isDragging: boolean = false;
    private dragOffset: Vec3 = new Vec3();
    private originalPosition: Vec3 = new Vec3();
    // 边框配置
    // private readonly BORDER_WIDTH = 3
    private BORDER_WIDTH: number = 6;   //竖屏是3 横屏是6
    private readonly BORDER_COLOR = new Color(30, 30, 30, 255);
    private readonly CORNER_RADIUS = 5;
    private readonly Puzzle_CORNER_RADIUS = 3;


    // 回调函数
    public onPositionChanged: (piece: PuzzlePiece, newIndex: number) => void = null;
    public onGroupDragStart: (piece: PuzzlePiece, event: EventTouch) => void = null;
    public onGroupDragMove: (piece: PuzzlePiece, event: EventTouch) => boolean = null;
    public onGroupDragEnd: (piece: PuzzlePiece, event: EventTouch) => boolean = null;
    // 拼图网格信息（用于计算相邻关系）
    private rows: number = 0;
    private cols: number = 0;

    // 需要隐藏的边（true表示隐藏该边）
    hideTop: boolean = false;
    hideBottom: boolean = false;
    hideLeft: boolean = false;
    hideRight: boolean = false;

    /**
     * 初始化拼图块
     * @param spriteFrame 完整的图片SpriteFrame
     * @param index 拼图块索引
     * @param correctIndex 正确位置索引
     * @param rows 行数
     * @param cols 列数
     */
    public init(spriteFrame: SpriteFrame, index: number, correctIndex: number, rows: number, cols: number) {
        this.node.name = "piecePuzzle" + correctIndex.toString();
        this.correctIndex = correctIndex;
        this.currentIndex = index;
        this.isInCorrectPosition = (index === correctIndex);
        this.rows = rows;
        this.cols = cols;

        // 重置边框状态
        this.hideTop = false;
        this.hideBottom = false;
        this.hideLeft = false;
        this.hideRight = false;

        // 创建裁剪后的SpriteFrame
        if (this.sprite && spriteFrame) {
            const croppedFrame = this.createCroppedSpriteFrame(spriteFrame, correctIndex, rows, cols);
            if (croppedFrame) {
                this.sprite.spriteFrame = croppedFrame;
            } else {
                this.sprite.spriteFrame = spriteFrame;
            }
            this.setupSpriteNode();
        }

        // 添加触摸事件（绑定到 PuzzlePiece 节点，确保整个节点都可以响应触摸）
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    /**
     * 设置 sprite 节点的属性，确保层级和大小正确
     */
    private setupSpriteNode(): void {
        if (!this.sprite || !this.sprite.node) return;
        const spriteNode = this.sprite.node;
        const nodeTransform = this.node.getComponent(UITransform);
        if (nodeTransform) {
            const spriteTransform = spriteNode.getComponent(UITransform);
            if (spriteTransform) {
                spriteTransform.width = nodeTransform.width;
                spriteTransform.height = nodeTransform.height;
                spriteTransform.setAnchorPoint(0.5, 0.5);
            }
            spriteNode.setPosition(0, 0, 0);
            spriteNode.setSiblingIndex(0);
        }
        this.maskNode.getComponent(UITransform).width = nodeTransform.width;
        this.maskNode.getComponent(UITransform).height = nodeTransform.height;
        const maskGraphics = this.maskNode.getComponent(Graphics);
        maskGraphics.roundRect(-nodeTransform.width / 2, -nodeTransform.height / 2, nodeTransform.width, nodeTransform.height, this.Puzzle_CORNER_RADIUS);
        maskGraphics.fillColor = new Color(30, 30, 30, 255);
        maskGraphics.fill();
        maskGraphics.stroke();

        // 绘制边框（根据隐藏状态）
        this.updateBorder();
    }
    /**
     * 更新边框显示（根据隐藏的边重新绘制）
     */
    private updateBorder(): void {
        if (!this.borderGraphics || !this.node.getComponent(UITransform)) return;

        const nodeTransform = this.node.getComponent(UITransform);
        const width = nodeTransform.width;
        const height = nodeTransform.height;
        const halfW = width / 2;
        const halfH = height / 2;
        const radius = this.CORNER_RADIUS;

        // 清空之前的绘制
        this.borderGraphics.clear();
        this.BORDER_WIDTH = Utils.isVertical() ? 3 : 5;
        this.borderGraphics.lineWidth = this.BORDER_WIDTH;
        this.borderGraphics.strokeColor = this.BORDER_COLOR;

        // 如果所有边都不隐藏，绘制完整圆角矩形
        if (!this.hideTop && !this.hideBottom && !this.hideLeft && !this.hideRight) {
            this.borderGraphics.roundRect(-halfW, -halfH, width, height, radius);
            this.borderGraphics.stroke();
            return;
        }

        // 构建连续的路径，按顺时针顺序绘制
        // 关键：当两个可见边之间有空隙（隐藏的边）时，使用 moveTo 跳转，避免出现对角线
        // 辅助函数：检查两个边是否相邻（在顺时针方向上）
        const isAdjacent = (edge1: string | null, edge2: string): boolean => {
            if (edge1 === null) return false;
            const order = ['top', 'right', 'bottom', 'left'];
            const idx1 = order.indexOf(edge1);
            const idx2 = order.indexOf(edge2);
            return (idx1 + 1) % 4 === idx2;
        };

        // 获取边的起点坐标
        // 当相邻边隐藏时，应该延伸到角落（用直线代替圆角）
        // 注意：顶边 y = halfH，底边 y = -halfH
        const getEdgeStart = (edge: string): { x: number; y: number } => {
            switch (edge) {
                case 'top':
                    return { x: this.hideLeft ? -halfW : -halfW + radius, y: halfH };
                case 'right':
                    return { x: halfW, y: this.hideTop ? halfH : halfH - radius };
                case 'bottom':
                    return { x: this.hideRight ? halfW : halfW - radius, y: -halfH };
                case 'left':
                    return { x: -halfW, y: this.hideBottom ? -halfH : -halfH + radius };
                default:
                    return { x: 0, y: 0 };
            }
        };

        const path: Array<{
            type: 'move' | 'line' | 'arc';
            x?: number; y?: number; cx?: number; cy?: number;
            r?: number; startAngle?: number; endAngle?: number; anticlockwise?: boolean
        }> = [];

        let lastEdge: string | null = null;
        let pathStarted = false;

        // 按顺时针顺序处理每条边：顶边 -> 右边 -> 底边 -> 左边
        const edges = [
            { name: 'top', hide: this.hideTop },
            { name: 'right', hide: this.hideRight },
            { name: 'bottom', hide: this.hideBottom },
            { name: 'left', hide: this.hideLeft }
        ];

        for (const edge of edges) {
            if (edge.hide) continue; // 跳过隐藏的边

            const edgeName = edge.name;
            const start = getEdgeStart(edgeName);

            if (!pathStarted) {
                // 第一条可见边，确定起始点
                pathStarted = true;
                if (edgeName === 'top' && !this.hideLeft) {
                    // 从左上角圆角开始（顶边，左边未隐藏）
                    path.push({ type: 'move', x: -halfW, y: halfH - radius });
                    path.push({ type: 'arc', cx: -halfW + radius, cy: halfH - radius, 
                        r: radius, startAngle: Math.PI, endAngle: Math.PI / 2, anticlockwise: false });
                } else if (edgeName === 'right' && !this.hideTop) {
                    // 从右上角圆角开始（右边，顶边未隐藏）
                    path.push({ type: 'move', x: halfW - radius, y: halfH });
                    path.push({ type: 'arc', cx: halfW - radius, cy: halfH - radius, 
                        r: radius, startAngle: Math.PI / 2, endAngle: 0, anticlockwise: false });
                } else if (edgeName === 'bottom' && !this.hideRight) {
                    // 从右下角圆角开始（底边，右边未隐藏）
                    path.push({ type: 'move', x: halfW, y: -halfH + radius });
                    path.push({ type: 'arc', cx: halfW - radius, cy: -halfH + radius, 
                        r: radius, startAngle: 0, endAngle: -Math.PI / 2, anticlockwise: false });
                } else if (edgeName === 'left' && !this.hideBottom) {
                    // 从左下角圆角开始（左边，底边未隐藏）
                    path.push({ type: 'move', x: -halfW + radius, y: -halfH });
                    path.push({ type: 'arc', cx: -halfW + radius, cy: -halfH + radius, 
                        r: radius, startAngle: -Math.PI / 2, endAngle: Math.PI, anticlockwise: false });
                } else {
                    // 相邻边隐藏，直接移动到起点
                    path.push({ type: 'move', x: start.x, y: start.y });
                }
            } else {
                // 不是第一条边，检查是否需要跳转
                if (!isAdjacent(lastEdge, edgeName)) {
                    // 需要跳转，使用 moveTo
                    path.push({ type: 'move', x: start.x, y: start.y });
                } else {
                    // 如果相邻，检查前一条边是否隐藏
                    // 如果前一条边隐藏，当前边需要从角落开始
                    const prevEdgeHidden =
                        (lastEdge === 'top' && this.hideTop) ||
                        (lastEdge === 'right' && this.hideRight) ||
                        (lastEdge === 'bottom' && this.hideBottom) ||
                        (lastEdge === 'left' && this.hideLeft);

                    if (prevEdgeHidden) {
                        // 前一条边隐藏，需要移动到当前边的起点（角落）
                        path.push({ type: 'move', x: start.x, y: start.y });
                    }
                    // 如果前一条边未隐藏，arc 已经将位置移到了正确位置，不需要额外操作
                }
            }
            if (edgeName === 'top') {
                // 顶边：如果右边隐藏，应该延伸到右上角；否则到圆角起点
                const endX = this.hideRight ? halfW : halfW - radius;
                path.push({ type: 'line', x: endX, y: halfH });
                // 如果右边未隐藏，绘制右上角圆角
                if (!this.hideRight) {
                    path.push({ type: 'arc', cx: halfW - radius, cy: halfH - radius, r: radius, startAngle: Math.PI / 2, endAngle: 0, anticlockwise: false });
                }
            } else if (edgeName === 'right') {
                // 右边：如果下边隐藏，应该延伸到右下角；否则到圆角起点
                const endY = this.hideBottom ? -halfH : -halfH + radius;
                path.push({ type: 'line', x: halfW, y: endY });
                // 如果下边未隐藏，绘制右下角圆角
                if (!this.hideBottom) {
                    path.push({ type: 'arc', cx: halfW - radius, cy: -halfH + radius, r: radius, startAngle: 0, endAngle: -Math.PI / 2, anticlockwise: false });
                }
            } else if (edgeName === 'bottom') {
                // 底边：如果左边隐藏，应该延伸到左下角；否则到圆角起点
                const endX = this.hideLeft ? -halfW : -halfW + radius;
                path.push({ type: 'line', x: endX, y: -halfH });
                // 如果左边未隐藏，绘制左下角圆角
                if (!this.hideLeft) {
                    path.push({ type: 'arc', cx: -halfW + radius, cy: -halfH + radius, r: radius, startAngle: -Math.PI / 2, endAngle: Math.PI, anticlockwise: false });
                }
            } else if (edgeName === 'left') {
                // 左边：如果上边隐藏，应该延伸到左上角；否则到圆角起点
                const endY = this.hideTop ? halfH : halfH - radius;
                path.push({ type: 'line', x: -halfW, y: endY });
                // 如果上边未隐藏，绘制左上角圆角
                if (!this.hideTop) {
                    path.push({ type: 'arc', cx: -halfW + radius, cy: halfH - radius, r: radius, startAngle: Math.PI, endAngle: Math.PI / 2, anticlockwise: false });
                }
            }

            lastEdge = edgeName;
        }

        // 执行路径绘制
        if (path.length > 0) {
            for (const cmd of path) {
                if (cmd.type === 'move') {
                    this.borderGraphics.moveTo(cmd.x!, cmd.y!);
                } else if (cmd.type === 'line') {
                    this.borderGraphics.lineTo(cmd.x!, cmd.y!);
                } else if (cmd.type === 'arc') {
                    this.borderGraphics.arc(cmd.cx!, cmd.cy!, cmd.r!, cmd.startAngle!, cmd.endAngle!, cmd.anticlockwise!);
                }
            }
            this.borderGraphics.stroke();
        }
    }

    /**
     * 设置需要隐藏的边
     * @param hideTop 隐藏上边
     * @param hideBottom 隐藏下边
     * @param hideLeft 隐藏左边
     * @param hideRight 隐藏右边
     */
    public setHiddenEdges(hideTop: boolean, hideBottom: boolean, hideLeft: boolean, hideRight: boolean): void {
        this.hideTop = hideTop;
        this.hideBottom = hideBottom;
        this.hideLeft = hideLeft;
        this.hideRight = hideRight;
        this.updateBorder();
    }

    /**
     * 获取拼图网格信息
     */
    public getRows(): number {
        return this.rows;
    }

    public getCols(): number {
        return this.cols;
    }

    /**
     * 创建裁剪后的SpriteFrame（显示图片的一部分）
     * @param originalFrame 原始SpriteFrame
     * @param index 拼图块索引（从左到右，从上到下）
     * @param rows 行数
     * @param cols 列数
     */
    private createCroppedSpriteFrame(originalFrame: SpriteFrame, index: number, rows: number, cols: number): SpriteFrame | null {
        if (!originalFrame || !originalFrame.texture) return null;
        const texture = originalFrame.texture;
        const width = texture.width;
        const height = texture.height;

        let currentCol = index % cols;  // 列索引 (0 到 cols-1)
        let currentRow = Math.floor(index / cols);  // 行索引 (0 到 rows-1)
        currentRow = rows - currentRow - 1;

        const cellWidth = width / cols;
        const cellHeight = height / rows;

        const x = currentCol * cellWidth;
        const y = currentRow * cellHeight;

        const newFrame = new SpriteFrame();
        newFrame.texture = texture;

        // 设置裁剪区域
        newFrame.rect = new Rect(x, height - y - cellHeight, cellWidth, cellHeight);
        return newFrame;
    }

    /**
     * 触摸开始
     */
    private onTouchStart(event: EventTouch) {
        const manager = this.node.parent.getComponent(PuzzleManager);
        // 如果正在动画中，禁止开始新的拖拽
        if (manager && manager.isAnimatingNow()) {
            this.isDragging = false;
            return;
        }
        
        const isInGroup = manager ? manager.isPieceInGroup(this) : false;
        if(this.onGroupDragStart) {
            this.onGroupDragStart(this, event);
        }
        if (isInGroup) {
            this.isDragging = false; // 禁止单个拖动
            return; // 直接返回，不执行后续拖动逻辑
        }
    
        this.isDragging = true;
        const touchPos = event.getUILocation();
        const worldPos = this.node.parent.getComponent(UITransform).convertToNodeSpaceAR(
            new Vec3(touchPos.x, touchPos.y, 0)
        );
        this.dragOffset = new Vec3(
            worldPos.x - this.node.position.x,
            worldPos.y - this.node.position.y,
            0
        );
        this.originalPosition = this.node.position.clone();

        // 提升层级，显示在最上层
        this.node.setSiblingIndex(this.node.parent.children.length - 1);
    }

    /**
     * 触摸移动
     */
    private onTouchMove(event: EventTouch) {
        const manager = this.node.parent.getComponent(PuzzleManager);
        const isInGroup = manager ? manager.isPieceInGroup(this) : false;
        if(this.onGroupDragMove && this.onGroupDragMove(this, event)) {
            return;
        }
        if (isInGroup) return;
        if (!this.isDragging) return;
        
        const touchPos = event.getUILocation();
        const worldPos = this.node.parent.getComponent(UITransform).convertToNodeSpaceAR(
            new Vec3(touchPos.x, touchPos.y, 0)
        );

        this.node.position = new Vec3(
            worldPos.x - this.dragOffset.x,
            worldPos.y - this.dragOffset.y,
            0
        );
    }

    /**
     * 触摸结束
     */
    private onTouchEnd(event: EventTouch) {
        const manager = this.node.parent.getComponent(PuzzleManager);
        const isInGroup = manager ? manager.isPieceInGroup(this) : false;
        if(this.onGroupDragEnd && this.onGroupDragEnd(this, event)) {
            return;
        }
        if (isInGroup) {
            this.isDragging = false;
            return;
        }
        if (!this.isDragging) return;
        this.isDragging = false;
        if(this.onGroupDragEnd && this.onGroupDragEnd(this, event)) {
            return;
        }
        // 检查是否移动到其他拼图块位置
        const touchPos = event.getUILocation();
        const worldPos = this.node.parent.getComponent(UITransform).convertToNodeSpaceAR(
            new Vec3(touchPos.x, touchPos.y, 0)
        );

        // 通知管理器检查位置交换
        if (this.onPositionChanged) {
            this.onPositionChanged(this, -1);  // -1表示需要检查位置
        }
    }

    /**
     * 移动到指定位置（带动画）
     * @param position 目标位置
     * @param index 目标索引
     * @param duration 动画时长
     * @param playSound 是否播放移动音效，默认 true
     */
    public moveToPosition(position: Vec3, index: number, duration: number = 0.3, playSound: boolean = true, cb: () => void = null) {
        // 检查位置是否真的改变了
        const positionChanged = this.currentIndex !== index;
        
        this.currentIndex = index;
        this.isInCorrectPosition = (index === this.correctIndex);

        // 如果位置改变了且需要播放音效，播放移动音效
        if (positionChanged && playSound) {
            AudioManager.getInstance().playMoveSound();
        }

        tween(this.node)
            .to(duration, { position: position }, { easing: 'sineOut' })
            .call(()=>{
                cb && cb();
            })
            .start();
    }

    /**
     * 设置位置（无动画）
     */
    public setPosition(position: Vec3, index: number) {
        this.currentIndex = index;
        this.isInCorrectPosition = (index === this.correctIndex);
        this.node.position = position;
    }

    /**
     * 检查是否在指定位置附近
     */
    public isNearPosition(position: Vec3, threshold: number = 50): boolean {
        const distance = Vec3.distance(this.node.position, position);
        return distance < threshold;
    }
}
