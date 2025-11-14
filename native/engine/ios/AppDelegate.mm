#import "AppDelegate.h"
#import "ViewController.h"
#import "View.h"

#include "platform/ios/IOSPlatform.h"
#import "platform/ios/AppDelegateBridge.h"
#import "service/SDKWrapper.h"
#import "IAACInitManager.h"
#import "IAACCoreAdsJSB.h"
#include "cocos/bindings/jswrapper/SeApi.h"

@implementation AppDelegate
@synthesize window;
@synthesize appDelegateBridge;

#pragma mark -
#pragma mark Application lifecycle

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
    NSLog(@"[AppDelegate] ========== didFinishLaunchingWithOptions 开始 ==========");
    NSLog(@"[AppDelegate] 当前线程：%@，是否主线程：%d", [NSThread currentThread], [NSThread isMainThread]);
    
    // 设置 IAA SDK 的 launchOptions（必须在最早设置，且必须在主线程）
    NSLog(@"[AppDelegate] 设置 IAA SDK launchOptions...");
    [IAACInitManager iaacf_shared].launchOptions = launchOptions;
    [IAACInitManager iaacf_shared].didFinishLaunchWithOptions = YES;
    NSLog(@"[AppDelegate] IAA SDK launchOptions 设置完成");
    
    NSLog(@"[AppDelegate] 初始化 SDKWrapper...");
    [[SDKWrapper shared] application:application didFinishLaunchingWithOptions:launchOptions];
    
    NSLog(@"[AppDelegate] 创建 AppDelegateBridge...");
    appDelegateBridge = [[AppDelegateBridge alloc] init];
    
    NSLog(@"[AppDelegate] 创建 Window 和 ViewController...");
    CGRect bounds = [[UIScreen mainScreen] bounds];
    self.window   = [[UIWindow alloc] initWithFrame:bounds];

    _viewController                           = [[ViewController alloc] init];
    _viewController.view                      = [[View alloc] initWithFrame:bounds];
    _viewController.view.contentScaleFactor   = UIScreen.mainScreen.scale;
    _viewController.view.multipleTouchEnabled = true;
    [self.window setRootViewController:_viewController];

    NSLog(@"[AppDelegate] 显示 Window...");
    [self.window makeKeyAndVisible];
    
    NSLog(@"[AppDelegate] 调用 AppDelegateBridge didFinishLaunchingWithOptions...");
    [appDelegateBridge application:application didFinishLaunchingWithOptions:launchOptions];
    
    // 延迟注册 JSB 函数，确保 ScriptEngine 完全初始化
    NSLog(@"[AppDelegate] 安排延迟注册 JSB 函数（2.0 秒后）...");
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(2.0 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
        [self registerJSBFunctions];
    });
    
    NSLog(@"[AppDelegate] ========== didFinishLaunchingWithOptions 完成 ==========");
    return YES;
}

// 注册 JSB 函数（添加防重复注册标志）
static BOOL s_jsbRegistered = NO;  // 防止重复注册

- (void)registerJSBFunctions {
    NSLog(@"[AppDelegate] ========== registerJSBFunctions 开始 ==========");
    NSLog(@"[AppDelegate] 当前线程：%@，是否主线程：%d", [NSThread currentThread], [NSThread isMainThread]);
    
    // 防止重复注册
    if (s_jsbRegistered) {
        NSLog(@"[AppDelegate] WARNING: JSB 函数已注册，跳过");
        return;
    }
    
    // 确保在主线程执行
    if (![NSThread isMainThread]) {
        NSLog(@"[AppDelegate] WARNING: 不在主线程，切换到主线程...");
        dispatch_async(dispatch_get_main_queue(), ^{
            [self registerJSBFunctions];
        });
        return;
    }
    
    se::ScriptEngine* se = se::ScriptEngine::getInstance();
    if (!se) {
        NSLog(@"[AppDelegate] WARNING: ScriptEngine instance is null, 0.5秒后重试");
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.5 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
            [self registerJSBFunctions];
        });
        return;
    }
    
    if (!se->isValid()) {
        NSLog(@"[AppDelegate] WARNING: ScriptEngine not valid, 0.5秒后重试");
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.5 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
            [self registerJSBFunctions];
        });
        return;
    }
    
    // 使用 HandleScope 保护
    se::AutoHandleScope hs;
    se::Object* global = se->getGlobalObject();
    
    if (!global) {
        NSLog(@"[AppDelegate] WARNING: Global object is null, 0.5秒后重试");
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.5 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
            [self registerJSBFunctions];
        });
        return;
    }
    
    // 注册 JSB 函数
    NSLog(@"[AppDelegate] 开始注册 JSB 函数...");
    @try {
        register_IAACCoreAdsBridge(global);
        s_jsbRegistered = YES;  // 标记已注册
        NSLog(@"[AppDelegate] ========== IAA SDK JSB 函数注册完成 ==========");
    } @catch (NSException *exception) {
        NSLog(@"[AppDelegate] ERROR: 注册 JSB 函数时发生异常: %@", exception);
        // 如果注册失败，不标记为已注册，允许重试
    }
}

- (void)applicationWillResignActive:(UIApplication *)application {
    [[SDKWrapper shared] applicationWillResignActive:application];
    [appDelegateBridge applicationWillResignActive:application];
}

- (void)applicationDidBecomeActive:(UIApplication *)application {
    [[SDKWrapper shared] applicationDidBecomeActive:application];
    [appDelegateBridge applicationDidBecomeActive:application];
}

- (void)applicationDidEnterBackground:(UIApplication *)application {
    [[SDKWrapper shared] applicationDidEnterBackground:application];
}

- (void)applicationWillEnterForeground:(UIApplication *)application {
    [[SDKWrapper shared] applicationWillEnterForeground:application];
}

- (void)applicationWillTerminate:(UIApplication *)application {
    [[SDKWrapper shared] applicationWillTerminate:application];
    [appDelegateBridge applicationWillTerminate:application];
}

#pragma mark -
#pragma mark Memory management

- (void)applicationDidReceiveMemoryWarning:(UIApplication *)application {
    [[SDKWrapper shared] applicationDidReceiveMemoryWarning:application];
}

@end
