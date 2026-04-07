import { native, _decorator, Component, Node, sys, log, error, warn, director, Scene } from 'cc';
const { ccclass, property } = _decorator;

// 广告类型枚举
export enum CPAdType {
    AD_TYPE_OPEN = 10,          // 开屏广告
    AD_TYPE_NATIVE = 11,        // 原生广告（禁用）
    AD_TYPE_BANNER = 3,         // 横幅广告（禁用）
    AD_TYPE_INTERSTITIAL = 13,  // 插屏广告
    AD_TYPE_REWARD = 14         // 激励广告
}

// 广告事件枚举
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

// 回调类型定义
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
    private static readonly ANDROID_HELPER_CLASS = "com/sttn/bxvi/AAAC_TGSDocosHelper";
    private static _instance: SDKManager;
    // 回调存储
    private _initCallback: InitCallback | null = null;
    private _attributeCallback: AttributeCompletionCallback | null = null;
    private _mixCallback: mixCompletionCallback | null = null;
    private _adEventCallback: AdEventCallback | null = null;
    private _eibitCallback: EibitCallback | null = null;

    // 单例获取
    public static get instance(): SDKManager {
        // 1. 先检查是否已有实例
        if (this._instance) {
            return this._instance;
        }

        // 2. 全局搜索场景中是否已存在 SDKManager 节点（防止重复创建）
        const existingNode = director.getScene()?.getChildByName('SDKManager');
        if (existingNode) {
            this._instance = existingNode.getComponent(SDKManager);
            if (this._instance) {
                log('[SDKManager] 发现已存在的 SDKManager 实例，复用');
                return this._instance;
            } else {
                warn('[SDKManager] 发现 SDKManager 节点但未挂载组件，将重新创建');
                existingNode.destroy();
            }
        }

        const node = new Node('SDKManager');
        this._instance = node.addComponent(SDKManager);
        
        const currentScene = director.getScene();
        if (currentScene) {
            node.parent = currentScene;
            director.addPersistRootNode(node);
            log('[SDKManager] SDKManager 已挂载到场景并设置为常驻节点');
        } else {
            warn('[SDKManager] 当前没有场景，节点未挂载');
        }
        
        // 注册全局回调（安卓 -> TS），确保只注册一次
        this._instance.registerGlobalCallbacks();
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

    // ===================== 通用平台调用方法 =====================
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
            return null;
        }
        try {
            switch (args.length) {
                case 0: return native.reflection.callStaticMethod(className, methodName, signature);
                case 1: return native.reflection.callStaticMethod(className, methodName, signature, args[0]);
                case 2: return native.reflection.callStaticMethod(className, methodName, signature, args[0], args[1]);
                case 3: return native.reflection.callStaticMethod(className, methodName, signature, args[0], args[1], args[2]);
                default:
                    error(`调用安卓方法参数过多: ${className}.${methodName}`);
                    return null;
            }
        } catch (e) {
            error(`调用安卓方法失败: ${className}.${methodName}, 错误: ${(e as Error).message}`);
            return null;
        }
    }

    /**
     * 调用 iOS 静态方法（预留接口）
     * @param className 类名
     * @param methodName 方法名
     * @param signature 方法签名（iOS 可能需要不同的签名格式）
     * @param args 方法参数
     * @returns 方法返回值
     */
    private callIOSStaticMethod(
        className: string,
        methodName: string,
        signature: string,
        args: any[] = []
    ): any {
        if (sys.platform !== sys.Platform.IOS) {
            return null;
        }
        try {
            // iOS 预留接口
            return native.reflection.callStaticMethod(className, methodName, signature, args);
        } catch (e) {
            error(`调用 iOS 方法失败: ${className}.${methodName}, 错误: ${(e as Error).message}`);
            return null;
        }
    }

    // ===================== SDK 核心接口 =====================
    /**
     * 全量初始化 SDK
     */
    public CPAllInitSdk(callback: mixCompletionCallback) {
        this._mixCallback = callback;
        
        if (sys.platform === sys.Platform.ANDROID) {
            // Android 平台
            this.callAndroidStaticMethod(
                SDKManager.ANDROID_HELPER_CLASS,
                "Anncf_initSdkWithCombinedCallback",
                "()V"
            );
        } else if (sys.platform === sys.Platform.IOS) {
            // iOS 平台（预留接口）
            // TODO: 实现 iOS 初始化逻辑
            warn("[SDKManager] iOS 平台初始化暂未实现");
            // 模拟初始化失败
            this.scheduleOnce(() => {
                callback?.(false, "iOS platform not implemented");
            }, 0.1);
        } else {
            // 其他平台（编辑器、Web等）
            warn("[SDKManager] 非原生平台，跳过 SDK 初始化");
            this.scheduleOnce(() => {
                callback?.(false, "Not native platform");
            }, 0.1);
        }
    }

    /**
     * 初始化 SDK
     */
    public CPInitSdk(initCallback: InitCallback, attrCallback: AttributeCompletionCallback) {
        this._initCallback = initCallback;
        this._attributeCallback = attrCallback;
        
        if (sys.platform === sys.Platform.ANDROID) {
            // Android 平台
            this.callAndroidStaticMethod(
                SDKManager.ANDROID_HELPER_CLASS,
                "Anncf_initSdk",
                "()V"
            );
        } else if (sys.platform === sys.Platform.IOS) {
            // iOS 平台（预留接口）
            warn("[SDKManager] iOS 平台初始化暂未实现");
            this.scheduleOnce(() => {
                initCallback?.(false, "iOS platform not implemented");
            }, 0.1);
        } else {
            // 其他平台
            warn("[SDKManager] 非原生平台，跳过 SDK 初始化");
            this.scheduleOnce(() => {
                initCallback?.(false, "Not native platform");
            }, 0.1);
        }
    }

    /**
     * 加载广告
     */
    public CPLoadAD(adtype: CPAdType, eventListener: AdEventCallback) {
        this._adEventCallback = eventListener;
        
        if (sys.platform === sys.Platform.ANDROID) {
            // Android 平台
            switch (adtype) {
                case CPAdType.AD_TYPE_OPEN:
                    this.callAndroidStaticMethod(SDKManager.ANDROID_HELPER_CLASS, "Anncf_loadOpenAd", "()V");
                    break;
                case CPAdType.AD_TYPE_INTERSTITIAL:
                    this.callAndroidStaticMethod(SDKManager.ANDROID_HELPER_CLASS, "Anncf_loadInterstitialAd", "()V");
                    break;
                case CPAdType.AD_TYPE_REWARD:
                    this.callAndroidStaticMethod(SDKManager.ANDROID_HELPER_CLASS, "Anncf_loadRewardAd", "()V");
                    break;
                default:
                    warn(`未知广告类型: ${adtype}`);
                    break;
            }
        } else if (sys.platform === sys.Platform.IOS) {
            // iOS 平台（预留接口）
            warn(`[SDKManager] iOS 平台加载广告暂未实现: ${adtype}`);
            // TODO: 实现 iOS 加载广告逻辑
        } else {
            // 其他平台
            warn(`[SDKManager] 非原生平台，跳过广告加载: ${adtype}`);
        }
    }

    /**
     * 显示广告
     */
    public CPShowAd(adtype: CPAdType, placement: string = "default") {
        if (sys.platform === sys.Platform.ANDROID) {
            // Android 平台
            switch (adtype) {
                case CPAdType.AD_TYPE_OPEN:
                    this.callAndroidStaticMethod(
                        SDKManager.ANDROID_HELPER_CLASS,
                        // Cocos Java 反射建议使用 slash 包路径
                        "Anncf_showOpenAd",
                        "(Ljava/lang/String;)V",
                        [placement]
                    );
                    break;
                case CPAdType.AD_TYPE_INTERSTITIAL:
                    this.callAndroidStaticMethod(
                        SDKManager.ANDROID_HELPER_CLASS,
                        "Anncf_showInterstitialAd",
                        "(Ljava/lang/String;)V",
                        [placement]
                    );
                    break;
                case CPAdType.AD_TYPE_REWARD:
                    this.callAndroidStaticMethod(
                        SDKManager.ANDROID_HELPER_CLASS,
                        "Anncf_showRewardAd",
                        "(Ljava/lang/String;)V",
                        [placement]
                    );
                    break;
                default:
                    warn(`未知广告类型: ${adtype}`);
                    break;
            }
        } else if (sys.platform === sys.Platform.IOS) {
            // iOS 平台（预留接口）
            warn(`[SDKManager] iOS 平台显示广告暂未实现: ${adtype}`);
            // TODO: 实现 iOS 显示广告逻辑
        } else {
            // 其他平台
            warn(`[SDKManager] 非原生平台，跳过广告显示: ${adtype}`);
        }
    }

    /**
     * 检查广告是否就绪（解决 bool 字节对齐问题）
     */
    public IsAdReady(adtype: CPAdType): boolean {
        if (sys.platform === sys.Platform.ANDROID) {
            // Android 平台
            let result = 0;
            switch (adtype) {
                case CPAdType.AD_TYPE_OPEN:
                    result = this.callAndroidStaticMethod(
                        SDKManager.ANDROID_HELPER_CLASS,
                        "Anncf_isOpenAdReady",
                        "()I"
                    ) || 0;
                    break;
                case CPAdType.AD_TYPE_INTERSTITIAL:
                    result = this.callAndroidStaticMethod(
                        SDKManager.ANDROID_HELPER_CLASS,
                        "Anncf_isInterstitialAdReady",
                        "()I"
                    ) || 0;
                    break;
                case CPAdType.AD_TYPE_REWARD:
                    result = this.callAndroidStaticMethod(
                        SDKManager.ANDROID_HELPER_CLASS,
                        "Anncf_isRewardAdReady",
                        "()I"
                    ) || 0;
                    break;
                default:
                    return false;
            }
            // 转换 int 为 bool（0 = false，非0 = true）
            return (result & 0xFF) !== 0;
        } else if (sys.platform === sys.Platform.IOS) {
            return false;
        } else {
            return true;
        }
    }

    /**
     * 取消广告显示
     */
    public cancelAdShow(adtype: CPAdType) {
        if (sys.platform === sys.Platform.ANDROID) {
            switch (adtype) {
                case CPAdType.AD_TYPE_OPEN:
                    this.callAndroidStaticMethod(SDKManager.ANDROID_HELPER_CLASS, "Anncf_cancelOpenAdShow", "()V");
                    break;
                case CPAdType.AD_TYPE_INTERSTITIAL:
                    this.callAndroidStaticMethod(SDKManager.ANDROID_HELPER_CLASS, "Anncf_cancelInterstitialAdShow", "()V");
                    break;
                case CPAdType.AD_TYPE_REWARD:
                    this.callAndroidStaticMethod(SDKManager.ANDROID_HELPER_CLASS, "Anncf_cancelRewardAdShow", "()V");
                    break;
                default:
                    warn(`未知广告类型: ${adtype}`);
                    break;
            }
        } else if (sys.platform === sys.Platform.IOS) {
            warn(`[SDKManager] iOS 平台取消广告显示暂未实现: ${adtype}`);
        } else {
            warn(`[SDKManager] 非原生平台，跳过取消广告显示: ${adtype}`);
        }
    }

    /**
     * 埋点事件上报
     */
    public TrackEvent(eventName: string, properties: Record<string, any>) {
        if (sys.platform === sys.Platform.ANDROID) {
            // Android 平台
            try {
                const jsonData = JSON.stringify(properties);
                this.callAndroidStaticMethod(
                    SDKManager.ANDROID_HELPER_CLASS,
                    // 统计事件同样走反射，统一 className
                    "Anncf_trackReport",
                    "(Ljava/lang/String;Ljava/lang/String;)V",
                    [eventName, jsonData]
                );
            } catch (e) {
                warn(`埋点上报失败: ${(e as Error).message}`);
            }
        } else if (sys.platform === sys.Platform.IOS) {
            warn(`[SDKManager] iOS 平台埋点上报暂未实现: ${eventName}`);
        } else {
            log(`[SDKManager] Cocos平台，跳过埋点上报: ${eventName}`);
        }
    }

    /**
     * 显示网页
     */
    public Swp(title: string) {
        if (sys.platform === sys.Platform.ANDROID) {
            // Android 平台
            this.callAndroidStaticMethod(
                SDKManager.ANDROID_HELPER_CLASS,
                // 打开网页接口
                "Anncf_HSwp",
                "(Ljava/lang/String;)V",
                [title]
            );
        } else if (sys.platform === sys.Platform.IOS) {
            warn(`[SDKManager] iOS 平台显示网页暂未实现: ${title}`);
        } else {
            warn(`[SDKManager] Cocos平台，跳过显示网页: ${title}`);
        }
    }

    /**
     * 获取分组信息
     */
    public GetEibit(callback: EibitCallback) {
        this._eibitCallback = callback;
        
        if (sys.platform === sys.Platform.ANDROID) {
            // Android 平台
            this.callAndroidStaticMethod(
                SDKManager.ANDROID_HELPER_CLASS,
                // 获取分组接口
                "Anncf_cpGetEibit",
                "()V"
            );
        } else if (sys.platform === sys.Platform.IOS) {
            // iOS 平台（预留接口）
            warn("[SDKManager] iOS 平台获取分组信息暂未实现");
            // TODO: 实现 iOS 获取分组信息逻辑
            this.scheduleOnce(() => {
                callback?.({ t: "", tid: -1 });
            }, 0.1);
        } else {
            // 其他平台
            warn("[SDKManager] 非原生平台，跳过获取分组信息");
            this.scheduleOnce(() => {
                callback?.({ t: "", tid: -1 });
            }, 0.1);
        }
    }

    // 以下为占位接口
    public ShowProductPage(appleId: string, callback?: (success: boolean, msg: string) => void) {
        callback?.(true, "success");
    }

    public RequestNotificationPermissions() {
        log("安卓端暂不处理通知权限请求");
    }
}

// // 全局导出单例
// export const SDkManager = SDKManager.instance;