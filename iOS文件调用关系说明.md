# iOS 文件调用关系说明

## 一、文件作用说明

### 1. **IAAAdManager.ts** - TypeScript 接口层
**作用：** Cocos Creator 的 TypeScript 接口，供游戏代码调用
**位置：** `assets/sdk/IAAAdManager.ts`
**功能：**
- 封装所有 SDK 接口
- 管理回调函数
- 通过 JSB 调用原生代码

### 2. **IAAAdsBridge.mm** - Objective-C 包装层
**作用：** 将 C 函数包装成 Objective-C 类方法，供 JSB 调用
**位置：** `native/ios/IAAAdsBridge.mm`
**功能：**
- 提供 Objective-C 类方法供 JSB 调用
- 调用 C 函数（`iaacf_*`）
- 实现回调到 JavaScript 的机制

### 3. **IAACInitManager.mm** - 初始化桥接层
**作用：** 处理 SDK 初始化逻辑，调用原生 iOS SDK
**位置：** `native/ios/IAACInitManager.mm`
**功能：**
- 定义 `iaacf_initSDK` C 函数
- 处理 `launchOptions` 和初始化时机
- 调用原生 SDK `IAA_CoreAds` 的初始化方法

### 4. **IAACInitManager.h** - 初始化管理器头文件
**作用：** 定义初始化管理器的接口和回调类型
**位置：** `native/ios/IAACInitManager.h`
**功能：**
- 定义回调函数指针类型
- 定义 `IAACInitManager` 类接口
- 声明静态回调变量

### 5. **IAACHelper.h** - 辅助函数
**作用：** 提供字符串转换等工具函数
**位置：** `native/ios/IAACHelper.h`
**功能：**
- `CreateNSString` - C 字符串转 NSString
- `CStringCopy` - NSString 转 C 字符串
- `DictionaryToJSON` - NSDictionary 转 JSON 字符串
- `JSONToDictionary` - JSON 字符串转 NSDictionary

### 6. **IAACoreAdsBridge.mm** - 其他接口桥接层
**作用：** 处理其他 SDK 接口（显示广告、检查网页等），调用原生 iOS SDK
**位置：** `native/ios/IAACoreAdsBridge.mm`
**功能：**
- 定义 `iaacf_showAd`、`iaacf_checkOpenWebAccessable` 等 C 函数
- 调用原生 SDK `IAA_CoreAds` 的其他方法

---

## 二、调用关系图

```
游戏代码 (TypeScript)
    ↓
IAAAdManager.ts (TypeScript 接口层)
    ↓ jsb.reflection.callStaticMethod
IAAAdsBridge.mm (Objective-C 包装层)
    ↓ 调用 C 函数
IAACInitManager.mm / IAACoreAdsBridge.mm (C 函数桥接层)
    ↓ 调用原生 SDK
IAA_CoreAds (原生 iOS SDK)
    ↓ 回调
IAACInitManager.mm / IAACoreAdsBridge.mm (C 函数回调)
    ↓ 回调
IAAAdsBridge.mm (Objective-C 回调到 JavaScript)
    ↓ evalString
IAAAdManager.ts (TypeScript 回调方法)
    ↓ 调用用户回调
游戏代码 (用户回调函数)
```

---

## 三、详细调用流程

### 初始化流程示例：

1. **游戏代码调用：**
   ```typescript
   IAAAdManager.initSdk(
       (attributed, info) => { ... },  // 用户回调
       (initialized) => { ... }        // 用户回调
   );
   ```

2. **IAAAdManager.ts 处理：**
   - 保存回调函数到静态变量
   - 调用 `jsb.reflection.callStaticMethod('IAAAdsBridge', 'initSDK:adInitCallback:', ...)`

3. **IAAAdsBridge.mm 处理：**
   - 接收调用（但当前方法签名不匹配，需要修复）
   - 调用 `iaacf_initSDK` C 函数
   - 在 C 函数回调中，通过 `evalString` 回调到 JavaScript

4. **IAACInitManager.mm 处理：**
   - `iaacf_initSDK` 函数保存回调指针
   - 检查 `didFinishLaunchWithOptions`
   - 调用原生 SDK `IAA_CoreAds iaa_initSDKWithLaunchOptions`
   - 原生 SDK 回调时，调用保存的 C 函数指针

5. **回调流程：**
   - 原生 SDK 回调 → C 函数指针 → IAAAdsBridge.mm → evalString → IAAAdManager.ts → 用户回调

---

## 四、当前问题

### ❌ 问题：方法签名不匹配

**IAAAdManager.ts 第 107 行：**
```typescript
jsb.reflection.callStaticMethod(
    'IAAAdsBridge',
    'initSDK:adInitCallback:',  // ❌ 传递回调函数参数
    userAttributeCallback,
    adInitCallback
);
```

**IAAAdsBridge.mm 第 43 行：**
```objective-c
+ (void)initSDK;  // ❌ 不接收回调参数
```

**问题说明：**
- TypeScript 调用的是 `'initSDK:adInitCallback:'` 方法，并传递两个回调函数
- 但 Objective-C 定义的是 `+ (void)initSDK;` 方法，不接收任何参数
- 这会导致运行时找不到方法或参数不匹配

---

## 五、修复方案

需要修改 `IAAAdsBridge.mm`，使其方法签名与 TypeScript 调用匹配。但由于 JSB 不能直接传递 JavaScript 函数，需要采用以下方案：

### 方案 1：修改 IAAAdsBridge.mm 接收回调（但 JSB 不支持）

**不可行** - JSB 不能传递 JavaScript 函数

### 方案 2：修改 IAAAdManager.ts 不传递回调（推荐）

**可行** - 修改 TypeScript 调用方式，不传递回调参数

### 方案 3：使用混合方案

**可行** - TypeScript 不传递回调，但保持方法签名兼容

---

## 六、文件使用说明

### 1. IAACHelper.h - 工具函数库

**如何使用：**
- 在需要字符串转换的地方 `#import "IAACHelper.h"`
- 直接使用 `CreateNSString`、`CStringCopy` 等函数
- 不需要修改，可以直接使用

**示例：**
```objective-c
#import "IAACHelper.h"

const char* cstr = "hello";
NSString* nsstr = CreateNSString(cstr);  // C 字符串转 NSString

NSString* nsstr2 = @"world";
const char* cstr2 = CStringCopy(nsstr2);  // NSString 转 C 字符串
// 注意：CStringCopy 返回的字符串需要 free() 释放
free((void*)cstr2);
```

### 2. IAACInitManager.h - 初始化管理器头文件

**如何使用：**
- 定义回调函数指针类型
- 定义 `IAACInitManager` 类接口
- 在需要初始化的地方 `#import "IAACInitManager.h"`

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

### 3. IAACInitManager.mm - 初始化桥接实现

**如何使用：**
- 实现 `iaacf_initSDK` C 函数
- 处理初始化逻辑和 launchOptions
- 调用原生 SDK 的初始化方法

**关键功能：**
1. **iaacf_initSDK** - 初始化 SDK 的 C 函数
   - 保存回调函数指针
   - 检查 `didFinishLaunchWithOptions`
   - 如果已初始化，直接调用 SDK
   - 如果未初始化，监听 `UIApplicationDidFinishLaunchingNotification`

2. **IAACInitManager 类** - 管理初始化状态
   - `iaacf_shared` - 单例方法
   - `didFinishLaunchWithOptions` - 是否已完成启动
   - `launchOptions` - 启动选项

**注意事项：**
- 需要在 AppDelegate 中设置 `launchOptions` 和 `didFinishLaunchWithOptions`
- 确保在 `didFinishLaunchingWithOptions` 中调用：
  ```objective-c
  [IAACInitManager iaacf_shared].launchOptions = launchOptions;
  [IAACInitManager iaacf_shared].didFinishLaunchWithOptions = YES;
  ```

---

## 七、完整调用示例

### 1. 在 AppDelegate 中设置 launchOptions

```objective-c
#import "IAACInitManager.h"

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
    // 设置 launchOptions
    [IAACInitManager iaacf_shared].launchOptions = launchOptions;
    [IAACInitManager iaacf_shared].didFinishLaunchWithOptions = YES;
    
    // ... 其他初始化代码
    
    return YES;
}
```

### 2. TypeScript 调用

```typescript
IAAAdManager.initSdk(
    (attributed, info) => {
        console.log('User Attribute:', attributed, info);
    },
    (initialized) => {
        console.log('Ad Init:', initialized);
    }
);
```

### 3. 调用链

```
IAAAdManager.ts
  → IAAAdsBridge.mm (initSDK 方法)
    → IAACInitManager.mm (iaacf_initSDK C 函数)
      → IAA_CoreAds (原生 SDK)
        → 回调 → IAACInitManager.mm
          → 回调 → IAAAdsBridge.mm
            → evalString → IAAAdManager.ts
              → 用户回调
```

---

## 八、总结

### 文件作用总结：

1. **IAAAdManager.ts** - TypeScript 接口，供游戏调用
2. **IAAAdsBridge.mm** - Objective-C 包装，供 JSB 调用
3. **IAACInitManager.mm** - 初始化桥接，调用原生 SDK
4. **IAACInitManager.h** - 初始化管理器头文件
5. **IAACHelper.h** - 工具函数库
6. **IAACoreAdsBridge.mm** - 其他接口桥接，调用原生 SDK

### 使用方式：

- **IAACHelper.h** - 直接 `#import` 使用工具函数
- **IAACInitManager.h/.mm** - 自动使用，不需要手动调用
- **IAACoreAdsBridge.mm** - 自动使用，不需要手动调用
- **IAAAdsBridge.mm** - 通过 JSB 自动调用
- **IAAAdManager.ts** - 游戏代码直接调用

### 需要修复的问题：

- ❌ `IAAAdManager.ts` 和 `IAAAdsBridge.mm` 的方法签名不匹配
- ⚠️ 需要在 AppDelegate 中设置 `launchOptions`


