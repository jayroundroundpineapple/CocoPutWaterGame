# iOS 代码问题分析

## 主要问题

### 1. ❌ JSB 不能直接传递 JavaScript 函数作为回调

**问题位置：** `IAAAdManager.ts` 第 105-110 行

```typescript
jsb.reflection.callStaticMethod(
    'IAAAdsBridge',
    'initSDK:adInitCallback:',
    userAttributeCallback,  // ❌ 不能直接传递 JavaScript 函数
    adInitCallback          // ❌ 不能直接传递 JavaScript 函数
);
```

**问题说明：** Cocos Creator 的 JSB 不支持直接传递 JavaScript 函数作为回调。需要从原生代码回调到 JavaScript，而不是传递函数指针。

**解决方案：** 
- 原生代码不接收回调函数参数
- 原生代码通过 `jsb.reflection.callStaticMethod` 或 `evalString` 回调到 JavaScript
- TypeScript 中定义静态回调方法供原生调用

### 2. ❌ Objective-C 类方法签名不匹配

**问题位置：** `IAAAdsBridge.mm` 第 193 行

```objective-c
+ (void)initSDK:(void(^)(bool, NSString*))userCallback adInitCallback:(void(^)(bool))adInitCallback;
```

**问题说明：** JSB 不能传递 block 回调，方法签名应该只接收基本类型参数。

**解决方案：** 修改方法签名，不接收回调参数，改为从原生代码回调到 JavaScript。

### 3. ❌ 初始化逻辑重复且不一致

**问题位置：** 
- `IAAAdsBridge.mm` 定义了 `initSDK` 函数
- `IAACInitManager.mm` 定义了 `iaacf_initSDK` 函数
- TypeScript 调用的是 `IAAAdsBridge` 类方法

**问题说明：** 三个地方定义了不同的初始化逻辑，但只有 `IAAAdsBridge` 类方法被调用，其他两个没有被使用。

**解决方案：** 统一使用 `IAAAdsBridge` 类方法，整合 `IAACInitManager` 的初始化逻辑。

### 4. ❌ IAACoreAdsBridge.mm 没有被使用

**问题位置：** `IAACoreAdsBridge.mm` 定义了其他接口函数，但没有对应的 Objective-C 类包装。

**问题说明：** TypeScript 调用的是 `IAAAdsBridge` 类方法，但 `IAACoreAdsBridge.mm` 中的函数没有被包装成类方法。

**解决方案：** 将 `IAACoreAdsBridge.mm` 中的函数包装到 `IAAAdsBridge` 类中，或者统一使用一个文件。

### 5. ❌ 内存管理问题

**问题位置：** `IAAAdsBridge.mm` 第 186-187 行

```objective-c
const char* getSDKVersion() {
    return CStringCopy([IAA_CoreAds iaa_sdkVersion]);  // ❌ 返回的 C 字符串需要释放
}
```

**问题说明：** `CStringCopy` 返回的 C 字符串需要调用 `free()` 释放，但 Objective-C 方法返回 NSString，这会导致内存泄漏。

**解决方案：** Objective-C 方法应该返回 NSString，而不是 C 字符串。

### 6. ❌ 辅助函数重复定义

**问题位置：** 
- `IAAAdsBridge.mm` 中定义了 `CStringCopy`、`CreateNSString` 等函数
- `IAACHelper.h` 中也定义了相同的函数

**问题说明：** 函数重复定义，应该统一使用 `IAACHelper.h` 中的定义。

**解决方案：** 在 `IAAAdsBridge.mm` 中删除重复定义，使用 `IAACHelper.h` 中的函数。

## 修复方案

### 方案 1：使用 JSB 回调机制（推荐）

1. **修改 TypeScript 代码**：不传递回调函数，改为定义静态回调方法
2. **修改 Objective-C 代码**：方法不接收回调参数，通过 `evalString` 回调到 JavaScript
3. **统一初始化逻辑**：使用 `IAACInitManager` 的初始化逻辑，但通过 `IAAAdsBridge` 类调用

### 方案 2：使用 Cocos Creator 的 JSB 绑定

1. 使用 Cocos Creator 的 JSB 绑定工具生成绑定代码
2. 定义回调接口
3. 自动生成 TypeScript 和 Objective-C 代码

## 建议

1. **统一文件结构**：将所有接口统一到一个文件中
2. **使用 JSB 回调机制**：从原生代码回调到 JavaScript，而不是传递函数指针
3. **修复内存管理**：确保所有 C 字符串正确释放
4. **测试验证**：在真实设备上测试所有接口

