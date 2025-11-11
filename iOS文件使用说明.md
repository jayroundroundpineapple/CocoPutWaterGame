# iOS 文件使用说明

## 一、文件作用总结

### 📱 调用 iOS 原生 SDK 的文件

**是的，`IAAAdManager.ts` 和 `IAAAdsBridge.mm` 是调用 iOS 原生 SDK 的脚本。**

### 文件层次结构：

```
┌─────────────────────────────────────────┐
│  IAAAdManager.ts (TypeScript 接口层)   │  ← 游戏代码调用这里
└─────────────────────────────────────────┘
              ↓ JSB 调用
┌─────────────────────────────────────────┐
│  IAAAdsBridge.mm (Objective-C 包装层)   │  ← 包装 C 函数为类方法
└─────────────────────────────────────────┘
              ↓ 调用 C 函数
┌─────────────────────────────────────────┐
│  IAACInitManager.mm (初始化桥接层)      │  ← 处理初始化
│  IAACoreAdsBridge.mm (其他接口桥接层)    │  ← 处理其他接口
└─────────────────────────────────────────┘
              ↓ 调用原生 SDK
┌─────────────────────────────────────────┐
│  IAA_CoreAds (原生 iOS SDK)            │  ← 真正的原生 SDK
└─────────────────────────────────────────┘
```

---

## 二、各文件详细说明

### 1. **IAAAdManager.ts** - TypeScript 接口层

**作用：** Cocos Creator 的 TypeScript 接口，供游戏代码调用

**位置：** `assets/sdk/IAAAdManager.ts`

**功能：**
- ✅ 封装所有 SDK 接口（初始化、显示广告、检查网页等）
- ✅ 管理回调函数（保存用户传入的回调）
- ✅ 通过 JSB 调用原生代码
- ✅ 提供静态回调方法供原生代码调用

**使用方式：**
```typescript
// 游戏代码中直接调用
import { IAAAdManager, AdType, AdEvent } from './sdk/IAAAdManager';

// 初始化
IAAAdManager.initSdk(
    (attributed, info) => {
        console.log('User Attribute:', attributed, info);
    },
    (initialized) => {
        console.log('Ad Init:', initialized);
    }
);

// 显示广告
IAAAdManager.showAd(
    AdType.AD_TYPE_Interstitial,
    'placement_id',
    (adType, adEvent, error) => {
        console.log('Ad Event:', adType, adEvent, error);
    }
);
```

---

### 2. **IAAAdsBridge.mm** - Objective-C 包装层

**作用：** 将 C 函数包装成 Objective-C 类方法，供 JSB 调用

**位置：** `native/ios/IAAAdsBridge.mm`

**功能：**
- ✅ 提供 Objective-C 类方法供 JSB 调用
- ✅ 调用 C 函数（`iaacf_initSDK`、`iaacf_showAd` 等）
- ✅ 实现回调到 JavaScript 的机制（使用 `evalString`）

**关键代码：**
```objective-c
@interface IAAAdsBridge : NSObject
+ (void)initSDK:(id)userCallback adInitCallback:(id)adInitCallback;
+ (void)showAd:(int)adType placement:(NSString*)placement adEventCallback:(id)adEventCallback;
// ... 其他方法
@end
```

**使用方式：**
- ✅ **自动使用** - 通过 JSB 自动调用，不需要手动调用
- ✅ **已修复** - 方法签名已与 TypeScript 调用匹配

---

### 3. **IAACInitManager.mm** - 初始化桥接层

**作用：** 处理 SDK 初始化逻辑，调用原生 iOS SDK

**位置：** `native/ios/IAACInitManager.mm`

**功能：**
- ✅ 定义 `iaacf_initSDK` C 函数
- ✅ 处理 `launchOptions` 和初始化时机
- ✅ 调用原生 SDK `IAA_CoreAds` 的初始化方法
- ✅ 处理延迟初始化（如果调用时还未完成启动）

**关键代码：**
```objective-c
void iaacf_initSDK(IAAUserAttributeResultCallback userCallback, IAAAdInitResultCallback adInitCallback) {
    // 保存回调指针
    _userAttributeCallback = userCallback;
    _adInitCallback = adInitCallback;
    
    // 检查是否已完成启动
    if ([IAACInitManager iaacf_shared].didFinishLaunchWithOptions) {
        // 直接初始化
        [IAA_CoreAds iaa_initSDKWithLaunchOptions:...];
    } else {
        // 监听启动完成通知
        [[NSNotificationCenter defaultCenter] addObserver:...];
    }
}
```

**使用方式：**
- ✅ **自动使用** - 通过 `IAAAdsBridge.mm` 自动调用
- ⚠️ **需要配置** - 需要在 AppDelegate 中设置 `launchOptions`

**需要在 AppDelegate 中设置：**
```objective-c
#import "IAACInitManager.h"

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
    // 设置 launchOptions（重要！）
    [IAACInitManager iaacf_shared].launchOptions = launchOptions;
    [IAACInitManager iaacf_shared].didFinishLaunchWithOptions = YES;
    
    return YES;
}
```

---

### 4. **IAACInitManager.h** - 初始化管理器头文件

**作用：** 定义初始化管理器的接口和回调类型

**位置：** `native/ios/IAACInitManager.h`

**功能：**
- ✅ 定义回调函数指针类型
- ✅ 定义 `IAACInitManager` 类接口
- ✅ 声明静态回调变量

**关键内容：**
```objective-c
// 回调函数指针类型
typedef void (*IAAUserAttributeResultCallback)(bool attributed, const char* infoJson);
typedef void (*IAAAdInitResultCallback)(bool initialized);

// 静态回调变量（在 .mm 文件中使用）
static IAAUserAttributeResultCallback _userAttributeCallback = NULL;
static IAAAdInitResultCallback _adInitCallback = NULL;

// IAACInitManager 类
@interface IAACInitManager : NSObject
+ (instancetype)iaacf_shared;  // 单例
@property (nonatomic, assign) bool didFinishLaunchWithOptions;
@property (nonatomic, copy) NSDictionary *launchOptions;
@end
```

**使用方式：**
- ✅ **自动使用** - 在 `IAACInitManager.mm` 和 `IAAAdsBridge.mm` 中自动引用
- ✅ **需要引用** - 在 AppDelegate 中需要 `#import "IAACInitManager.h"` 来设置 launchOptions

---

### 5. **IAACHelper.h** - 辅助函数库

**作用：** 提供字符串转换等工具函数

**位置：** `native/ios/IAACHelper.h`

**功能：**
- ✅ `CreateNSString` - C 字符串转 NSString
- ✅ `CStringCopy` - NSString 转 C 字符串（需要 free 释放）
- ✅ `DictionaryToJSON` - NSDictionary 转 JSON 字符串
- ✅ `JSONToDictionary` - JSON 字符串转 NSDictionary

**使用方式：**
- ✅ **自动使用** - 在其他文件中自动引用
- ✅ **可以直接使用** - 在任何需要的地方 `#import "IAACHelper.h"`

**示例：**
```objective-c
#import "IAACHelper.h"

// C 字符串转 NSString
const char* cstr = "hello";
NSString* nsstr = CreateNSString(cstr);

// NSString 转 C 字符串（需要释放）
NSString* nsstr2 = @"world";
const char* cstr2 = CStringCopy(nsstr2);
// ... 使用 cstr2
free((void*)cstr2);  // 必须释放！

// NSDictionary 转 JSON
NSDictionary* dict = @{@"key": @"value"};
const char* json = DictionaryToJSON(dict);
// ... 使用 json
free((void*)json);  // 必须释放！
```

---

### 6. **IAACoreAdsBridge.mm** - 其他接口桥接层

**作用：** 处理其他 SDK 接口（显示广告、检查网页等），调用原生 iOS SDK

**位置：** `native/ios/IAACoreAdsBridge.mm`

**功能：**
- ✅ 定义 `iaacf_showAd` - 显示广告
- ✅ 定义 `iaacf_checkOpenWebAccessable` - 检查网页可访问性
- ✅ 定义 `iaacf_showOpenWebPage` - 显示打开网页
- ✅ 定义 `iaacf_cancelAdShow` - 取消广告显示
- ✅ 定义 `iaacf_isAdReady` - 判断广告是否准备好
- ✅ 定义 `iaacf_showAppstorePage` - 显示应用商店页面
- ✅ 定义 `iaacf_logSensorEvent` - 记录传感器事件
- ✅ 定义 `iaacf_applicationDidEnterGame` - 应用进入游戏
- ✅ 定义 `iaacf_sdkVersion` - 获取 SDK 版本

**使用方式：**
- ✅ **自动使用** - 通过 `IAAAdsBridge.mm` 自动调用
- ✅ **不需要修改** - 可以直接使用

---

## 三、完整调用流程

### 初始化流程：

```
1. 游戏代码调用
   IAAAdManager.initSdk(callback1, callback2)
   
2. IAAAdManager.ts
   - 保存回调函数到静态变量
   - 调用 jsb.reflection.callStaticMethod('IAAAdsBridge', 'initSDK:adInitCallback:', ...)
   
3. IAAAdsBridge.mm
   - 接收调用（方法签名已匹配）
   - 调用 iaacf_initSDK C 函数
   - 在 C 函数回调中，通过 evalString 回调到 JavaScript
   
4. IAACInitManager.mm
   - iaacf_initSDK 函数保存回调指针
   - 检查 didFinishLaunchWithOptions
   - 调用原生 SDK IAA_CoreAds iaa_initSDKWithLaunchOptions
   
5. 原生 SDK 回调
   - IAA_CoreAds 回调 → IAACInitManager.mm → IAAAdsBridge.mm → evalString → IAAAdManager.ts → 用户回调
```

---

## 四、使用这三个文件的方式

### 1. **IAACHelper.h** - 工具函数库

**如何使用：**
- ✅ 在需要字符串转换的地方 `#import "IAACHelper.h"`
- ✅ 直接使用 `CreateNSString`、`CStringCopy` 等函数
- ✅ **不需要修改**，可以直接使用

**示例：**
```objective-c
#import "IAACHelper.h"

// 在任何需要的地方使用
const char* cstr = "test";
NSString* nsstr = CreateNSString(cstr);
```

---

### 2. **IAACInitManager.h** - 初始化管理器头文件

**如何使用：**
- ✅ 在 AppDelegate 中 `#import "IAACInitManager.h"`
- ✅ 在 `didFinishLaunchingWithOptions` 中设置 launchOptions
- ✅ **需要配置**，否则初始化可能失败

**必须配置：**
```objective-c
// 在 AppDelegate.m 中
#import "IAACInitManager.h"

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
    // 必须设置这两个属性！
    [IAACInitManager iaacf_shared].launchOptions = launchOptions;
    [IAACInitManager iaacf_shared].didFinishLaunchWithOptions = YES;
    
    return YES;
}
```

---

### 3. **IAACInitManager.mm** - 初始化桥接实现

**如何使用：**
- ✅ **自动使用** - 通过 `IAAAdsBridge.mm` 自动调用
- ✅ **不需要手动调用** - 系统会自动调用
- ✅ **需要确保 launchOptions 已设置** - 在 AppDelegate 中设置

**工作原理：**
1. `IAAAdsBridge.mm` 调用 `iaacf_initSDK` C 函数
2. `iaacf_initSDK` 检查 `didFinishLaunchWithOptions`
3. 如果已启动，直接调用 SDK
4. 如果未启动，监听启动完成通知

---

## 五、总结

### 文件使用方式：

| 文件 | 使用方式 | 是否需要修改 |
|------|---------|------------|
| **IAAAdManager.ts** | 游戏代码直接调用 | ✅ 不需要 |
| **IAAAdsBridge.mm** | 自动使用（通过 JSB） | ✅ 已修复，不需要 |
| **IAACInitManager.mm** | 自动使用（通过 IAAAdsBridge） | ✅ 不需要 |
| **IAACInitManager.h** | 在 AppDelegate 中引用 | ⚠️ 需要配置 launchOptions |
| **IAACHelper.h** | 自动使用（在其他文件中引用） | ✅ 不需要 |
| **IAACoreAdsBridge.mm** | 自动使用（通过 IAAAdsBridge） | ✅ 不需要 |

### 关键点：

1. ✅ **IAAAdManager.ts** 和 **IAAAdsBridge.mm** 是调用 iOS 原生 SDK 的脚本
2. ✅ **IAACHelper.h** - 工具函数，自动使用，不需要手动调用
3. ✅ **IAACInitManager.h/.mm** - 初始化桥接，自动使用，但需要在 AppDelegate 中配置 launchOptions
4. ✅ **IAACoreAdsBridge.mm** - 其他接口桥接，自动使用，不需要手动调用

### 必须做的配置：

**在 AppDelegate 中设置 launchOptions：**
```objective-c
#import "IAACInitManager.h"

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
    [IAACInitManager iaacf_shared].launchOptions = launchOptions;
    [IAACInitManager iaacf_shared].didFinishLaunchWithOptions = YES;
    return YES;
}
```

完成以上配置后，所有文件都会自动工作！

