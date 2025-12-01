import { _decorator, Component, Node, Sprite, SpriteFrame, UITransform, Vec3, EventTouch, tween, Texture2D, Rect, Graphics, Color } from 'cc';
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
    private readonly BORDER_WIDTH = 3;
    private readonly BORDER_COLOR = new Color(30, 30, 30, 255);
    private readonly CORNER_RADIUS = 10;

    // 回调函数
    public onPositionChanged: (piece: PuzzlePiece, newIndex: number) => void = null;

    // 拼图网格信息（用于计算相邻关系）
    private rows: number = 0;
    private cols: number = 0;

    // 需要隐藏的边（true表示隐藏该边）
    private hideTop: boolean = false;
    private hideBottom: boolean = false;
    private hideLeft: boolean = false;
    private hideRight: boolean = false;

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
        maskGraphics.roundRect(-nodeTransform.width / 2, -nodeTransform.height / 2, nodeTransform.width, nodeTransform.height, 6);
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
        this.borderGraphics.lineWidth = this.BORDER_WIDTH;
        this.borderGraphics.strokeColor = this.BORDER_COLOR;

        // 绘制起点：根据未隐藏的边确定（优先从左上角开始）
        let startX = -halfW;
        let startY = -halfH;

        // 步骤1：移动到第一个未隐藏的边角
        if (!this.hideLeft && !this.hideTop) {
            // 左上角：有圆角，移动到圆角终点
            this.borderGraphics.moveTo(-halfW + radius, -halfH);
        } else if (!this.hideTop) {
            // 仅顶边显示，移动到顶边左侧起点
            this.borderGraphics.moveTo(-halfW, -halfH);
        } else if (!this.hideLeft) {
            // 仅左边显示，移动到左边顶部起点
            this.borderGraphics.moveTo(-halfW, -halfH + radius);
        } else {
            // 上下左右都隐藏，直接返回
            return;
        }

        // 步骤2：绘制顶边 + 右上角圆角
        if (!this.hideTop) {
            // 绘制顶边直线
            this.borderGraphics.lineTo(halfW - (this.hideRight ? 0 : radius), -halfH);
            // 绘制右上角圆角（仅当右边未隐藏时）
            if (!this.hideRight) {
                this.borderGraphics.arc(halfW - radius, -halfH + radius, radius, -Math.PI/2, 0, true);
            }
        }

        // 步骤3：绘制右边 + 右下角圆角
        if (!this.hideRight) {
            // 绘制右边直线
            this.borderGraphics.lineTo(halfW, halfH - (this.hideBottom ? 0 : radius));
            // 绘制右下角圆角（仅当底边未隐藏时）
            if (!this.hideBottom) {
                this.borderGraphics.arc(halfW - radius, halfH - radius, radius, 0, Math.PI/2, true);
            }
        }

        // 步骤4：绘制底边 + 左下角圆角
        if (!this.hideBottom) {
            // 绘制底边直线
            this.borderGraphics.lineTo(-halfW + (this.hideLeft ? 0 : radius), halfH);
            // 绘制左下角圆角（仅当左边未隐藏时）
            if (!this.hideLeft) {
                this.borderGraphics.arc(-halfW + radius, halfH - radius, radius, Math.PI/2, Math.PI, true);
            }
        }

        // 步骤5：绘制左边 + 左上角圆角
        if (!this.hideLeft) {
            // 绘制左边直线
            this.borderGraphics.lineTo(-halfW, -halfH + (this.hideTop ? 0 : radius));
            // 绘制左上角圆角（仅当顶边未隐藏时）
            if (!this.hideTop) {
                this.borderGraphics.arc(-halfW + radius, -halfH + radius, radius, Math.PI, -Math.PI/2, true);
            }
        }

        // 描边生效
        this.borderGraphics.stroke();
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
        if (!this.isDragging) return;
        this.isDragging = false;

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
     */
    public moveToPosition(position: Vec3, index: number, duration: number = 0.3) {
        this.currentIndex = index;
        this.isInCorrectPosition = (index === this.correctIndex);

        tween(this.node)
            .to(duration, { position: position }, { easing: 'sineOut' })
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
