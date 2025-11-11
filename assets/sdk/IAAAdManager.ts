/**
 * IAA SDK Manager for Cocos Creator 3.8
 */

import { _decorator, Component, director, Node } from 'cc';
import { JSB } from 'cc/env';

const { ccclass, property } = _decorator;

/**
 * 广告类型枚举
 */
export enum AdType {
    AD_TYPE_Open = 10,
    AD_TYPE_Interstitial = 13,
    AD_TYPE_Reward = 14
}

/**
 * 广告事件枚举
 */
export enum AdEvent {
    Loaded = 1,          // 广告加载完成
    Displayed = 2,       // 广告展示
    Hidden = 3,          // 广告隐藏
    Clicked = 4,         // 广告点击
    LoadFailed = 5,      // 广告加载失败
    DisplayFailed = 6,  // 广告展示失败
    Rewarded = 7,        // 广告奖励
    LoadTimeout = 8,     // 广告加载超时
    InitNotCompleted = 9, // 广告未初始化完成
    Loading = 10,        // 广告加载中
    Revenue = 11         // 广告收入
}

/**
 * 回调函数类型定义
 */
type UserAttributeCallback = (attributed: boolean, info: string) => void;
type AdInitCallback = (initialized: boolean) => void;
type AdEventCallback = (adType: AdType, adEvent: AdEvent, error: string) => void;
type CheckWebCallback = (accessable: boolean) => void;
type ShowAppstoreCallback = (success: boolean) => void;

/**
 * IAA SDK Manager
 * 单例模式，管理 SDK 的初始化和调用
 */
@ccclass('IAAAdManager')
export class IAAAdManager extends Component {
    private static _instance: IAAAdManager = null;
    private static _userAttributeCallback: UserAttributeCallback = null;
    private static _adInitCallback: AdInitCallback = null;
    private static _adEventCallback: AdEventCallback = null;
    private static _checkWebCallback: CheckWebCallback = null;
    private static _showAppstoreCallback: ShowAppstoreCallback = null;

    /**
     * 获取单例实例
     */
    public static getInstance(): IAAAdManager {
        if (!IAAAdManager._instance) {
            const scene = director.getScene();
            if (scene) {
                const node = scene.getChildByName('IAAAdManager');
                if (node) {
                    IAAAdManager._instance = node.getComponent(IAAAdManager);
                } else {
                    // 创建新的节点和组件
                    const newNode = new Node('IAAAdManager');
                    IAAAdManager._instance = newNode.addComponent(IAAAdManager);
                    scene.addChild(newNode);
                }
            }
        }
        return IAAAdManager._instance;
    }

    onLoad() {
        if (IAAAdManager._instance && IAAAdManager._instance !== this) {
            this.destroy();
            return;
        }
        IAAAdManager._instance = this;
        director.addPersistRootNode(this.node);
    }

    /**
     * 初始化 SDK
     * @param userAttributeCallback 用户属性回调
     * @param adInitCallback 广告初始化回调
     */
    public static initSdk(
        userAttributeCallback: UserAttributeCallback,
        adInitCallback: AdInitCallback
    ): void {
        IAAAdManager._userAttributeCallback = userAttributeCallback;
        IAAAdManager._adInitCallback = adInitCallback;
        
        // 确保单例存在
        IAAAdManager.getInstance();
        
        // 调用原生接口
        if (JSB && (typeof jsb !== 'undefined')) {
            jsb.reflection.callStaticMethod(
                'IAAAdsBridge',
                'initSDK:adInitCallback:',
                userAttributeCallback,
                adInitCallback
            );
        } else {
            console.log('[IAAAdManager] InitSDK called in Editor. Skipping native call.');
        }
    }

    /**
     * 显示广告
     * @param adType 广告类型
     * @param placement 广告位
     * @param adEventCallback 广告事件回调
     */
    public static showAd(
        adType: AdType,
        placement: string,
        adEventCallback: AdEventCallback
    ): void {
        IAAAdManager._adEventCallback = adEventCallback;
        
        if (JSB && (typeof jsb !== 'undefined')) {
            jsb.reflection.callStaticMethod(
                'IAAAdsBridge',
                'showAd:placement:adEventCallback:',
                adType,
                placement,
                adEventCallback
            );
        } else {
            console.log(`[IAAAdManager] ShowAd called in Editor for type ${adType}. Skipping native call.`);
        }
    }

    /**
     * 检查是否可以打开网页
     * @param resultCallback 结果回调
     */
    public static checkOpenWebAccessable(resultCallback: CheckWebCallback): void {
        IAAAdManager._checkWebCallback = resultCallback;
        
        if (JSB && (typeof jsb !== 'undefined')) {
            jsb.reflection.callStaticMethod(
                'IAAAdsBridge',
                'checkOpenWebAccessable:',
                resultCallback
            );
        } else {
            console.log('[IAAAdManager] CheckOpenWebAccessable called in Editor. Skipping native call.');
        }
    }

    /**
     * 显示打开网页页面
     */
    public static showOpenWebPage(): void {
        if (JSB && (typeof jsb !== 'undefined')) {
            jsb.reflection.callStaticMethod('IAAAdsBridge', 'showOpenWebPage');
        } else {
            console.log('[IAAAdManager] ShowOpenWebPage called in Editor. Skipping native call.');
        }
    }

    /**
     * 取消广告显示
     * @param adType 广告类型
     */
    public static cancelAdShow(adType: AdType): void {
        if (JSB && (typeof jsb !== 'undefined')) {
            jsb.reflection.callStaticMethod('IAAAdsBridge', 'cancelAdShow:', adType);
        } else {
            console.log('[IAAAdManager] CancelAdShow called in Editor. Skipping native call.');
        }
    }

    /**
     * 判断广告是否准备好
     * @param adType 广告类型
     * @returns 是否准备好
     */
    public static isAdReady(adType: AdType): boolean {
        if (JSB && (typeof jsb !== 'undefined')) {
            return jsb.reflection.callStaticMethod('IAAAdsBridge', 'isAdReady:', adType) as boolean;
        } else {
            console.log('[IAAAdManager] IsAdReady called in Editor. Returning false.');
            return false;
        }
    }

    /**
     * 显示应用商店页面
     * @param resultCallback 结果回调
     */
    public static showAppstorePage(resultCallback: ShowAppstoreCallback): void {
        IAAAdManager._showAppstoreCallback = resultCallback;
        
        if (JSB && (typeof jsb !== 'undefined')) {
            jsb.reflection.callStaticMethod(
                'IAAAdsBridge',
                'showAppstorePage:',
                resultCallback
            );
        } else {
            console.log('[IAAAdManager] ShowAppstorePage called in Editor. Skipping native call.');
        }
    }

    /**
     * 记录传感器事件
     * @param eventName 事件名称
     * @param properties 事件属性
     */
    public static logSensorEvent(eventName: string, properties: Record<string, any>): void {
        if (JSB && (typeof jsb !== 'undefined')) {
            const propertiesJson = properties ? JSON.stringify(properties) : null;
            jsb.reflection.callStaticMethod(
                'IAAAdsBridge',
                'logSensorEvent:properties:',
                eventName,
                propertiesJson
            );
        } else {
            const propertiesJson = properties ? JSON.stringify(properties) : null;
            console.log(`[IAAAdManager] LogSensorEvent called in Editor for event ${eventName}.`, propertiesJson);
        }
    }

    /**
     * 应用进入游戏
     */
    public static applicationDidEnterGame(): void {
        if (JSB && (typeof jsb !== 'undefined')) {
            jsb.reflection.callStaticMethod('IAAAdsBridge', 'applicationDidEnterGame');
        } else {
            console.log('[IAAAdManager] ApplicationDidEnterGame called in Editor. Skipping native call.');
        }
    }

    /**
     * 获取 SDK 版本
     * @returns SDK 版本号
     */
    public static getSDKVersion(): string {
        if (JSB && (typeof jsb !== 'undefined')) {
            return jsb.reflection.callStaticMethod('IAAAdsBridge', 'getSDKVersion') as string;
        } else {
            return '1.0.0-editor';
        }
    }

    /**
     * 原生回调：用户属性结果
     * @param attributed 是否归因
     * @param info 信息
     */
    public static onUserAttributeResult(attributed: boolean, info: string): void {
        if (IAAAdManager._userAttributeCallback) {
            IAAAdManager._userAttributeCallback(attributed, info);
        }
    }

    /**
     * 原生回调：广告初始化结果
     * @param initialized 是否初始化成功
     */
    public static onAdInitResult(initialized: boolean): void {
        if (IAAAdManager._adInitCallback) {
            IAAAdManager._adInitCallback(initialized);
        }
    }

    /**
     * 原生回调：广告事件
     * @param adType 广告类型
     * @param adEvent 广告事件
     * @param error 错误信息
     */
    public static onAdEvent(adType: number, adEvent: number, error: string): void {
        if (IAAAdManager._adEventCallback) {
            IAAAdManager._adEventCallback(adType as AdType, adEvent as AdEvent, error);
        }
    }

    /**
     * 原生回调：检查网页可访问性结果
     * @param accessable 是否可访问
     */
    public static onCheckWebAccessableResult(accessable: boolean): void {
        if (IAAAdManager._checkWebCallback) {
            IAAAdManager._checkWebCallback(accessable);
        }
    }

    /**
     * 原生回调：显示应用商店结果
     * @param success 是否成功
     */
    public static onShowAppstoreResult(success: boolean): void {
        if (IAAAdManager._showAppstoreCallback) {
            IAAAdManager._showAppstoreCallback(success);
        }
    }
}

