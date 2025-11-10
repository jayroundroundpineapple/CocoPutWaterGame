/**
 * IAA SDK Bridge for Cocos Creator 3.8 iOS
 * 类似 Unity 的 IAACoreAdsBridge，桥接原生 iOS SDK
 */

#import <Foundation/Foundation.h>
#import <OpenPixel/OpenPixel.h>
#import "IAAHelper.h"

// C++ 回调函数类型定义
typedef void (*IAAUserAttributeResultCallback)(bool attributed, const char* infoJson);
typedef void (*IAAAdInitResultCallback)(bool initialized);
typedef void (*IAAAdEventCallback)(int adType, int adEvent, const char* errorJson);
typedef void (*IAACheckWebAccessableCallback)(bool accessable);
typedef void (*IAAShowAppstoreResultCallback)(bool success);

// 存储 C++ 回调的静态变量
static IAAUserAttributeResultCallback iaav_userAttributeCallback = NULL;
static IAAAdInitResultCallback iaav_adInitCallback = NULL;
static IAAAdEventCallback iaav_adEventCallback = NULL;
static IAACheckWebAccessableCallback iaav_checkWebCallback = NULL;
static IAAShowAppstoreResultCallback iaav_showAppstoreCallback = NULL;

// 辅助函数：NSString 转 C 字符串
static const char* CStringCopy(NSString* str) {
    if (str == nil) {
        return NULL;
    }
    const char* cstr = [str UTF8String];
    char* result = (char*)malloc(strlen(cstr) + 1);
    strcpy(result, cstr);
    return result;
}

// 辅助函数：C 字符串转 NSString
static NSString* CreateNSString(const char* cstr) {
    if (cstr == NULL) {
        return nil;
    }
    return [NSString stringWithUTF8String:cstr];
}

// 辅助函数：NSDictionary 转 JSON 字符串
static const char* DictionaryToJSON(NSDictionary* dict) {
    if (dict == nil) {
        return NULL;
    }
    NSError* error;
    NSData* jsonData = [NSJSONSerialization dataWithJSONObject:dict options:0 error:&error];
    if (error) {
        return NULL;
    }
    NSString* jsonString = [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
    return CStringCopy(jsonString);
}

// 辅助函数：JSON 字符串转 NSDictionary
static NSDictionary* JSONToDictionary(const char* jsonStr) {
    if (jsonStr == NULL) {
        return nil;
    }
    NSString* jsonString = CreateNSString(jsonStr);
    NSData* jsonData = [jsonString dataUsingEncoding:NSUTF8StringEncoding];
    NSError* error;
    NSDictionary* dict = [NSJSONSerialization JSONObjectWithData:jsonData options:0 error:&error];
    if (error) {
        return nil;
    }
    return dict;
}

// Cocos Creator JSB 接口
extern "C" {
    
    /**
     * 初始化 SDK
     */
    void initSDK(IAAUserAttributeResultCallback userCallback, IAAAdInitResultCallback adInitCallback) {
        iaav_userAttributeCallback = userCallback;
        iaav_adInitCallback = adInitCallback;
        
        [IAA_CoreAds iaa_initSDK:^(BOOL attributed, NSString* info) {
            if (iaav_userAttributeCallback) {
                const char* infoJson = info ? CStringCopy(info) : NULL;
                iaav_userAttributeCallback(attributed, infoJson);
                if (infoJson) {
                    free((void*)infoJson);
                }
            }
        } adInitCallback:^(BOOL initialized) {
            if (iaav_adInitCallback) {
                iaav_adInitCallback(initialized);
            }
        }];
    }
    
    /**
     * 显示广告
     */
    void showAd(int adType, const char* placement, IAAAdEventCallback adEventCallback) {
        iaav_adEventCallback = adEventCallback;
        
        [IAA_CoreAds iaa_showAd:(IAA_AdType)adType
             iaa_fromPlacement:CreateNSString(placement)
                     iaa_Event:^(IAA_AdType type, IAA_AdEvent event, NSError* error) {
            if (iaav_adEventCallback) {
                NSDictionary* errorDict = error ? @{@"message": error.localizedDescription} : nil;
                const char* errorJson = DictionaryToJSON(errorDict);
                iaav_adEventCallback((int)type, (int)event, errorJson);
                if (errorJson) {
                    free((void*)errorJson);
                }
            }
        }];
    }
    
    /**
     * 检查是否可以打开网页
     */
    void checkOpenWebAccessable(IAACheckWebAccessableCallback resultCallback) {
        iaav_checkWebCallback = resultCallback;
        
        [IAA_CoreAds iaa_checkOpenWebAccessable:^(BOOL accessable) {
            if (iaav_checkWebCallback) {
                iaav_checkWebCallback(accessable);
            }
        }];
    }
    
    /**
     * 显示打开网页页面
     */
    void showOpenWebPage() {
        [IAA_CoreAds iaa_checkOpenWebAccessable:^(BOOL accessable) {
            if (accessable) {
                [IAA_CoreAds iaa_showOpenWebPage];
            }
        }];
    }
    
    /**
     * 取消广告显示
     */
    void cancelAdShow(int adType) {
        [IAA_CoreAds iaa_cancelShowAd:adType];
    }
    
    /**
     * 判断广告是否准备好
     */
    bool isAdReady(int adType) {
        BOOL ready = [IAA_CoreAds iaa_adIsReadyForType:adType];
        return ready ? true : false;
    }
    
    /**
     * 显示应用商店页面
     */
    void showAppstorePage(IAAShowAppstoreResultCallback resultCallback) {
        iaav_showAppstoreCallback = resultCallback;
        
        [IAA_CoreAds iaa_showAppstorePageWithResultCallback:^(BOOL success) {
            if (iaav_showAppstoreCallback) {
                iaav_showAppstoreCallback(success);
            }
        }];
    }
    
    /**
     * 记录传感器事件
     */
    void logSensorEvent(const char* eventName, const char* propertiesJson) {
        [IAA_CoreAds iaa_logSensorEvent:CreateNSString(eventName)
                         iaa_properties:JSONToDictionary(propertiesJson)];
    }
    
    /**
     * 应用进入游戏
     */
    void applicationDidEnterGame() {
        [IAA_CoreAds iaa_applicationDidEnterGame];
    }
    
    /**
     * 获取 SDK 版本
     */
    const char* getSDKVersion() {
        return CStringCopy([IAA_CoreAds iaa_sdkVersion]);
    }
}

// Objective-C 类，用于 JSB 反射调用
@interface IAAAdsBridge : NSObject
+ (void)initSDK:(void(^)(bool, NSString*))userCallback adInitCallback:(void(^)(bool))adInitCallback;
+ (void)showAd:(int)adType placement:(NSString*)placement adEventCallback:(void(^)(int, int, NSString*))adEventCallback;
+ (void)checkOpenWebAccessable:(void(^)(bool))resultCallback;
+ (void)showOpenWebPage;
+ (void)cancelAdShow:(int)adType;
+ (bool)isAdReady:(int)adType;
+ (void)showAppstorePage:(void(^)(bool))resultCallback;
+ (void)logSensorEvent:(NSString*)eventName properties:(NSString*)propertiesJson;
+ (void)applicationDidEnterGame;
+ (NSString*)getSDKVersion;
@end

@implementation IAAAdsBridge

+ (void)initSDK:(void(^)(bool, NSString*))userCallback adInitCallback:(void(^)(bool))adInitCallback {
    initSDK(^(bool attributed, const char* infoJson) {
        userCallback(attributed, CreateNSString(infoJson));
    }, ^(bool initialized) {
        adInitCallback(initialized);
    });
}

+ (void)showAd:(int)adType placement:(NSString*)placement adEventCallback:(void(^)(int, int, NSString*))adEventCallback {
    showAd(adType, [placement UTF8String], ^(int type, int event, const char* errorJson) {
        adEventCallback(type, event, CreateNSString(errorJson));
    });
}

+ (void)checkOpenWebAccessable:(void(^)(bool))resultCallback {
    checkOpenWebAccessable(resultCallback);
}

+ (void)showOpenWebPage {
    showOpenWebPage();
}

+ (void)cancelAdShow:(int)adType {
    cancelAdShow(adType);
}

+ (bool)isAdReady:(int)adType {
    return isAdReady(adType);
}

+ (void)showAppstorePage:(void(^)(bool))resultCallback {
    showAppstorePage(resultCallback);
}

+ (void)logSensorEvent:(NSString*)eventName properties:(NSString*)propertiesJson {
    logSensorEvent([eventName UTF8String], [propertiesJson UTF8String]);
}

+ (void)applicationDidEnterGame {
    applicationDidEnterGame();
}

+ (NSString*)getSDKVersion {
    return CreateNSString(getSDKVersion());
}

@end

