import { SpriteFrame, Sprite } from 'cc';

/**
 * Sprite 辅助工具类
 * 用于处理 Sprite 相关的常见问题
 */
export class SpriteHelper {
    /**
     * 禁用 SpriteFrame 的 Trim，保留圆角等透明边缘
     * @param spriteFrame 要处理的 SpriteFrame
     */
    public static disableTrim(spriteFrame: SpriteFrame): void {
        if (!spriteFrame) {
            console.warn('[SpriteHelper] SpriteFrame 为空');
            return;
        }
        
        // 注意：在 Cocos Creator 3.x 中，Trim 是 SpriteFrame 的属性
        // 但这是一个只读属性，需要在编辑器中设置
        // 这里只能提供检查和提示
        console.log('[SpriteHelper] 提示：Trim 设置需要在编辑器中修改');
        console.log('[SpriteHelper] 请选中图片资源，在属性检查器中取消勾选 "Trim" 选项');
    }

    /**
     * 设置 Sprite 组件以保留透明边缘（圆角）
     * @param sprite Sprite 组件
     */
    public static preserveTransparentEdges(sprite: Sprite): void {
        if (!sprite || !sprite.spriteFrame) {
            console.warn('[SpriteHelper] Sprite 或 SpriteFrame 为空');
            return;
        }

        // 确保 Sprite 类型为 SIMPLE（简单模式，不会裁剪）
        sprite.type = Sprite.Type.SIMPLE;
        
        // 确保使用原始尺寸（不裁剪）
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        
        console.log('[SpriteHelper] Sprite 已设置为保留透明边缘模式');
    }
}

