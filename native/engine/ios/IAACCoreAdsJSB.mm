// IAACCoreAdsJSB.m
#import "IAACCoreAdsJSB.h"
#import "IAACInitManager.h"
#import "IAACHelper.h"
#import <PixelInsight/PixelInsight.h>
#include "cocos/bindings/jswrapper/SeApi.h"
#import <UIKit/UIKit.h>  // 新增：导入 UIKit 框架

// 全局变量：保存其他 JS 回调（广告事件、网页检查等）
static se::Value g_adEventCallback;
static se::Value g_checkWebCallback;
static se::Value g_showAppstoreCallback;

// --- JSB 注册函数实现（TS 调用的原生函数） ---
/** 1. 初始化 SDK（对应 TS 的 iaacf_initSDK） */
static bool js_iaacf_initSDK(se::State& s) {
    se::ValueArray args = s.args();
    if (args.size() != 2) {
        NSLog(@"[IAACoreAdsJSB] js_iaacf_initSDK: 参数错误（需 2 个回调）");
        return false;
    }
    
    // 保存 TS 回调到原生（se::Value 类型）
    IAACInitManager* manager = [IAACInitManager iaacf_shared];
    manager.userAttributeCallback = args[0]; // 用户归因回调
    manager.adInitCallback = args[1];       // 初始化回调
    
    NSLog(@"[IAACoreAdsJSB] js_iaacf_initSDK: 回调已保存");
    NSLog(@"_didFinishLaunchWithOptions == %d", manager.didFinishLaunchWithOptions);
    NSLog(@"_launchOptions == %@", manager.launchOptions);
    
    if (manager.didFinishLaunchWithOptions) {
        // 已完成 ApplicationDidFinishLaunch，直接初始化
        NSLog(@"[IAACoreAdsJSB] 直接初始化 SDK");
        [IAA_CoreAds iaa_initSDKWithLaunchOptions:manager.launchOptions
                          iaa_userAttributeResult:^(BOOL attributed, NSDictionary *info) {
            // 调用 TS 回调（与 IAACInitManager 中逻辑一致）
            DispatchToMainThread(^{
                se::ScriptEngine* seEngine = se::ScriptEngine::getInstance();
                if (!seEngine->isValid() || !manager.userAttributeCallback.isObject()) return;
                
                se::AutoHandleScope hs;
                se::Object* callbackObj = manager.userAttributeCallback.toObject();
                if (!callbackObj || !callbackObj->isFunction()) return;
                
                const char* infoJson = DictionaryToJSON(info);
                se::ValueArray args;
                args.resize(2);
                args[0].setBoolean(attributed);
                args[1].setString(infoJson ? infoJson : "");
                
                se::Value result;
                if (!callbackObj->call(args, nullptr, &result)) {
                    NSLog(@"[IAACoreAdsJSB] 调用用户归因 TS 回调失败");
                    seEngine->clearException();
                }
                
                if (infoJson) free((void*)infoJson);
            });
        } iaa_adInitResult:^(BOOL initialized) {
            DispatchToMainThread(^{
                se::ScriptEngine* seEngine = se::ScriptEngine::getInstance();
                if (!seEngine->isValid() || !manager.adInitCallback.isObject()) return;
                
                se::AutoHandleScope hs;
                se::Object* callbackObj = manager.adInitCallback.toObject();
                if (!callbackObj || !callbackObj->isFunction()) return;
                
                se::ValueArray args;
                args.resize(1);
                args[0].setBoolean(initialized);
                
                se::Value result;
                if (!callbackObj->call(args, nullptr, &result)) {
                    NSLog(@"[IAACoreAdsJSB] 调用初始化结果 TS 回调失败");
                    seEngine->clearException();
                }
            });
        }];
        return true;
    }
    
    // 未完成 ApplicationDidFinishLaunch，监听通知
    NSLog(@"[IAACoreAdsJSB] 监听 ApplicationDidFinishLaunch 通知");
    [[NSNotificationCenter defaultCenter] addObserver:manager
                                             selector:@selector(initSDKWhileAppDidFinishLaunch:)
                                                 name:UIApplicationDidFinishLaunchingNotification
                                               object:nil];
    return true;
}
SE_BIND_FUNC(js_iaacf_initSDK)

/** 2. 显示广告（对应 TS 的 iaacf_showAd） */
static bool js_iaacf_showAd(se::State& s) {
    se::ValueArray args = s.args();
    if (args.size() != 3) {
        NSLog(@"[IAACoreAdsJSB] js_iaacf_showAd: 参数错误（需 3 个参数）");
        return false;
    }
    
    // 解析参数：adType（int）、placement（string）、adEventCallback（function）
    int adType = args[0].toInt32();
    NSString* placement = SeValueToNSString(args[1]);
    g_adEventCallback = args[2];
    
    NSLog(@"[IAACoreAdsJSB] js_iaacf_showAd: 类型=%d，placement=%@", adType, placement);
    
    // 调用原生 SDK 显示广告
    [IAA_CoreAds iaa_showAd:(IAA_AdType)adType
         iaa_fromPlacement:placement
                     iaa_Event:^(IAA_AdType type, IAA_AdEvent event, NSError *error) {
        // 调用 TS 广告事件回调
        DispatchToMainThread(^{
            se::ScriptEngine* seEngine = se::ScriptEngine::getInstance();
            if (!seEngine->isValid() || !g_adEventCallback.isObject()) return;
            
            se::AutoHandleScope hs;
            se::Object* callbackObj = g_adEventCallback.toObject();
            if (!callbackObj || !callbackObj->isFunction()) return;
            
            // 准备参数：adType（int）、adEvent（int）、errorJson（string）
            NSDictionary* errorDict = error ? @{@"message": error.localizedDescription} : nil;
            const char* errorJson = DictionaryToJSON(errorDict);
            
            se::ValueArray args;
            args.resize(3);
            args[0].setInt32((int)type);
            args[1].setInt32((int)event);
            args[2].setString(errorJson ? errorJson : "");
            
            // 执行 TS 回调
            se::Value result;
            if (!callbackObj->call(args, nullptr, &result)) {
                NSLog(@"[IAACoreAdsJSB] 调用广告事件 TS 回调失败");
                seEngine->clearException();
            }
            
            // 释放内存
            if (errorJson) free((void*)errorJson);
        });
    }];
    return true;
}
SE_BIND_FUNC(js_iaacf_showAd)

/** 3. 检查网页访问权限（对应 TS 的 iaacf_checkOpenWebAccessable） */
static bool js_iaacf_checkOpenWebAccessable(se::State& s) {
    se::ValueArray args = s.args();
    if (args.size() != 1) {
        NSLog(@"[IAACoreAdsJSB] js_iaacf_checkOpenWebAccessable: 参数错误（需 1 个回调）");
        return false;
    }
    
    g_checkWebCallback = args[0];
    NSLog(@"[IAACoreAdsJSB] js_iaacf_checkOpenWebAccessable: 回调已保存");
    
    // 调用原生 SDK 检查权限
    [IAA_CoreAds iaa_checkOpenWebAccessable:^(BOOL accessable) {
        DispatchToMainThread(^{
            se::ScriptEngine* seEngine = se::ScriptEngine::getInstance();
            if (!seEngine->isValid() || !g_checkWebCallback.isObject()) return;
            
            se::AutoHandleScope hs;
            se::Object* callbackObj = g_checkWebCallback.toObject();
            if (!callbackObj || !callbackObj->isFunction()) return;
            
            se::ValueArray args;
            args.resize(1);
            args[0].setBoolean(accessable);
            
            se::Value result;
            if (!callbackObj->call(args, nullptr, &result)) {
                NSLog(@"[IAACoreAdsJSB] 调用网页权限 TS 回调失败");
                seEngine->clearException();
            }
        });
    }];
    return true;
}
SE_BIND_FUNC(js_iaacf_checkOpenWebAccessable)

/** 4. 显示网页（对应 TS 的 iaacf_showOpenWebPage） */
static bool js_iaacf_showOpenWebPage(se::State& s) {
    NSLog(@"[IAACoreAdsJSB] js_iaacf_showOpenWebPage: 调用原生接口");
    [IAA_CoreAds iaa_checkOpenWebAccessable:^(BOOL accessable) {
        if (accessable) {
            [IAA_CoreAds iaa_showOpenWebPage];
        }
    }];
    return true;
}
SE_BIND_FUNC(js_iaacf_showOpenWebPage)

/** 5. 取消广告展示（对应 TS 的 iaacf_cancelAdShow） */
static bool js_iaacf_cancelAdShow(se::State& s) {
    se::ValueArray args = s.args();
    if (args.size() != 1) {
        NSLog(@"[IAACoreAdsJSB] js_iaacf_cancelAdShow: 参数错误（需 1 个广告类型）");
        return false;
    }
    
    int adType = args[0].toInt32();
    NSLog(@"[IAACoreAdsJSB] js_iaacf_cancelAdShow: 类型=%d", adType);
    [IAA_CoreAds iaa_cancelShowAd:adType];
    return true;
}
SE_BIND_FUNC(js_iaacf_cancelAdShow)

/** 6. 检查广告是否就绪（对应 TS 的 iaacf_isAdReady） */
static bool js_iaacf_isAdReady(se::State& s) {
    se::ValueArray args = s.args();
    if (args.size() != 1) {
        NSLog(@"[IAACoreAdsJSB] js_iaacf_isAdReady: 参数错误（需 1 个广告类型）");
        s.rval().setBoolean(false);
        return false;
    }
    
    int adType = args[0].toInt32();
    BOOL ready = [IAA_CoreAds iaa_adIsReadyForType:adType];
    NSLog(@"[IAACoreAdsJSB] js_iaacf_isAdReady: 类型=%d，就绪状态=%d", adType, ready);
    s.rval().setBoolean(ready); // 返回结果给 TS
    return true;
}
SE_BIND_FUNC(js_iaacf_isAdReady)

/** 7. 显示 AppStore 页面（对应 TS 的 iaacf_showAppstorePage） */
static bool js_iaacf_showAppstorePage(se::State& s) {
    se::ValueArray args = s.args();
    if (args.size() != 1) {
        NSLog(@"[IAACoreAdsJSB] js_iaacf_showAppstorePage: 参数错误（需 1 个回调）");
        return false;
    }
    
    g_showAppstoreCallback = args[0];
    NSLog(@"[IAACoreAdsJSB] js_iaacf_showAppstorePage: 回调已保存");
    
    [IAA_CoreAds iaa_showAppstorePageWithResultCallback:^(BOOL success) {
        DispatchToMainThread(^{
            se::ScriptEngine* seEngine = se::ScriptEngine::getInstance();
            if (!seEngine->isValid() || !g_showAppstoreCallback.isObject()) return;
            
            se::AutoHandleScope hs;
            se::Object* callbackObj = g_showAppstoreCallback.toObject();
            if (!callbackObj || !callbackObj->isFunction()) return;
            
            se::ValueArray args;
            args.resize(1);
            args[0].setBoolean(success);
            
            se::Value result;
            if (!callbackObj->call(args, nullptr, &result)) {
                NSLog(@"[IAACoreAdsJSB] 调用 AppStore 展示 TS 回调失败");
                seEngine->clearException();
            }
        });
    }];
    return true;
}
SE_BIND_FUNC(js_iaacf_showAppstorePage)

/** 8. 上报传感器事件（对应 TS 的 iaacf_logSensorEvent） */
static bool js_iaacf_logSensorEvent(se::State& s) {
    se::ValueArray args = s.args();
    if (args.size() != 2) {
        NSLog(@"[IAACoreAdsJSB] js_iaacf_logSensorEvent: 参数错误（需 2 个参数）");
        return false;
    }
    
    NSString* eventName = SeValueToNSString(args[0]);
    const char* propertiesJson = args[1].toString().c_str();
    NSDictionary* properties = JSONToDictionary(propertiesJson);
    
    NSLog(@"[IAACoreAdsJSB] js_iaacf_logSensorEvent: 事件=%@，参数=%@", eventName, properties);
    [IAA_CoreAds iaa_logSensorEvent:eventName iaa_properties:properties];
    return true;
}
SE_BIND_FUNC(js_iaacf_logSensorEvent)

/** 9. 应用进入游戏（对应 TS 的 iaacf_applicationDidEnterGame） */
static bool js_iaacf_applicationDidEnterGame(se::State& s) {
    NSLog(@"[IAACoreAdsJSB] js_iaacf_applicationDidEnterGame: 调用原生接口");
    [IAA_CoreAds iaa_applicationDidEnterGame];
    return true;
}
SE_BIND_FUNC(js_iaacf_applicationDidEnterGame)

/** 10. 获取 SDK 版本（对应 TS 的 iaacf_sdkVersion） */
static bool js_iaacf_sdkVersion(se::State& s) {
    NSString* version = [IAA_CoreAds iaa_sdkVersion];
    const char* cVersion = CStringCopy(version);
    s.rval().setString(cVersion ? cVersion : "1.0.0-unknown");
    if (cVersion) free((void*)cVersion);
    NSLog(@"[IAACoreAdsJSB] js_iaacf_sdkVersion: 版本=%@", version);
    return true;
}
SE_BIND_FUNC(js_iaacf_sdkVersion)

/** 注册所有 JSB 函数到 TS 全局对象（window） */
void register_IAACCoreAdsBridge(se::Object* global) {
    NSLog(@"[IAACoreAdsJSB] ========== register_IAACCoreAdsBridge 开始 ==========");
    NSLog(@"[IAACoreAdsJSB] 当前线程：%@，是否主线程：%d", [NSThread currentThread], [NSThread isMainThread]);
    
    if (!global) {
        NSLog(@"[IAACoreAdsJSB] ERROR: global 对象为 null！");
        return;
    }
    
    // 注册初始化函数
    NSLog(@"[IAACoreAdsJSB] 注册 iaacf_initSDK...");
    global->defineFunction("iaacf_initSDK", _SE(js_iaacf_initSDK));
    // 注册显示广告函数
    global->defineFunction("iaacf_showAd", _SE(js_iaacf_showAd));
    // 注册检查网页权限函数
    global->defineFunction("iaacf_checkOpenWebAccessable", _SE(js_iaacf_checkOpenWebAccessable));
    // 注册显示网页函数
    global->defineFunction("iaacf_showOpenWebPage", _SE(js_iaacf_showOpenWebPage));
    // 注册取消广告函数
    global->defineFunction("iaacf_cancelAdShow", _SE(js_iaacf_cancelAdShow));
    // 注册检查广告就绪函数
    global->defineFunction("iaacf_isAdReady", _SE(js_iaacf_isAdReady));
    // 注册显示 AppStore 函数
    global->defineFunction("iaacf_showAppstorePage", _SE(js_iaacf_showAppstorePage));
    // 注册上报事件函数
    global->defineFunction("iaacf_logSensorEvent", _SE(js_iaacf_logSensorEvent));
    // 注册应用进入游戏函数
    global->defineFunction("iaacf_applicationDidEnterGame", _SE(js_iaacf_applicationDidEnterGame));
    // 注册获取版本函数
    NSLog(@"[IAACoreAdsJSB] 注册 iaacf_sdkVersion...");
    global->defineFunction("iaacf_sdkVersion", _SE(js_iaacf_sdkVersion));
    
    NSLog(@"[IAACoreAdsJSB] ========== 所有 JSB 函数注册完成 ==========");
}

// 注意：不再使用静态构造函数自动注册，改为在 AppDelegate 中显式注册
// 这样可以避免在后台线程执行导致的线程安全问题
/*
// 自动注册：使用静态构造函数在模块加载时自动注册（已禁用，避免线程安全问题）
static struct AutoRegister {
    AutoRegister() {
        // 延迟注册，确保脚本引擎已初始化
        dispatch_async(dispatch_get_main_queue(), ^{
            se::ScriptEngine* se = se::ScriptEngine::getInstance();
            if (se && se->isValid()) {
                se::AutoHandleScope hs;
                se::Object* global = se->getGlobalObject();
                if (global) {
                    register_IAACCoreAdsBridge(global);
                    NSLog(@"[IAACCoreAdsJSB] 自动注册完成");
                } else {
                    NSLog(@"[IAACoreAdsJSB] WARNING: Global object is null");
                }
            } else {
                NSLog(@"[IAACoreAdsJSB] WARNING: ScriptEngine not initialized, will retry");
                // 如果脚本引擎未初始化，延迟重试
                dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.1 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
                    se::ScriptEngine* retrySe = se::ScriptEngine::getInstance();
                    if (retrySe && retrySe->isValid()) {
                        se::AutoHandleScope hs;
                        se::Object* global = retrySe->getGlobalObject();
                        if (global) {
                            register_IAACCoreAdsBridge(global);
                            NSLog(@"[IAACoreAdsJSB] 延迟注册完成");
                        }
                    }
                });
            }
        });
    }
} s_auto_register;
*/
