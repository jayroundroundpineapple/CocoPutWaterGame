import { native, _decorator, Component, Node, sys, log, error, warn, director, Scene } from 'cc';
const { ccclass, property } = _decorator;

// 广告类型枚举（和 Unity 保持一致）
export enum CPAdType {
    AD_TYPE_OPEN = 10,          // 开屏广告
    AD_TYPE_NATIVE = 11,        // 原生广告（禁用）
    AD_TYPE_BANNER = 3,         // 横幅广告（禁用）
    AD_TYPE_INTERSTITIAL = 13,  // 插屏广告
    AD_TYPE_REWARD = 14         // 激励广告
}

// 广告事件枚举（和 Unity 保持一致）
export enum CPAdEvent {
    Loaded = 1,              // 广告加载完成
    Displayed = 2,           // 广告展示完成
    Hidden = 3,              // 广告隐藏
    Clicked = 4,             // 广告被点击
    LoadFailed = 5,          // 广告加载失败
    DisplayFailed = 6,       // 广告展示失败
    Rewarded = 7,            // 广告激励回调（激励视频）
    LoadTimeout = 8,         // 广告加载超时
    InitNotCompleted = 9,    // 广告初始化未完成
    Loading = 10             // 广告加载中
}

// 回调类型定义（和 Unity 保持一致）
export type InitCallback = (success: boolean, msg: string) => void;
export type AttributeCompletionCallback = (isAttributed: boolean) => void;
export type mixCompletionCallback = (success: boolean, data: any) => void;
export type AdEventCallback = (adType: CPAdType, event: CPAdEvent, msg: string) => void;
export type EibitCallback = (data: { t: string, tid: number }) => void;

/**
 * SDK 管理单例（Cocos Creator 3.8）
 * 无需代理对象，直接调用安卓原生接口
 */
@ccclass('SDKManager')
export class SDKManager extends Component {
    private static _instance: SDKManager;
    // 回调存储
    private _initCallback: InitCallback | null = null;
    private _attributeCallback: AttributeCompletionCallback | null = null;
    private _mixCallback: mixCompletionCallback | null = null;
    private _adEventCallback: AdEventCallback | null = null;
    private _eibitCallback: EibitCallback | null = null;

    // 单例获取
    public static get instance(): SDKManager {
        if (!this._instance) {
            const node = new Node('SDKManager');
            this._instance = node.addComponent(SDKManager);
            
            // 获取当前场景并挂载节点
            const currentScene = director.getScene();
            if (currentScene) {
                node.parent = currentScene;
                // 设置为常驻节点
                director.addPersistRootNode(node);
                log('[SDKManager] SDKManager 已挂载到场景并设置为常驻节点');
            } else {
                warn('[SDKManager] 当前没有场景，节点未挂载');
            }
            
            // 注册全局回调（供安卓调用）
            this._instance.registerGlobalCallbacks();
        }
        return this._instance;
    }

    // 注册全局回调（安卓 -> TS）
    private registerGlobalCallbacks() {
        // 初始化回调
        window['onInitCallback'] = (msg: string) => {
            log(`SDK 初始化回调: ${msg}`);
            this._initCallback?.(msg === "success", msg);
        };

        // 归因回调
        window['onAttributeCallback'] = (data: string) => {
            const isAttributed = data === "1";
            log(`归因回调: ${isAttributed}`);
            this._attributeCallback?.(isAttributed);
        };

        // 混合初始化回调
        window['onMixResultCallback'] = (data: string) => {
            const success = data === "1";
            log(`混合初始化回调: ${success}`);
            this._mixCallback?.(success, data);
        };

        // 广告事件回调
        window['onAdEventCallback'] = (eventData: string) => {
            // eventData 格式：adType|adEvent
            const [adTypeStr, adEventStr] = eventData.split("|");
            const adType = parseInt(adTypeStr) as CPAdType;
            const adEvent = parseInt(adEventStr) as CPAdEvent;
            const adTypeName = CPAdType[adType] || `Unknown(${adType})`;
            const adEventName = CPAdEvent[adEvent] || `Unknown(${adEvent})`;
            log(`广告事件: ${adTypeName}, 事件: ${adEventName}`);
            this._adEventCallback?.(adType, adEvent, eventData);
        };

        // 分组信息回调
        window['onEibitCallback'] = (data: string) => {
            try {
                const eibitData = JSON.parse(data);
                log(`分组信息回调: ${JSON.stringify(eibitData)}`);
                this._eibitCallback?.(eibitData);
            } catch (e) {
                error(`分组信息解析失败: ${(e as Error).message}`);
                this._eibitCallback?.({ t: "", tid: -1 });
            }
        };
    }

    // ===================== 通用 JNI 调用方法 =====================
    /**
     * 调用安卓静态方法
     * @param className 类名（完整包名）
     * @param methodName 方法名
     * @param signature JNI 方法签名
     * @param args 方法参数
     * @returns 方法返回值
     */
    private callAndroidStaticMethod(
        className: string,
        methodName: string,
        signature: string,
        args: any[] = []
    ): any {
        if (sys.platform !== sys.Platform.ANDROID) {
            warn("非安卓平台，跳过原生方法调用");
            return null;
        }
        try {
            return native.reflection.callStaticMethod(className, methodName, signature, args);
        } catch (e) {
            error(`调用安卓方法失败: ${className}.${methodName}, 错误: ${(e as Error).message}`);
            return null;
        }
    }

    // ===================== SDK 核心接口 =====================
    /**
     * 全量初始化 SDK
     */
    public CPAllInitSdk(callback: mixCompletionCallback) {
        this._mixCallback = callback;
        this.callAndroidStaticMethod(
            "com.sttn.bxvi.AAAC_TGSDKUnityHelper",
            "Anncf_initSdkWithCombinedCallback",
            "()V"
        );
    }

    /**
     * 初始化 SDK
     */
    public CPInitSdk(initCallback: InitCallback, attrCallback: AttributeCompletionCallback) {
        this._initCallback = initCallback;
        this._attributeCallback = attrCallback;
        this.callAndroidStaticMethod(
            "com.sttn.bxvi.AAAC_TGSDKUnityHelper",
            "Anncf_initSdk",
            "()V"
        );
    }

    /**
     * 加载广告
     */
    public CPLoadAD(adtype: CPAdType, eventListener: AdEventCallback) {
        this._adEventCallback = eventListener;
        switch (adtype) {
            case CPAdType.AD_TYPE_OPEN:
                this.callAndroidStaticMethod("com.sttn.bxvi.AAAC_TGSDKUnityHelper", "Anncf_loadOpenAd", "()V");
                break;
            case CPAdType.AD_TYPE_INTERSTITIAL:
                this.callAndroidStaticMethod("com.sttn.bxvi.AAAC_TGSDKUnityHelper", "Anncf_loadInterstitialAd", "()V");
                break;
            case CPAdType.AD_TYPE_REWARD:
                this.callAndroidStaticMethod("com.sttn.bxvi.AAAC_TGSDKUnityHelper", "Anncf_loadRewardAd", "()V");
                break;
            default:
                warn(`未知广告类型: ${adtype}`);
                break;
        }
    }

    /**
     * 显示广告
     */
    public CPShowAd(adtype: CPAdType, placement: string = "default") {
        switch (adtype) {
            case CPAdType.AD_TYPE_OPEN:
                this.callAndroidStaticMethod(
                    "com.sttn.bxvi.AAAC_TGSDKUnityHelper",
                    "Anncf_showOpenAd",
                    "(Ljava/lang/String;)V",
                    [placement]
                );
                break;
            case CPAdType.AD_TYPE_INTERSTITIAL:
                this.callAndroidStaticMethod(
                    "com.sttn.bxvi.AAAC_TGSDKUnityHelper",
                    "Anncf_showInterstitialAd",
                    "(Ljava/lang/String;)V",
                    [placement]
                );
                break;
            case CPAdType.AD_TYPE_REWARD:
                this.callAndroidStaticMethod(
                    "com.sttn.bxvi.AAAC_TGSDKUnityHelper",
                    "Anncf_showRewardAd",
                    "(Ljava/lang/String;)V",
                    [placement]
                );
                break;
            default:
                warn(`未知广告类型: ${adtype}`);
                break;
        }
    }

    /**
     * 检查广告是否就绪（解决 bool 字节对齐问题）
     */
    public IsAdReady(adtype: CPAdType): boolean {
        let result = 0;
        switch (adtype) {
            case CPAdType.AD_TYPE_OPEN:
                result = this.callAndroidStaticMethod(
                    "com.sttn.bxvi.AAAC_TGSDKUnityHelper",
                    "Anncf_isOpenAdReady",
                    "()I"
                ) || 0;
                break;
            case CPAdType.AD_TYPE_INTERSTITIAL:
                result = this.callAndroidStaticMethod(
                    "com.sttn.bxvi.AAAC_TGSDKUnityHelper",
                    "Anncf_isInterstitialAdReady",
                    "()I"
                ) || 0;
                break;
            case CPAdType.AD_TYPE_REWARD:
                result = this.callAndroidStaticMethod(
                    "com.sttn.bxvi.AAAC_TGSDKUnityHelper",
                    "Anncf_isRewardAdReady",
                    "()I"
                ) || 0;
                break;
            default:
                return false;
        }
        // 转换 int 为 bool（0 = false，非0 = true）
        return (result & 0xFF) !== 0;
    }

    /**
     * 取消广告显示
     */
    public cancelAdShow(adtype: CPAdType) {
        switch (adtype) {
            case CPAdType.AD_TYPE_OPEN:
                this.callAndroidStaticMethod("com.sttn.bxvi.AAAC_TGSDKUnityHelper", "Anncf_cancelOpenAdShow", "()V");
                break;
            case CPAdType.AD_TYPE_INTERSTITIAL:
                this.callAndroidStaticMethod("com.sttn.bxvi.AAAC_TGSDKUnityHelper", "Anncf_cancelInterstitialAdShow", "()V");
                break;
            case CPAdType.AD_TYPE_REWARD:
                this.callAndroidStaticMethod("com.sttn.bxvi.AAAC_TGSDKUnityHelper", "Anncf_cancelRewardAdShow", "()V");
                break;
            default:
                warn(`未知广告类型: ${adtype}`);
                break;
        }
    }

    /**
     * 埋点事件上报
     */
    public TrackEvent(eventName: string, properties: Record<string, any>) {
        try {
            const jsonData = JSON.stringify(properties);
            this.callAndroidStaticMethod(
                "com.sttn.bxvi.AAAC_TGSDKUnityHelper",
                "Anncf_trackReport",
                "(Ljava/lang/String;Ljava/lang/String;)V",
                [eventName, jsonData]
            );
        } catch (e) {
            warn(`埋点上报失败: ${(e as Error).message}`);
        }
    }

    /**
     * 显示网页
     */
    public Swp(title: string) {
        this.callAndroidStaticMethod(
            "com.sttn.bxvi.AAAC_TGSDKUnityHelper",
            "Anncf_HSwp",
            "(Ljava/lang/String;)V",
            [title]
        );
    }

    /**
     * 获取分组信息
     */
    public GetEibit(callback: EibitCallback) {
        this._eibitCallback = callback;
        this.callAndroidStaticMethod(
            "com.sttn.bxvi.AAAC_TGSDKUnityHelper",
            "Anncf_cpGetEibit",
            "()V"
        );
    }

    // 以下为占位接口（和 Unity 保持一致）
    public ShowProductPage(appleId: string, callback?: (success: boolean, msg: string) => void) {
        callback?.(true, "success");
    }

    public RequestNotificationPermissions() {
        log("安卓端暂不处理通知权限请求");
    }
}

// 全局导出单例
export const sdkManager = SDKManager.instance;