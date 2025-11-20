import { IOS, JSB } from 'cc/env';
import { director, game, log } from 'cc';
import { AdEvent, AdType } from './ad-enums';

// 声明 JSB 原生函数（Cocos 3.x JSB 语法）
declare global {
    interface Window {
        iaacf_initSDK: (
            userAttrCb: (attributed: boolean, info: string) => void,
            adInitCb: (initialized: boolean) => void
        ) => void;

        iaacf_showAd: (
            adType: number,
            placement: string,
            adEventCb: (adType: number, adEvent: number, error: string) => void
        ) => void;

        // 检查网页访问权限
        iaacf_checkOpenWebAccessable: (cb: (accessable: boolean) => void) => void;

        // 显示网页
        iaacf_showOpenWebPage: () => void;

        // 取消广告展示
        iaacf_cancelAdShow: (adType: number) => void;

        // 检查广告是否就绪
        iaacf_isAdReady: (adType: number) => boolean;

        // 显示 AppStore 页面
        iaacf_showAppstorePage: (cb: (success: boolean) => void) => void;

        // 上报传感器事件
        iaacf_logSensorEvent: (eventName: string, propertiesJson: string) => void;

        // 应用进入游戏
        iaacf_applicationDidEnterGame: () => void;

        // 获取 SDK 版本
        iaacf_sdkVersion: () => string;
    }
}

/** 原生 SDK JSB 桥接层 */
export class IAACoreAdsBridge {
    // 事件回调（与原 C# 一致）
    public static OnUserAttributeResult: ((attributed: boolean, info: string) => void) | null = null;
    public static OnAdInitResult: ((initialized: boolean) => void) | null = null;
    public static OnAdEvent: ((type: AdType, evt: AdEvent, error: string) => void) | null = null;
    public static OnCheckWebAccessableResult: ((accessable: boolean) => void) | null = null;
    public static OnShowAppstoreResult: ((success: boolean) => void) | null = null;

    // 初始化 SDK
    public static InitSDK(): void {
        if (JSB && IOS) { // 仅 iOS 原生环境执行
            window.iaacf_initSDK(
                // 用户归因回调（原生调用 TS）
                (attributed, info) => {
                    this.dispatchToMainThread(() => {
                        this.OnUserAttributeResult?.call(null, attributed, info || '');
                    });
                },
                // 初始化结果回调（原生调用 TS）
                (initialized) => {
                    this.dispatchToMainThread(() => {
                        this.OnAdInitResult?.call(null, initialized);
                    });
                }
            );
        } else {
            log('[IAACoreAdsBridge] InitSDK: 非 iOS 原生环境，模拟回调');
            // 模拟异步回调：先用户归因，后初始化结果
            setTimeout(() => {
                this.dispatchToMainThread(() => {
                    this.OnUserAttributeResult?.call(null, true, '{"source":"editor","test":true}');
                });
            }, 100);
            setTimeout(() => {
                this.dispatchToMainThread(() => {
                    this.OnAdInitResult?.call(null, true);
                });
            }, 200);
        }
    }

    // 显示广告
    public static ShowAd(adType: AdType, placement: string): void {
        if (JSB && IOS) {
            window.iaacf_showAd(
                adType as number,
                placement || '',
                // 广告事件回调（原生调用 TS）
                (type, event, error) => {
                    this.dispatchToMainThread(() => {
                        this.OnAdEvent?.call(null, type as AdType, event as AdEvent, error || '');
                    });
                }
            );
        } else {
            log(`[IAACoreAdsBridge] ShowAd: 非 iOS 原生环境，跳过调用（类型：${adType}）`);
        }
    }

    // 检查网页访问权限
    public static CheckOpenWebAccessable(): void {
        if (JSB && IOS) {
            window.iaacf_checkOpenWebAccessable((accessable) => {
                this.dispatchToMainThread(() => {
                    this.OnCheckWebAccessableResult?.call(null, accessable);
                });
            });
        } else {
            log('[IAACoreAdsBridge] CheckOpenWebAccessable: 非 iOS 原生环境，跳过调用');
        }
    }

    // 显示网页
    public static ShowOpenWebPage(): void {
        if (JSB && IOS) {
            window.iaacf_showOpenWebPage();
        } else {
            log('[IAACoreAdsBridge] ShowOpenWebPage: 非 iOS 原生环境，跳过调用');
        }
    }

    // 取消广告展示
    public static CancelAdShow(adType: AdType): void {
        if (JSB && IOS) {
            window.iaacf_cancelAdShow(adType as number);
        } else {
            log(`[IAACoreAdsBridge] CancelAdShow: 非 iOS 原生环境，跳过调用（类型：${adType}）`);
        }
    }

    // 检查广告是否就绪
    public static IsAdReady(adType: AdType): boolean {
        if (JSB && IOS) {
            return window.iaacf_isAdReady(adType as number);
        } else {
            log(`[IAACoreAdsBridge] IsAdReady: 非 iOS 原生环境，返回 false（类型：${adType}）`);
            return false;
        }
    }

    // 显示 AppStore 页面
    public static ShowAppstorePage(): void {
        if (JSB && IOS) {
            window.iaacf_showAppstorePage((success) => {
                this.dispatchToMainThread(() => {
                    this.OnShowAppstoreResult?.call(null, success);
                });
            });
        } else {
            log('[IAACoreAdsBridge] ShowAppstorePage: 非 iOS 原生环境，跳过调用');
        }
    }

    // 上报传感器事件
    public static LogSensorEvent(eventName: string, properties: Record<string, any>): void {
        if (JSB && IOS) {
            const propertiesJson = properties ? JSON.stringify(properties) : '{}';
            window.iaacf_logSensorEvent(eventName || '', propertiesJson);
        } else {
            const propertiesJson = properties ? JSON.stringify(properties) : '{}';
            log(`[IAACoreAdsBridge] LogSensorEvent: 非 iOS 原生环境，事件：${eventName}，参数：${propertiesJson}`);
        }
    }

    // 应用进入游戏
    public static ApplicationDidEnterGame(): void {
        if (JSB && IOS) {
            window.iaacf_applicationDidEnterGame();
        } else {
            log('[IAACoreAdsBridge] ApplicationDidEnterGame: 非 iOS 原生环境，跳过调用');
        }
    }

    // 获取 SDK 版本
    public static GetSDKVersion(): string {
        if (JSB && IOS) {
            return window.iaacf_sdkVersion() || '1.0.0-ios';
        } else {
            log('[IAACoreAdsBridge] GetSDKVersion: 非 iOS 原生环境，返回模拟版本');
            return '1.0.0-editor';
        }
    }

    /** 确保回调在 Cocos 主线程执行 */
    private static dispatchToMainThread(cb: () => void): void {
        cb();
        // if (isMainThread) {
        //     cb();
        // } else {
        //     director.mainLoop.dispatch(cb); // Cocos 主线程调度
        // }
    }
}