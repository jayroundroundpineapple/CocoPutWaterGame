#import "IAACInitManager.h"
#import <OpenPixel/OpenPixel.h>
#import "IAACHelper.h"


#ifdef __cplusplus
extern "C" {
#endif 
    // 1. 初始化
    void iaacf_initSDK(IAAUserAttributeResultCallback userCallback, IAAAdInitResultCallback adInitCallback) {
        // 保存回调指针
        _userAttributeCallback = userCallback;
        _adInitCallback = adInitCallback;
        NSLog(@"_didFinishLaunchWithOptions2 == %d", [IAACInitManager iaacf_shared].didFinishLaunchWithOptions);
        NSLog(@"_launchOptions2 == %@", [IAACInitManager iaacf_shared].launchOptions);
        if ([IAACInitManager iaacf_shared].didFinishLaunchWithOptions) {//调用接口时已走完ApplicationDidFinishLaunch方法，直接初始化
            // 调用真正的 SDK 初始化方法
            NSLog(@"[Bridge] iaacf_initSDK调用真正的 SDK 初始化方法");

            [IAA_CoreAds iaa_initSDKWithLaunchOptions:[IAACInitManager iaacf_shared].launchOptions iaa_userAttributeResult:^(BOOL iaacv_attributed, NSDictionary *info) {
                NSLog(@"[原生回调归因]");
                if (_userAttributeCallback) {
                    _userAttributeCallback(iaacv_attributed, DictionaryToJSON(info));
                }
            } iaa_adInitResult:^(BOOL iaa_initialized) {
                NSLog(@"[原生回调初始化]");
                if (_adInitCallback) {
                    _adInitCallback(iaa_initialized);
                }
            }];
            
            return;
        }
        
        NSLog(@"[Bridge] iaacf_initSDK 调用接口时尚未走到ApplicationDidFinishLaunch方法，先监听ApplicationDidFinishLaunch");
        //调用接口时尚未走到ApplicationDidFinishLaunch方法
        [[NSNotificationCenter defaultCenter] addObserver:[IAACInitManager iaacf_shared] selector:@selector(initSDKWhileAppDidFinishLaunch:) name:UIApplicationDidFinishLaunchingNotification object:nil];
    }
    
#ifdef __cplusplus
}
#endif // __cplusplus

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
    NSDictionary *launchOptions = notification.userInfo;
    
    // 检查回调是否已从 C# 设置
    if (!_userAttributeCallback || !_adInitCallback) {
        NSLog(@"[IAACoreAdsBridge] ERROR: C# callbacks not set before initialization was triggered!");
        return;
    }
    // 调用真正的 SDK 初始化方法
    [IAA_CoreAds iaa_initSDKWithLaunchOptions:launchOptions
                      iaa_userAttributeResult:^(BOOL iaacv_attributed, NSDictionary *info) {
//        NSLog(@"[原生回调] 用户属性回调触发：attributed=%d, info=%@", iaacv_attributed, info);
        NSLog(@"[原生回调归因]");
        if (_userAttributeCallback) {
            _userAttributeCallback(iaacv_attributed, DictionaryToJSON(info));
        }
    } iaa_adInitResult:^(BOOL iaa_initialized) {
        NSLog(@"[原生回调初始化]");
        if (_adInitCallback) {
            _adInitCallback(iaa_initialized);
        }
    }];
    // 初始化后，移除监听器
//    [[NSNotificationCenter defaultCenter] removeObserver:[IAACoreAds class] name:@"IAASDKShouldInitializeNotification" object:nil];
    [[NSNotificationCenter defaultCenter] removeObserver:self name:UIApplicationDidFinishLaunchingNotification object:nil];

}


@end
