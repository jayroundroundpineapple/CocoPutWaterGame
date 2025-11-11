# iOS 代码详细分析报告

## 一、核心问题分析

### ❌ 问题 1：JSB 不能直接传递 JavaScript 函数作为回调

**位置：** `IAAAdManager.ts` 第 105-110 行、130-136 行等

**当前代码：**
```typescript
jsb.reflection.callStaticMethod(
    'IAAAdsBridge',
    'initSDK:adInitCallback:',
    userAttributeCallback,  // ❌ 不能传递 JavaScript 函数
    adInitCallback          // ❌ 不能传递 JavaScript 函数
);
```

**问题说明：**
- Cocos Creator 的 JSB 不支持直接传递 JavaScript 函数作为回调参数
- Unity 的 P/Invoke 可以传递 C# 委托，但 Cocos Creator 的 JSB 不支持
- 需要从原生代码回调到 JavaScript，而不是传递函数指针

**影响：**
- 代码无法编译或运行时会报错
- 回调无法正常工作

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

**影响：**
- 编译时会找不到 `IAAAdsBridge` 类
- 运行时调用会失败

---

### ❌ 问题 3：回调机制不匹配

**位置：** `IAACInitManager.mm` 和 `IAACoreAdsBridge.mm`

**当前代码：**
```objective-c
void iaacf_initSDK(IAAUserAttributeResultCallback userCallback, IAAAdInitResultCallback adInitCallback) {
    _userAttributeCallback = userCallback;  // ❌ 这是 C 函数指针，不是 JavaScript 回调
    _adInitCallback = adInitCallback;
    // ...
}
```

**问题说明：**
- Unity 的代码使用 C 函数指针作为回调
- Cocos Creator 需要从原生代码回调到 JavaScript
- 不能直接使用 C 函数指针，需要转换为 JavaScript 调用

**影响：**
- 回调无法触发
- 即使原生 SDK 回调了，也无法通知到 JavaScript

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

**影响：**
- 内存泄漏
- 可能导致崩溃

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

**影响：**
- 初始化可能失败
- 无法获取正确的 launchOptions

---

## 二、Unity vs Cocos Creator 差异

| 特性 | Unity | Cocos Creator 3.8 |
|------|-------|-------------------|
| **调用方式** | P/Invoke (C# → C) | JSB Reflection (TypeScript → Objective-C) |
| **回调机制** | C# 委托 → C 函数指针 | 原生代码 → JavaScript evalString |
| **函数签名** | C 函数 | Objective-C 类方法 |
| **内存管理** | C# GC 管理 | 手动管理 C 字符串 |
| **线程模型** | Unity 主线程 | Cocos Creator 主线程 |

---

## 三、修复方案

### 方案 1：创建 IAAAdsBridge.mm 包装类（推荐）

需要创建一个新的 `IAAAdsBridge.mm` 文件，将 C 函数包装成 Objective-C 类方法，并实现正确的回调机制。

### 方案 2：修改现有代码

修改 `IAACInitManager.mm` 和 `IAACoreAdsBridge.mm`，添加 Objective-C 类包装。

---

## 四、需要修改的文件

1. ✅ **创建 `IAAAdsBridge.mm`** - 包装所有 C 函数为 Objective-C 类方法
2. ✅ **修改 `IAAAdManager.ts`** - 移除回调函数参数传递
3. ✅ **修改 `IAACInitManager.mm`** - 添加回调到 JavaScript 的机制
4. ✅ **修改 `IAACoreAdsBridge.mm`** - 添加回调到 JavaScript 的机制
5. ✅ **确保 AppDelegate 设置 launchOptions** - 在 Cocos Creator 的 AppDelegate 中设置

---

## 五、关键修改点

### 1. 回调机制修改

**Unity 方式（当前代码）：**
```objective-c
void iaacf_initSDK(IAAUserAttributeResultCallback userCallback, IAAAdInitResultCallback adInitCallback) {
    _userAttributeCallback = userCallback;  // 保存 C 函数指针
    // ...
    if (_userAttributeCallback) {
        _userAttributeCallback(attributed, infoJson);  // 调用 C 函数指针
    }
}
```

**Cocos Creator 方式（需要修改）：**
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

**Unity 方式（当前代码）：**
```objective-c
+ (void)initSDK:(void(^)(bool, NSString*))userCallback adInitCallback:(void(^)(bool))adInitCallback;
```

**Cocos Creator 方式（需要修改）：**
```objective-c
+ (void)initSDK;  // 不接收回调参数
```

### 3. TypeScript 调用修改

**Unity 方式（当前代码）：**
```typescript
jsb.reflection.callStaticMethod(
    'IAAAdsBridge',
    'initSDK:adInitCallback:',
    userAttributeCallback,  // ❌ 不能传递
    adInitCallback
);
```

**Cocos Creator 方式（需要修改）：**
```typescript
jsb.reflection.callStaticMethod(
    'IAAAdsBridge',
    'initSDK'  // ✅ 不传递回调参数
);
// 回调通过原生代码调用静态方法实现
```

---

## 六、总结

### 主要问题
1. ❌ JSB 不能直接传递 JavaScript 函数作为回调
2. ❌ 缺少 Objective-C 类包装（IAAAdsBridge.mm）
3. ❌ 回调机制不匹配（C 函数指针 vs JavaScript 回调）
4. ❌ 内存管理问题（C 字符串需要释放）
5. ❌ 初始化逻辑需要适配 Cocos Creator

### 修复优先级
1. **高优先级**：创建 IAAAdsBridge.mm 包装类
2. **高优先级**：实现正确的回调机制
3. **中优先级**：修复内存管理问题
4. **中优先级**：修改 TypeScript 调用方式
5. **低优先级**：优化初始化逻辑

### 可行性评估
- ✅ **基本可行**：代码结构合理，只需要适配 Cocos Creator 的 JSB 机制
- ⚠️ **需要修改**：不能直接使用 Unity 的代码，需要适配
- ✅ **可以复用**：大部分原生 SDK 调用逻辑可以复用


