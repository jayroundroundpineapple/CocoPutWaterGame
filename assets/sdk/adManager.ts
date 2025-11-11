import { AdType, AdEvent } from './ad-enums';
import { _decorator, Component, game, Node } from 'cc';
import { IAACoreAdsBridge } from './IAACoreAdsBridge';
const { ccclass, property } = _decorator;

/** 广告管理器*/
@ccclass('AdManager')
export class AdManager extends Component {
    // 单例模式（对应原 DontDestroyOnLoad）
    private static _instance: AdManager;
    public static get Instance(): AdManager {
        if (!this._instance) {
            const node = new Node('AdManager');
            game.addPersistRootNode(node); // 常驻内存（DontDestroyOnLoad）
            this._instance = node.addComponent(AdManager);
        }
        return this._instance;
    }

    // 回调存储
    private static _userAttributeCallback: ((attributed: boolean, info: string) => void) | null = null;
    private static _adInitCallback: ((initialized: boolean) => void) | null = null;
    private static _adEventCallback: ((type: AdType, evt: AdEvent, error: string) => void) | null = null;
    private static _checkWebCallback: ((accessable: boolean) => void) | null = null;
    private static _showAppstoreCallback: ((success: boolean) => void) | null = null;

    protected onLoad(): void {
        if (AdManager._instance && AdManager._instance !== this) {
            this.destroy();
            return;
        }
        AdManager._instance = this;
        this.registerNativeCallbacks(); // 注册原生回调转发
    }

    /** 注册原生回调，转发到 TS 外部回调 */
    private registerNativeCallbacks(): void {
        // 用户归因结果回调
        IAACoreAdsBridge.OnUserAttributeResult = (attributed, info) => {
            AdManager._userAttributeCallback?.call(null, attributed, info);
        };

        // 初始化结果回调
        IAACoreAdsBridge.OnAdInitResult = (initialized) => {
            AdManager._adInitCallback?.call(null, initialized);
        };

        // 广告事件回调
        IAACoreAdsBridge.OnAdEvent = (type, evt, error) => {
            AdManager._adEventCallback?.call(null, type, evt, error);
        };

        // 网页访问权限检查回调
        IAACoreAdsBridge.OnCheckWebAccessableResult = (accessable) => {
            AdManager._checkWebCallback?.call(null, accessable);
        };

        // AppStore 展示结果回调
        IAACoreAdsBridge.OnShowAppstoreResult = (success) => {
            AdManager._showAppstoreCallback?.call(null, success);
        };
    }

    public static InitSdk(
        userAttributeCallback: (attributed: boolean, info: string) => void,
        adInitCallback: (initialized: boolean) => void
    ): void {
        this._userAttributeCallback = userAttributeCallback;
        this._adInitCallback = adInitCallback;
        IAACoreAdsBridge.InitSDK();
    }

    public static ShowAd(
        adType: AdType,
        placement: string,
        adEventCallback: (type: AdType, evt: AdEvent, error: string) => void
    ): void {
        this._adEventCallback = adEventCallback;
        IAACoreAdsBridge.ShowAd(adType, placement);
    }

    public static CheckOpenWebAccessable(resultCallback: (accessable: boolean) => void): void {
        this._checkWebCallback = resultCallback;
        IAACoreAdsBridge.CheckOpenWebAccessable();
    }

    public static ShowOpenWebPage(): void {
        IAACoreAdsBridge.ShowOpenWebPage();
    }

    public static CancelAdShow(adType: AdType): void {
        IAACoreAdsBridge.CancelAdShow(adType);
    }

    public static IsAdReady(adType: AdType): boolean {
        return IAACoreAdsBridge.IsAdReady(adType);
    }

    public static ShowAppstorePage(resultCallback: (success: boolean) => void): void {
        this._showAppstoreCallback = resultCallback;
        IAACoreAdsBridge.ShowAppstorePage();
    }

    public static LogSensorEvent(eventName: string, properties: Record<string, any>): void {
        IAACoreAdsBridge.LogSensorEvent(eventName, properties);
    }

    public static ApplicationDidEnterGame(): void {
        IAACoreAdsBridge.ApplicationDidEnterGame();
    }

    public static GetSDKVersion(): string {
        return IAACoreAdsBridge.GetSDKVersion();
    }
}