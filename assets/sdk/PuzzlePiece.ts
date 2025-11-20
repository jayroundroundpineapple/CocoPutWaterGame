import { _decorator, Component, Node, Sprite, SpriteFrame, UITransform, Vec3, EventTouch, tween, Texture2D, Rect } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 拼图块组件
 * 每个拼图块代表原图的一部分
 */
@ccclass('PuzzlePiece')
export class PuzzlePiece extends Component {
    @property(Sprite)
    private sprite: Sprite = null;
    
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
    
    // 回调函数
    public onPositionChanged: (piece: PuzzlePiece, newIndex: number) => void = null;
    
    /**
     * 初始化拼图块
     * @param spriteFrame 完整的图片SpriteFrame
     * @param index 拼图块索引 (0-3)
     * @param correctIndex 正确位置索引
     */
    public init(spriteFrame: SpriteFrame, index: number, correctIndex: number) {
        this.correctIndex = correctIndex;
        this.currentIndex = index;
        this.isInCorrectPosition = (index === correctIndex);
        
        // 创建裁剪后的SpriteFrame
        if (this.sprite && spriteFrame) {
            const croppedFrame = this.createCroppedSpriteFrame(spriteFrame, correctIndex);
            if (croppedFrame) {
                this.sprite.spriteFrame = croppedFrame;
            } else {
                // 如果裁剪失败，使用原图（临时方案）
                this.sprite.spriteFrame = spriteFrame;
            }
        }
        
        // 添加触摸事件
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }
    
    /**
     * 创建裁剪后的SpriteFrame（显示图片的一部分）
     * 索引布局：
     * 0 1
     * 2 3
     */
    private createCroppedSpriteFrame(originalFrame: SpriteFrame, index: number): SpriteFrame | null {
        if (!originalFrame || !originalFrame.texture) return null;
        const texture = originalFrame.texture; 
        const width = texture.width;
        const height = texture.height;
        
        // 计算裁剪区域（2x2网格）
        const col = index % 2;  // 列 (0或1)
        const row = Math.floor(index / 2);  // 行 (0或1)
        
        const cellWidth = width / 2;
        const cellHeight = height / 2;
        
        const x = col * cellWidth;
        const y = row * cellHeight;
        
        // 创建新的SpriteFrame
        const newFrame = new SpriteFrame();
        newFrame.texture = texture;
        
        // 设置裁剪区域（rect属性）
        // 注意：Cocos Creator 3.x 中，SpriteFrame的rect是相对于原始纹理的
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
