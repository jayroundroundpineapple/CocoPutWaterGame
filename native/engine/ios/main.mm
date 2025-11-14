/****************************************************************************
 Copyright (c) 2021-2022 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
 worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
 not use Cocos Creator software for developing other software or tools that's
 used for developing games. You are not granted to publish, distribute,
 sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
****************************************************************************/

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

