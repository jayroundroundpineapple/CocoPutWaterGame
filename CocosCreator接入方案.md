# Cocos Creator 接入方案（保持原生 iOS 代码不变）

## 一、方案概述

保持原生 iOS 代码（`IAACHelper.h`、`IAACInitManager.h`、`IAACInitManager.mm`、`IAACoreAdsBridge.mm`）**完全不变**，只添加一个简化的 Objective-C 包装层和 TypeScript 桥接脚本。

## 二、文件结构

```
native/ios/
├── IAACHelper.h              ✅ 保持不变（工具函数）
├── IAACInitManager.h         ✅ 保持不变（初始化管理器头文件）
├── IAACInitManager.mm        ✅ 保持不变（初始化桥接实现）
├── IAACoreAdsBridge.mm       ✅ 保持不变（其他接口桥接）
└── IAAJSBridge.mm            ✨ 新建（简化的 Objective-C 包装层）

assets/sdk/
└── IAAAdManager.ts           ✨ 新建（TypeScript 桥接脚本，对应 Unity 的 AdManager）
```

## 三、调用关系

```
游戏代码 (TypeScript)
    ↓
IAAAdManager.ts (TypeScript 桥接，对应 Unity 的 AdManager)
    ↓ jsb.reflection.callStaticMethod
IAAJSBridge.mm (简化的 Objective-C 包装层)
    ↓ 直接调用 C 函数
IAACInitManager.mm / IAACoreAdsBridge.mm (原生桥接，保持不变)
    ↓ 调用原生 SDK
IAA_CoreAds (原生 iOS SDK)
    ↓ 回调
IAACInitManager.mm / IAACoreAdsBridge.mm (C 函数回调)
    ↓ 回调
IAAJSBridge.mm (evalString 回调到 JavaScript)
    ↓ 调用静态方法
IAAAdManager.ts (TypeScript 回调方法)
    ↓ 调用用户回调
游戏代码 (用户回调函数)
```

## 四、与 Unity 的对比

### Unity 调用方式：
```csharp
// Unity C# 代码
AdManager.InitSdk(
    (attributed, info) => { ... },
    (initialized) => { ... }
);
```

### Cocos Creator 调用方式：
```typescript
// Cocos Creator TypeScript 代码（完全一样！）
IAAAdManager.initSdk(
    (attributed, info) => { ... },
    (initialized) => { ... }
);
```

## 五、关键文件说明

### 1. IAAJSBridge.mm - 简化的 Objective-C 包装层

**作用：** 将 C 函数包装成 Objective-C 类方法，供 JSB 调用

**特点：**
- ✅ 最小化包装，直接对应 Unity 的调用方式
- ✅ 不接收回调参数（因为 JSB 不支持）
- ✅ 通过 `evalString` 回调到 JavaScript
- ✅ 保持原生 iOS 代码完全不变

**方法签名：**
```objective-c
+ (void)initSDK;                                    // 对应 Unity: InitSDK()
+ (void)showAd:(int)adType placement:(NSString*)placement;  // 对应 Unity: ShowAd()
+ (void)checkOpenWebAccessable;                    // 对应 Unity: CheckOpenWebAccessable()
// ... 其他方法
```

### 2. IAAAdManager.ts - TypeScript 桥接脚本

**作用：** 对应 Unity 的 `AdManager`，提供相同的接口

**特点：**
- ✅ 接口与 Unity 的 `AdManager` 完全一致
- ✅ 使用方式与 Unity 完全相同
- ✅ 管理回调函数（保存用户传入的回调）
- ✅ 提供静态回调方法供原生代码调用

**使用示例：**
```typescript
import { IAAAdManager, AdType, AdEvent } from './sdk/IAAAdManager';

// 初始化（与 Unity 完全一样）
IAAAdManager.initSdk(
    (attributed, info) => {
        console.log('User Attribute:', attributed, info);
    },
    (initialized) => {
        console.log('Ad Init:', initialized);
    }
);

// 显示广告（与 Unity 完全一样）
IAAAdManager.showAd(
    AdType.AD_TYPE_Interstitial,
    'placement_id',
    (adType, adEvent, error) => {
        console.log('Ad Event:', adType, adEvent, error);
    }
);
```

## 六、原生 iOS 代码保持不变

### ✅ IAACHelper.h - 工具函数库
- **不需要修改** - 直接使用
- 提供字符串转换等工具函数

### ✅ IAACInitManager.h - 初始化管理器头文件
- **不需要修改** - 直接使用
- 定义回调类型和 `IAACInitManager` 类

### ✅ IAACInitManager.mm - 初始化桥接实现
- **不需要修改** - 直接使用
- 定义 `iaacf_initSDK` C 函数
- 处理初始化逻辑和 launchOptions

### ✅ IAACoreAdsBridge.mm - 其他接口桥接
- **不需要修改** - 直接使用
- 定义其他 C 函数（`iaacf_showAd`、`iaacf_checkOpenWebAccessable` 等）

## 七、需要配置的地方

### 1. 在 AppDelegate 中设置 launchOptions

**必须配置，否则初始化可能失败：**

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

## 八、完整使用示例

### TypeScript 代码（与 Unity 完全一样）：

```typescript
import { IAAAdManager, AdType, AdEvent } from './sdk/IAAAdManager';

// 初始化 SDK
IAAAdManager.initSdk(
    (attributed: boolean, info: string) => {
        console.log('User Attribute:', attributed, info);
    },
    (initialized: boolean) => {
        console.log('Ad Init:', initialized);
        if (initialized) {
            // 初始化成功后显示广告
            if (IAAAdManager.isAdReady(AdType.AD_TYPE_Interstitial)) {
                IAAAdManager.showAd(
                    AdType.AD_TYPE_Interstitial,
                    'placement_id',
                    (adType, adEvent, error) => {
                        console.log('Ad Event:', adType, adEvent, error);
                        if (adEvent === AdEvent.Rewarded) {
                            // 给予奖励
                        }
                    }
                );
            }
        }
    }
);

// 检查网页可访问性
IAAAdManager.checkOpenWebAccessable((accessable: boolean) => {
    console.log('Web Accessable:', accessable);
});

// 显示应用商店页面
IAAAdManager.showAppstorePage((success: boolean) => {
    console.log('Show Appstore:', success);
});

// 记录事件
IAAAdManager.logSensorEvent('level_complete', {
    level: 1,
    score: 100
});

// 应用进入游戏
IAAAdManager.applicationDidEnterGame();

// 获取 SDK 版本
const version = IAAAdManager.getSDKVersion();
console.log('SDK Version:', version);
```

## 九、与 Unity 的接口对比

| Unity (C#) | Cocos Creator (TypeScript) | 说明 |
|------------|---------------------------|------|
| `AdManager.InitSdk(callback1, callback2)` | `IAAAdManager.initSdk(callback1, callback2)` | ✅ 完全一样 |
| `AdManager.ShowAd(type, placement, callback)` | `IAAAdManager.showAd(type, placement, callback)` | ✅ 完全一样 |
| `AdManager.CheckOpenWebAccessable(callback)` | `IAAAdManager.checkOpenWebAccessable(callback)` | ✅ 完全一样 |
| `AdManager.ShowOpenWebPage()` | `IAAAdManager.showOpenWebPage()` | ✅ 完全一样 |
| `AdManager.cancelAdShow(type)` | `IAAAdManager.cancelAdShow(type)` | ✅ 完全一样 |
| `AdManager.isAdReady(type)` | `IAAAdManager.isAdReady(type)` | ✅ 完全一样 |
| `AdManager.ShowAppstorePage(callback)` | `IAAAdManager.showAppstorePage(callback)` | ✅ 完全一样 |
| `AdManager.LogSensorEvent(name, props)` | `IAAAdManager.logSensorEvent(name, props)` | ✅ 完全一样 |
| `AdManager.ApplicationDidEnterGame()` | `IAAAdManager.applicationDidEnterGame()` | ✅ 完全一样 |
| `AdManager.GetSDKVersion()` | `IAAAdManager.getSDKVersion()` | ✅ 完全一样 |

## 十、总结

### ✅ 优势：
1. **原生 iOS 代码完全不变** - `IAACHelper.h`、`IAACInitManager.h/.mm`、`IAACoreAdsBridge.mm` 都不需要修改
2. **接口与 Unity 完全一致** - TypeScript 调用方式与 Unity C# 完全相同
3. **最小化包装层** - 只有一个简化的 `IAAJSBridge.mm` 文件
4. **易于维护** - 原生代码可以复用，只需要维护一个包装层

### ⚠️ 注意事项：
1. **必须在 AppDelegate 中设置 launchOptions** - 否则初始化可能失败
2. **ScriptEngine 头文件路径** - 可能需要根据 Cocos Creator 版本调整
3. **回调机制** - 通过 `evalString` 实现，不是直接传递函数

### 📝 文件清单：
- ✅ `native/ios/IAACHelper.h` - 保持不变
- ✅ `native/ios/IAACInitManager.h` - 保持不变
- ✅ `native/ios/IAACInitManager.mm` - 保持不变
- ✅ `native/ios/IAACoreAdsBridge.mm` - 保持不变
- ✨ `native/ios/IAAJSBridge.mm` - 新建（简化的包装层）
- ✨ `assets/sdk/IAAAdManager.ts` - 新建（TypeScript 桥接脚本）

完成！现在你可以像 Unity 一样使用 SDK 了！

