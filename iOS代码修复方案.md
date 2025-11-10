# iOS 代码修复方案

## 问题总结

经过分析，发现以下主要问题：

### 1. ❌ JSB 不能直接传递 JavaScript 函数作为回调

**问题：** Cocos Creator 的 JSB 不支持直接传递 JavaScript 函数作为回调参数。

**当前代码：**
```typescript
jsb.reflection.callStaticMethod(
    'IAAAdsBridge',
    'initSDK:adInitCallback:',
    userAttributeCallback,  // ❌ 不能传递 JavaScript 函数
    adInitCallback
);
```

**修复：** 已修改为不传递回调参数，改为从原生代码回调到 JavaScript。

### 2. ❌ Objective-C 类方法签名不匹配

**问题：** Objective-C 类方法试图接收 block 回调，但 JSB 不支持。

**当前代码：**
```objective-c
+ (void)initSDK:(void(^)(bool, NSString*))userCallback adInitCallback:(void(^)(bool))adInitCallback;
```

**修复：** 已修改为不接收回调参数，改为通过 `evalString` 回调到 JavaScript。

### 3. ❌ 回调机制未实现

**问题：** `callbackToJS` 函数中只有 `NSLog`，没有实际执行 JavaScript 代码。

**当前代码：**
```objective-c
static void callbackToJS(NSString* jsCode) {
    dispatch_async(dispatch_get_main_queue(), ^{
        NSLog(@"[IAAAdsBridge] Callback to JS: %@", jsCode);
        // TODO: 使用正确的 JSB 回调机制
    });
}
```

**修复方案：** 需要使用 Cocos Creator 的 ScriptEngine 执行 JavaScript 代码。

## 修复方案

### 方案 1：使用 se::ScriptEngine（推荐）

在 `IAAAdsBridge.mm` 中添加正确的头文件和实现：

```objective-c
#import "cocos/scripting/js-bindings/jswrapper/SeApi.h"

static void callbackToJS(NSString* jsCode) {
    dispatch_async(dispatch_get_main_queue(), ^{
        se::ScriptEngine* se = se::ScriptEngine::getInstance();
        if (se) {
            se->evalString([jsCode UTF8String]);
        } else {
            NSLog(@"[IAAAdsBridge] ERROR: ScriptEngine not initialized!");
        }
    });
}
```

### 方案 2：使用 jsb.reflection.callStaticMethod（备选）

如果 ScriptEngine 不可用，可以使用反射机制：

```objective-c
static void callbackToJS(NSString* jsCode) {
    dispatch_async(dispatch_get_main_queue(), ^{
        // 使用反射机制调用 JavaScript 方法
        // 注意：需要确保方法存在
        se::Value ret;
        se::Object* globalObj = se::ScriptEngine::getInstance()->getGlobalObject();
        se::Object* funcObj = nullptr;
        if (globalObj->getProperty("eval", &funcObj) && funcObj->isFunction()) {
            se::ValueArray args;
            args.push_back(se::Value([jsCode UTF8String]));
            funcObj->call(args, globalObj, &ret);
        }
    });
}
```

## 需要修复的文件

### 1. `native/ios/IAAAdsBridge.mm`

**需要添加：**
```objective-c
#import "cocos/scripting/js-bindings/jswrapper/SeApi.h"
```

**需要修改：**
- `callbackToJS` 函数实现
- 确保所有回调都正确执行 JavaScript 代码

### 2. `assets/sdk/IAAAdManager.ts`

**已修复：**
- ✅ 移除了回调函数参数传递
- ✅ 修改了 JSB 调用方式

**需要验证：**
- 确保静态回调方法可以被原生代码调用
- 确保回调方法在主线程执行

## 验证步骤

1. **编译测试**
   - 在 Xcode 中编译项目
   - 检查是否有编译错误

2. **运行测试**
   - 在真实设备上运行
   - 测试初始化接口
   - 测试回调是否正常触发

3. **调试检查**
   - 检查控制台日志
   - 确认回调是否执行
   - 确认 JavaScript 代码是否执行

## 注意事项

1. **线程安全**
   - 所有回调必须在主线程执行
   - 使用 `dispatch_async(dispatch_get_main_queue())` 确保主线程执行

2. **内存管理**
   - 确保所有 C 字符串正确释放
   - 使用 `free()` 释放 `CStringCopy` 返回的字符串

3. **错误处理**
   - 检查 ScriptEngine 是否已初始化
   - 处理回调执行失败的情况

4. **字符串转义**
   - 转义单引号，避免 JavaScript 语法错误
   - 使用 JSON 序列化处理复杂对象

## 完整修复代码

请参考修复后的 `IAAAdsBridge.mm` 文件，主要修改：

1. ✅ 移除了回调函数参数
2. ✅ 修改了方法签名
3. ✅ 实现了回调机制（需要添加正确的头文件）
4. ✅ 修复了内存管理问题
5. ✅ 统一了初始化逻辑

## 下一步

1. 添加正确的头文件引用
2. 实现 `callbackToJS` 函数
3. 在真实设备上测试
4. 验证所有接口功能

