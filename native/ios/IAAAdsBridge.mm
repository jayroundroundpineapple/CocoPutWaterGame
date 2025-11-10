/**
 * IAA SDK Bridge for Cocos Creator 3.8 iOS
 * 将 Unity 的 C 函数包装成 Objective-C 类方法，供 JSB 调用
 */

#import <Foundation/Foundation.h>
#import <OpenPixel/OpenPixel.h>
#import "IAACHelper.h"
#import "IAACInitManager.h"

// 引入 Cocos Creator 的 ScriptEngine 头文件
// 注意：需要根据 Cocos Creator 版本调整路径
#import "cocos/scripting/js-bindings/jswrapper/SeApi.h"

// 声明外部 C 函数（在 IAACInitManager.mm 和 IAACoreAdsBridge.mm 中定义）
extern void iaacf_initSDK(void(*userCallback)(bool, const char*), void(*adInitCallback)(bool));
extern void iaacf_showAd(int adType, const char* placement, void(*callback)(int, int, const char*));
extern void iaacf_checkOpenWebAccessable(void(*callback)(bool));
extern void iaacf_showOpenWebPage();
extern void iaacf_cancelAdShow(int adType);
extern bool iaacf_isAdReady(int adType);
extern void iaacf_showAppstorePage(void(*callback)(bool));
extern void iaacf_logSensorEvent(const char* eventName, const char* propertiesJson);
extern void iaacf_applicationDidEnterGame();
extern const char* iaacf_sdkVersion();

// 回调到 JavaScript 的辅助函数
static void callbackToJS(NSString* jsCode) {
    // 确保在主线程执行
    dispatch_async(dispatch_get_main_queue(), ^{
        se::ScriptEngine* se = se::ScriptEngine::getInstance();
        if (se) {
            se->evalString([jsCode UTF8String]);
        } else {
            NSLog(@"[IAAAdsBridge] ERROR: ScriptEngine not initialized! JS Code: %@", jsCode);
        }
    });
}

// Objective-C 类，用于 JSB 反射调用
@interface IAAAdsBridge : NSObject
// 初始化 SDK - 不接收回调参数，通过 evalString 回调到 JavaScript
+ (void)initSDK;
// 显示广告 - 不接收回调参数，通过 evalString 回调到 JavaScript
+ (void)showAd:(int)adType placement:(NSString*)placement;
// 检查是否可以打开网页 - 不接收回调参数，通过 evalString 回调到 JavaScript
+ (void)checkOpenWebAccessable;
// 显示打开网页页面
+ (void)showOpenWebPage;
// 取消广告显示
+ (void)cancelAdShow:(int)adType;
// 判断广告是否准备好
+ (bool)isAdReady:(int)adType;
// 显示应用商店页面 - 不接收回调参数，通过 evalString 回调到 JavaScript
+ (void)showAppstorePage;
// 记录传感器事件
+ (void)logSensorEvent:(NSString*)eventName properties:(NSString*)propertiesJson;
// 应用进入游戏
+ (void)applicationDidEnterGame;
// 获取 SDK 版本
+ (NSString*)getSDKVersion;
@end

@implementation IAAAdsBridge

+ (void)initSDK {
    // 使用 IAACInitManager 的初始化逻辑
    iaacf_initSDK(^(bool attributed, const char* infoJson) {
        // 回调到 JavaScript
        NSString* infoStr = infoJson ? CreateNSString(infoJson) : @"";
        // 转义单引号和反斜杠，避免 JavaScript 语法错误
        infoStr = [infoStr stringByReplacingOccurrencesOfString:@"\\" withString:@"\\\\"];
        infoStr = [infoStr stringByReplacingOccurrencesOfString:@"'" withString:@"\\'"];
        infoStr = [infoStr stringByReplacingOccurrencesOfString:@"\n" withString:@"\\n"];
        infoStr = [infoStr stringByReplacingOccurrencesOfString:@"\r" withString:@"\\r"];
        
        NSString* jsCode = [NSString stringWithFormat:@"IAAAdManager.onUserAttributeResult(%@, '%@');", 
                           attributed ? @"true" : @"false", infoStr];
        callbackToJS(jsCode);
    }, ^(bool initialized) {
        // 回调到 JavaScript
        NSString* jsCode = [NSString stringWithFormat:@"IAAAdManager.onAdInitResult(%@);", 
                           initialized ? @"true" : @"false"];
        callbackToJS(jsCode);
    });
}

+ (void)showAd:(int)adType placement:(NSString*)placement {
    // 使用 IAACoreAdsBridge 中的函数
    iaacf_showAd(adType, [placement UTF8String], ^(int type, int event, const char* errorJson) {
        // 回调到 JavaScript
        NSString* errorStr = errorJson ? CreateNSString(errorJson) : @"";
        // 转义特殊字符
        errorStr = [errorStr stringByReplacingOccurrencesOfString:@"\\" withString:@"\\\\"];
        errorStr = [errorStr stringByReplacingOccurrencesOfString:@"'" withString:@"\\'"];
        errorStr = [errorStr stringByReplacingOccurrencesOfString:@"\n" withString:@"\\n"];
        errorStr = [errorStr stringByReplacingOccurrencesOfString:@"\r" withString:@"\\r"];
        
        NSString* jsCode = [NSString stringWithFormat:@"IAAAdManager.onAdEvent(%d, %d, '%@');", 
                           type, event, errorStr];
        callbackToJS(jsCode);
    });
}

+ (void)checkOpenWebAccessable {
    iaacf_checkOpenWebAccessable(^(bool accessable) {
        // 回调到 JavaScript
        NSString* jsCode = [NSString stringWithFormat:@"IAAAdManager.onCheckWebAccessableResult(%@);", 
                           accessable ? @"true" : @"false"];
        callbackToJS(jsCode);
    });
}

+ (void)showOpenWebPage {
    iaacf_showOpenWebPage();
}

+ (void)cancelAdShow:(int)adType {
    iaacf_cancelAdShow(adType);
}

+ (bool)isAdReady:(int)adType {
    return iaacf_isAdReady(adType);
}

+ (void)showAppstorePage {
    iaacf_showAppstorePage(^(bool success) {
        // 回调到 JavaScript
        NSString* jsCode = [NSString stringWithFormat:@"IAAAdManager.onShowAppstoreResult(%@);", 
                           success ? @"true" : @"false"];
        callbackToJS(jsCode);
    });
}

+ (void)logSensorEvent:(NSString*)eventName properties:(NSString*)propertiesJson {
    iaacf_logSensorEvent([eventName UTF8String], [propertiesJson UTF8String]);
}

+ (void)applicationDidEnterGame {
    iaacf_applicationDidEnterGame();
}

+ (NSString*)getSDKVersion {
    const char* version = iaacf_sdkVersion();
    NSString* result = CreateNSString(version);
    if (version) {
        free((void*)version);  // 释放 C 字符串内存
    }
    return result;
}

@end

