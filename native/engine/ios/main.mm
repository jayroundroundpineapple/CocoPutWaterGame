#include <iostream>

#include "platform/BasePlatform.h"
#include "AppDelegate.h"

int main(int argc, const char * argv[]) {
    NSLog(@"[main.mm] ========== 应用启动：main 函数开始 ==========");
    NSLog(@"[main.mm] 当前线程：%@，是否主线程：%d", [NSThread currentThread], [NSThread isMainThread]);
    
    cc::BasePlatform* platform = cc::BasePlatform::getPlatform(); 
    NSLog(@"[main.mm] 初始化平台...");
    if (platform->init()) { 
        NSLog(@"[main.mm] ERROR: 平台初始化失败！");
        return -1;                                                
    }
    NSLog(@"[main.mm] 平台初始化成功，运行平台...");
    platform->run(argc, argv);
    
    NSLog(@"[main.mm] 创建 NSAutoreleasePool，启动 UIApplicationMain...");
    NSAutoreleasePool * pool = [[NSAutoreleasePool alloc] init];
    int retVal = UIApplicationMain(argc, (char**)argv, nil, @"AppDelegate");
    [pool release];
    NSLog(@"[main.mm] UIApplicationMain 返回，应用退出");
    return retVal;
}

