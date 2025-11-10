# iOS 代码完整分析报告

## 一、问题总结

### ❌ 问题 1：JSB 不能直接传递 JavaScript 函数作为回调

**位置：** `IAAAdManager.ts` 第 105-110 行、130-136 行等

**当前代码：**
```typescript
jsb.reflection.callStaticMethod(
    'IAAAdsBridge',
    'initSDK:adInitCallback:',
    userAttributeCallback,  // ❌ 不能传递 JavaScript 函数
    adInitCallback
);
```

**问题说明：**
- Cocos Creator 的 JSB 不支持直接传递 JavaScript 函数作为回调参数
- Unity 的 P/Invoke 可以传递 C# 委托，但 Cocos Creator 的 JSB 不支持
- 需要从原生代码回调到 JavaScript，而不是传递函数指针

**修复状态：** ✅ 已修复 - 移除了回调函数参数传递

---

### ❌ 问题 2：缺少 Objective-C 类包装

**位置：** TypeScript 调用 `IAAAdsBridge` 类方法，但只有 C 函数

**当前情况：**
- `IAACInitManager.mm` 定义了 `iaacf_initSDK` C 函数
- `IAACoreAdsBridge.mm` 定义了 `iaacf_showAd` 等 C 函数
- TypeScript 调用的是 `IAAAdsBridge` 类的静态方法
- **缺少 `IAAAdsBridge.mm` 文件**（用户已删除）

**问题说明：**
- JSB 的 `callStaticMethod` 只能调用 Objective-C 类的静态方法
- 不能直接调用 C 函数（`iaacf_*`）
- 需要创建 Objective-C 类来包装这些 C 函数

**修复状态：** ✅ 已修复 - 创建了 `IAAAdsBridge.mm` 包装类

---

### ❌ 问题 3：回调机制不匹配

**位置：** `IAACInitManager.mm` 和 `IAACoreAdsBridge.mm`

**当前代码：**
```objective-c
void iaacf_initSDK(IAAUserAttributeResultCallback userCallback, IAAAdInitResultCallback adInitCallback) {
    _userAttributeCallback = userCallback;  // ❌ 这是 C 函数指针，不是 JavaScript 回调
    // ...
    if (_userAttributeCallback) {
        _userAttributeCallback(attributed, infoJson);  // ❌ 调用 C 函数指针，无法回调到 JavaScript
    }
}
```

**问题说明：**
- Unity 的代码使用 C 函数指针作为回调
- Cocos Creator 需要从原生代码回调到 JavaScript
- 不能直接使用 C 函数指针，需要转换为 JavaScript 调用

**修复状态：** ✅ 已修复 - 在 `IAAAdsBridge.mm` 中实现了回调到 JavaScript 的机制

---

### ❌ 问题 4：内存管理问题

**位置：** `IAACoreAdsBridge.mm` 第 72-74 行

**当前代码：**
```objective-c
const char* iaacf_sdkVersion() {
    return CStringCopy([IAA_CoreAds iaa_sdkVersion]);  // ❌ 返回的 C 字符串需要释放
}
```

**问题说明：**
- `CStringCopy` 返回的 C 字符串需要调用 `free()` 释放
- 如果 Objective-C 方法返回 NSString，会自动管理内存
- 如果返回 C 字符串，调用者需要负责释放

**修复状态：** ✅ 已修复 - 在 `IAAAdsBridge.mm` 中正确处理内存释放

---

### ❌ 问题 5：初始化逻辑需要适配 Cocos Creator

**位置：** `IAACInitManager.mm` 第 10-38 行

**当前代码：**
```objective-c
void iaacf_initSDK(IAAUserAttributeResultCallback userCallback, IAAAdInitResultCallback adInitCallback) {
    // 检查 didFinishLaunchWithOptions
    if ([IAACInitManager iaacf_shared].didFinishLaunchWithOptions) {
        // 直接初始化
    } else {
        // 监听 UIApplicationDidFinishLaunchingNotification
    }
}
```

**问题说明：**
- Unity 的代码假设在 `didFinishLaunchingWithOptions` 中设置 `launchOptions`
- Cocos Creator 需要在 AppDelegate 中设置，或者使用其他方式获取
- 需要确保 `IAACInitManager` 的 `launchOptions` 被正确设置

**修复状态：** ⚠️ 需要验证 - 需要确保 AppDelegate 中正确设置 launchOptions

---

### ❌ 问题 6：ScriptEngine 头文件路径可能不正确

**位置：** `IAAAdsBridge.mm` 第 13 行

**当前代码：**
```objective-c
#import "cocos/scripting/js-bindings/jswrapper/SeApi.h"
```

**问题说明：**
- Cocos Creator 3.8 的头文件路径可能不同
- 需要根据实际项目结构调整
- 可能需要使用相对路径或绝对路径

**修复状态：** ⚠️ 需要验证 - 需要根据实际项目结构调整

---

## 二、Unity vs Cocos Creator 差异对比

| 特性 | Unity | Cocos Creator 3.8 |
|------|-------|-------------------|
| **调用方式** | P/Invoke (C# → C) | JSB Reflection (TypeScript → Objective-C) |
| **回调机制** | C# 委托 → C 函数指针 | 原生代码 → JavaScript evalString |
| **函数签名** | C 函数 | Objective-C 类方法 |
| **内存管理** | C# GC 管理 | 手动管理 C 字符串 |
| **线程模型** | Unity 主线程 | Cocos Creator 主线程 |
| **回调传递** | ✅ 可以传递委托 | ❌ 不能传递函数 |

---

## 三、需要修改的文件

### 1. ✅ `native/ios/IAAAdsBridge.mm` - 已创建

**作用：** 将 Unity 的 C 函数包装成 Objective-C 类方法，供 JSB 调用

**主要功能：**
- 包装所有 C 函数为 Objective-C 类方法
- 实现回调到 JavaScript 的机制
- 处理内存管理

### 2. ✅ `assets/sdk/IAAAdManager.ts` - 已修复

**修改内容：**
- 移除了回调函数参数传递
- 修改了 JSB 调用方式
- 保留了静态回调方法供原生调用

### 3. ⚠️ `IAACInitManager.mm` - 需要验证

**需要检查：**
- `launchOptions` 是否正确设置
- `didFinishLaunchWithOptions` 是否正确设置
- 通知监听是否正确

### 4. ✅ `IAACoreAdsBridge.mm` - 可以复用

**状态：** 可以复用，不需要修改

### 5. ✅ `IAACHelper.h` - 可以复用

**状态：** 可以复用，不需要修改

---

## 四、关键修改点

### 1. 回调机制修改

**Unity 方式（原始代码）：**
```objective-c
void iaacf_initSDK(IAAUserAttributeResultCallback userCallback, IAAAdInitResultCallback adInitCallback) {
    _userAttributeCallback = userCallback;  // 保存 C 函数指针
    // ...
    if (_userAttributeCallback) {
        _userAttributeCallback(attributed, infoJson);  // 调用 C 函数指针
    }
}
```

**Cocos Creator 方式（修复后）：**
```objective-c
+ (void)initSDK {
    iaacf_initSDK(^(bool attributed, const char* infoJson) {
        // 回调到 JavaScript，而不是调用 C 函数指针
        NSString* jsCode = [NSString stringWithFormat:@"IAAAdManager.onUserAttributeResult(%@, '%@');", 
                           attributed ? @"true" : @"false", CreateNSString(infoJson)];
        se::ScriptEngine::getInstance()->evalString([jsCode UTF8String]);
    }, ^(bool initialized) {
        // 回调到 JavaScript
        NSString* jsCode = [NSString stringWithFormat:@"IAAAdManager.onAdInitResult(%@);", 
                           initialized ? @"true" : @"false"];
        se::ScriptEngine::getInstance()->evalString([jsCode UTF8String]);
    });
}
```

### 2. 方法签名修改

**Unity 方式（原始代码）：**
```objective-c
+ (void)initSDK:(void(^)(bool, NSString*))userCallback adInitCallback:(void(^)(bool))adInitCallback;
```

**Cocos Creator 方式（修复后）：**
```objective-c
+ (void)initSDK;  // 不接收回调参数
```

### 3. TypeScript 调用修改

**Unity 方式（原始代码）：**
```typescript
jsb.reflection.callStaticMethod(
    'IAAAdsBridge',
    'initSDK:adInitCallback:',
    userAttributeCallback,  // ❌ 不能传递
    adInitCallback
);
```

**Cocos Creator 方式（修复后）：**
```typescript
jsb.reflection.callStaticMethod(
    'IAAAdsBridge',
    'initSDK'  // ✅ 不传递回调参数
);
// 回调通过原生代码调用静态方法实现
```

---

## 五、需要验证的问题

### 1. ScriptEngine 头文件路径

**问题：** `IAAAdsBridge.mm` 中的头文件路径可能不正确

**当前代码：**
```objective-c
#import "cocos/scripting/js-bindings/jswrapper/SeApi.h"
```

**需要验证：**
- 在 Cocos Creator 3.8 中，ScriptEngine 的头文件路径是什么？
- 是否需要使用相对路径？
- 是否需要添加到 Xcode 的 Header Search Paths？

**可能的路径：**
- `cocos/scripting/js-bindings/jswrapper/SeApi.h`
- `scripting/js-bindings/jswrapper/SeApi.h`
- `jsb/jswrapper/SeApi.h`

### 2. launchOptions 设置

**问题：** `IAACInitManager` 的 `launchOptions` 需要正确设置

**需要验证：**
- Cocos Creator 的 AppDelegate 中是否正确设置了 `launchOptions`？
- `didFinishLaunchWithOptions` 是否正确设置？
- 通知监听是否正确？

**可能的解决方案：**
- 在 Cocos Creator 的 AppDelegate 中设置 `launchOptions`
- 或者在初始化时手动设置

### 3. 回调执行线程

**问题：** 回调是否需要在主线程执行？

**当前代码：**
```objective-c
dispatch_async(dispatch_get_main_queue(), ^{
    se::ScriptEngine::getInstance()->evalString([jsCode UTF8String]);
});
```

**需要验证：**
- ScriptEngine 的 `evalString` 是否需要在主线程执行？
- 原生 SDK 的回调是否在主线程？

---

## 六、修复后的代码结构

```
native/ios/
├── IAAAdsBridge.mm          ✅ 新建 - Objective-C 类包装，供 JSB 调用
├── IAACInitManager.mm       ✅ 复用 - 初始化逻辑（需要验证 launchOptions）
├── IAACInitManager.h        ✅ 复用 - 初始化管理器头文件
├── IAACoreAdsBridge.mm      ✅ 复用 - 其他接口函数（不需要修改）
└── IAACHelper.h             ✅ 复用 - 辅助函数（不需要修改）

assets/sdk/
└── IAAAdManager.ts           ✅ 已修复 - 移除了回调函数参数传递
```

---

## 七、测试建议

### 1. 编译测试
- 在 Xcode 中编译项目
- 检查是否有编译错误
- 检查头文件路径是否正确

### 2. 运行测试
- 在真实设备上运行
- 测试初始化接口
- 测试回调是否正常触发
- 检查控制台日志

### 3. 调试检查
- 检查 ScriptEngine 是否已初始化
- 检查回调是否执行
- 检查 JavaScript 代码是否执行
- 检查内存泄漏

---

## 八、总结

### 主要问题
1. ❌ JSB 不能直接传递 JavaScript 函数作为回调 - ✅ 已修复
2. ❌ 缺少 Objective-C 类包装 - ✅ 已修复
3. ❌ 回调机制不匹配 - ✅ 已修复
4. ❌ 内存管理问题 - ✅ 已修复
5. ⚠️ 初始化逻辑需要验证 - 需要确保 AppDelegate 中正确设置
6. ⚠️ ScriptEngine 头文件路径需要验证 - 需要根据实际项目调整

### 修复状态
- ✅ **已修复**：JSB 调用方式、回调机制、内存管理
- ⚠️ **需要验证**：ScriptEngine 头文件路径、launchOptions 设置

### 可行性评估
- ✅ **基本可行**：代码结构合理，只需要适配 Cocos Creator 的 JSB 机制
- ⚠️ **需要修改**：不能直接使用 Unity 的代码，需要适配
- ✅ **可以复用**：大部分原生 SDK 调用逻辑可以复用

### 下一步
1. 验证 ScriptEngine 头文件路径
2. 确保 AppDelegate 中正确设置 launchOptions
3. 在真实设备上测试
4. 验证所有接口功能

