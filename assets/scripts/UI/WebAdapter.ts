import { _decorator, Component, Node, view, Size, screen, ResolutionPolicy, Sprite, SpriteFrame, UITransform, Vec3 } from 'cc';
import { Utils } from '../utils/Utils';
const { ccclass, property } = _decorator;

@ccclass('WebAdapter')
export class WebAdapter extends Component {
    @property(Node)
    private bgNode: Node = null;
    @property(SpriteFrame)
    private bgSpriteFrame: SpriteFrame[]= [];
    @property(Node)
    private loadPage: Node = null;
    @property(SpriteFrame)
    private loadPageSpriteFrame: SpriteFrame[]= [];
    // 设计分辨率
    private readonly designWidth = 750;
    private readonly designHeight = 1334;
    
    // 防抖定时器
    private resizeTimer: any = null;

    protected onLoad(): void {
        this.resize();
        window.addEventListener('resize', this.onWindowResize.bind(this));
        window.addEventListener('orientationchange', this.onWindowResize.bind(this));
    }

    protected onDestroy(): void {
        window.removeEventListener('resize', this.onWindowResize.bind(this));
        window.removeEventListener('orientationchange', this.onWindowResize.bind(this));
        if (this.resizeTimer) {
            clearTimeout(this.resizeTimer);
        }
    }
    /** 窗口大小变化事件 */
    private onWindowResize(): void {
        if (this.resizeTimer) {
            clearTimeout(this.resizeTimer);
        }
        this.resizeTimer = setTimeout(() => {
            this.resize();
        }, 10);
    }

    /** 核心适配逻辑 */
    private resize(): void {
        const windowSize = screen.windowSize;
        const windowWidth = windowSize.width;
        const windowHeight = windowSize.height;
        const isVertical = windowHeight > windowWidth;
        const aspectRatio = windowWidth / windowHeight;
        // 0 = SHOW_ALL: 保持比例，完整显示（可能有黑边）
        // 1 = EXACT_FIT: 拉伸填满（可能变形）
        // 2 = FIXED_WIDTH: 固定宽度，高度自适应
        // 3 = FIXED_HEIGHT: 固定高度，宽度自适应
        // 4 = NO_BORDER: 无黑边，可能裁剪
        if (isVertical) {
            // 竖屏模式
            if (aspectRatio > 0.7) {
                // 宽高比大于 0.7，按高度适配
                view.setDesignResolutionSize(
                    this.designWidth, 
                    this.designHeight, 
                    ResolutionPolicy.FIXED_HEIGHT
                );
            } else {
                // 宽高比小于等于 0.7，按宽度适配
                view.setDesignResolutionSize(
                    this.designWidth, 
                    this.designHeight, 
                    ResolutionPolicy.FIXED_WIDTH
                );
            }
        } else {
            view.setDesignResolutionSize(
                this.designWidth, 
                this.designHeight, 
                ResolutionPolicy.FIXED_HEIGHT
            );
        }
        let isVerticalScreen: boolean = Utils.isVertical();
        this.bgNode.getComponent(Sprite).spriteFrame = this.bgSpriteFrame[isVerticalScreen ? 0 : 1];
        this.loadPage.getComponent(Sprite).spriteFrame = this.loadPageSpriteFrame[isVerticalScreen ? 0 : 1];
        this.loadPage.children[0].setScale(isVerticalScreen ? new Vec3(1, 1, 1) : new Vec3(1.5, 1.5, 1)); 
    }
}
