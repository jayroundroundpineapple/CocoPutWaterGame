// IAACInitManager.m
#import "IAACInitManager.h"
#import <PixelInsight/PixelInsight.h>
#import "IAACHelper.h"

@implementation IAACInitManager

+ (instancetype)iaacf_shared {
    static IAACInitManager *_instance = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        _instance = [[IAACInitManager alloc] init];
    });
    return _instance;
}

- (void)initSDKWhileAppDidFinishLaunch:(NSNotification *)notification {
    NSLog(@"[IAACoreAdsBridge] Received UIApplicationDidFinishLaunchingNotification. Initializing SDK now.");
    
    // 从通知中获取 launchOptions
    self.launchOptions = notification.userInfo;
    
    // 检查 JSB 回调是否有效
    if (!self.userAttributeCallback.isObject() || !self.adInitCallback.isObject()) {
        NSLog(@"[IAACoreAdsBridge] ERROR: JS 回调未设置！");
        return;
    }
    
    se::Object* userAttrObj = self.userAttributeCallback.toObject();
    se::Object* adInitObj = self.adInitCallback.toObject();
    if (!userAttrObj || !userAttrObj->isFunction() || !adInitObj || !adInitObj->isFunction()) {
        NSLog(@"[IAACoreAdsBridge] ERROR: JS 回调不是函数！");
        return;
    }
    
    // 调用真正的 SDK 初始化方法（与原逻辑一致）
    [IAA_CoreAds iaa_initSDKWithLaunchOptions:self.launchOptions
                      iaa_userAttributeResult:^(BOOL iaacv_attributed, NSDictionary *info) {
        NSLog(@"[原生回调归因] attributed=%d, info=%@", iaacv_attributed, info);
        // 调用 TS 回调（通过 JSB）
        DispatchToMainThread(^{
            se::ScriptEngine* seEngine = se::ScriptEngine::getInstance();
            if (!seEngine->isValid() || !self.userAttributeCallback.isObject()) return;
            
            se::AutoHandleScope hs(seEngine);
            se::Object* callbackObj = self.userAttributeCallback.toObject();
            if (!callbackObj || !callbackObj->isFunction()) return;
            
            // 准备回调参数：attributed（bool）、infoJson（string）
            const char* infoJson = DictionaryToJSON(info);
            se::ValueArray args;
            args.resize(2);
            args[0].setBoolean(iaacv_attributed);
            args[1].setString(infoJson ? infoJson : "");
            
            // 执行 TS 回调函数
            se::Value result;
            if (!callbackObj->call(args, nullptr, &result)) {
                NSLog(@"[IAACoreAdsBridge] 调用用户归因 TS 回调失败");
                seEngine->clearException();
            }
            
            // 释放 JSON 字符串内存
            if (infoJson) free((void*)infoJson);
        });
    } iaa_adInitResult:^(BOOL iaa_initialized) {
        NSLog(@"[原生回调初始化] initialized=%d", iaa_initialized);
        // 调用 TS 回调（通过 JSB）
        DispatchToMainThread(^{
            se::ScriptEngine* seEngine = se::ScriptEngine::getInstance();
            if (!seEngine->isValid() || !self.adInitCallback.isObject()) return;
            
            se::AutoHandleScope hs(seEngine);
            se::Object* callbackObj = self.adInitCallback.toObject();
            if (!callbackObj || !callbackObj->isFunction()) return;
            
            // 准备回调参数：initialized（bool）
            se::ValueArray args;
            args.resize(1);
            args[0].setBoolean(iaa_initialized);
            
            // 执行 TS 回调函数
            se::Value result;
            if (!callbackObj->call(args, nullptr, &result)) {
                NSLog(@"[IAACoreAdsBridge] 调用初始化结果 TS 回调失败");
                seEngine->clearException();
            }
        });
    }];
    
    // 移除通知监听
    [[NSNotificationCenter defaultCenter] removeObserver:self name:UIApplicationDidFinishLaunchingNotification object:nil];
}

@end
