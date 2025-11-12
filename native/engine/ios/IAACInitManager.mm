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
    if (!self.userAttributeCallback.isFunction() || !self.adInitCallback.isFunction()) {
        NSLog(@"[IAACoreAdsBridge] ERROR: JS 回调未设置！");
        return;
    }
    
    // 调用真正的 SDK 初始化方法（与原逻辑一致）
    [IAA_CoreAds iaa_initSDKWithLaunchOptions:self.launchOptions
                      iaa_userAttributeResult:^(BOOL iaacv_attributed, NSDictionary *info) {
        NSLog(@"[原生回调归因] attributed=%d, info=%@", iaacv_attributed, info);
        // 调用 TS 回调（通过 JSB）
        DispatchToMainThread(^{
            se::ScriptEngine* seEngine = se::ScriptEngine::getInstance();
            if (!seEngine->isValid()) return;
            
            se::AutoHandleScope hs(seEngine);
            // 准备回调参数：attributed（bool）、infoJson（string）
            const char* infoJson = DictionaryToJSON(info);
            se::Value args[2];
            args[0].setBoolean(iaacv_attributed);
            args[1].setString(infoJson ? infoJson : "");
            
            // 执行 TS 回调函数
            se::Value result;
            if (!self.userAttributeCallback.call(args, 2, &result)) {
                NSLog(@"[IAACoreAdsBridge] 调用用户归因 TS 回调失败");
            }
            
            // 释放 JSON 字符串内存
            if (infoJson) free((void*)infoJson);
        });
    } iaa_adInitResult:^(BOOL iaa_initialized) {
        NSLog(@"[原生回调初始化] initialized=%d", iaa_initialized);
        // 调用 TS 回调（通过 JSB）
        DispatchToMainThread(^{
            se::ScriptEngine* seEngine = se::ScriptEngine::getInstance();
            if (!seEngine->isValid()) return;
            
            se::AutoHandleScope hs(seEngine);
            // 准备回调参数：initialized（bool）
            se::Value args[1];
            args[0].setBoolean(iaa_initialized);
            
            // 执行 TS 回调函数
            se::Value result;
            if (!self.adInitCallback.call(args, 1, &result)) {
                NSLog(@"[IAACoreAdsBridge] 调用初始化结果 TS 回调失败");
            }
        });
    }];
    
    // 移除通知监听
    [[NSNotificationCenter defaultCenter] removeObserver:self name:UIApplicationDidFinishLaunchingNotification object:nil];
}

@end
