/**
 * IAA SDK JSB Bridge for Cocos Creator 3.8 iOS
 */
#import <Foundation/Foundation.h>
#import "IAACHelper.h"
#import "IAACInitManager.h"
// 引入 Cocos Creator 的 ScriptEngine 头文件
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
    dispatch_async(dispatch_get_main_queue(), ^{
        se::ScriptEngine* se = se::ScriptEngine::getInstance();
        if (se) {
            se->evalString([jsCode UTF8String]);
        } else {
            NSLog(@"[IAAJSBridge] ERROR: ScriptEngine not initialized! JS Code: %@", jsCode);
        }
    });
}

// 字符串转义函数
static NSString* escapeString(NSString* str) {
    if (!str) return @"";
    str = [str stringByReplacingOccurrencesOfString:@"\\" withString:@"\\\\"];
    str = [str stringByReplacingOccurrencesOfString:@"'" withString:@"\\'"];
    str = [str stringByReplacingOccurrencesOfString:@"\n" withString:@"\\n"];
    str = [str stringByReplacingOccurrencesOfString:@"\r" withString:@"\\r"];
    return str;
}

// Objective-C 类，用于 JSB 反射调用
@interface IAAJSBridge : NSObject
+ (void)initSDK;
+ (void)showAd:(int)adType placement:(NSString*)placement;
+ (void)checkOpenWebAccessable;
+ (void)showOpenWebPage;
+ (void)cancelAdShow:(int)adType;
+ (bool)isAdReady:(int)adType;
+ (void)showAppstorePage;
+ (void)logSensorEvent:(NSString*)eventName properties:(NSString*)propertiesJson;
+ (void)applicationDidEnterGame;
+ (NSString*)getSDKVersion;
@end

@implementation IAAJSBridge

+ (void)initSDK {
    // 直接调用 C 函数，回调通过 evalString 实现
    iaacf_initSDK(^(bool attributed, const char* infoJson) {
        NSString* infoStr = infoJson ? CreateNSString(infoJson) : @"";
        infoStr = escapeString(infoStr);
        NSString* jsCode = [NSString stringWithFormat:@"IAAAdManager.onUserAttributeResult(%@, '%@');", 
                           attributed ? @"true" : @"false", infoStr];
        callbackToJS(jsCode);
    }, ^(bool initialized) {
        NSString* jsCode = [NSString stringWithFormat:@"IAAAdManager.onAdInitResult(%@);", 
                           initialized ? @"true" : @"false"];
        callbackToJS(jsCode);
    });
}

+ (void)showAd:(int)adType placement:(NSString*)placement {
    iaacf_showAd(adType, [placement UTF8String], ^(int type, int event, const char* errorJson) {
        NSString* errorStr = errorJson ? CreateNSString(errorJson) : @"";
        errorStr = escapeString(errorStr);
        NSString* jsCode = [NSString stringWithFormat:@"IAAAdManager.onAdEvent(%d, %d, '%@');", 
                           type, event, errorStr];
        callbackToJS(jsCode);
    });
}

+ (void)checkOpenWebAccessable {
    iaacf_checkOpenWebAccessable(^(bool accessable) {
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
        free((void*)version);
    }
    return result;
}

@end

