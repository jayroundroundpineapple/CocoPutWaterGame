# Cocos Creator 3.8 SDK 接入指南

## 概述

本指南介绍如何在 Cocos Creator 3.8 中接入 IAA SDK
## 目录结构

```
项目根目录/
├── assets/
│   └── core/
│       └── IAAAdManager.ts          # TypeScript SDK 接口封装
├── native/
│   ├── ios/
│   │   ├── IAAAdsBridge.mm          # iOS 原生桥接代码
│   │   └── IAAHelper.h              # iOS 辅助头文件
│   └── android/
│       └── IAAAdsBridge.java        # Android 原生桥接代码
└── SDK_接入指南.md                   # 本文档
```

## 一、SDK 接入步骤

### 1. 复制文件到项目

将以下文件复制到你的 Cocos Creator 项目：

1. **TypeScript 接口文件**
   - `assets/core/IAAAdManager.ts` → 复制到项目的 `assets/core/` 目录

2. **iOS 原生文件**
   - `native/ios/IAAAdsBridge.mm` → 复制到项目的 `native/ios/` 目录
   - `native/ios/IAAHelper.h` → 复制到项目的 `native/ios/` 目录（如果存在）

3. **Android 原生文件**
   - `native/android/IAAAdsBridge.java` → 复制到项目的 `native/android/` 目录

### 2. 配置原生 SDK

#### iOS 配置

1. 将你的 iOS SDK（如 OpenPixel.framework）放到 `native/ios/` 目录
2. 在 Xcode 项目中添加 Framework 引用
3. 在 `IAAAdsBridge.mm` 中导入你的 SDK 头文件

#### Android 配置

1. 将你的 Android SDK（.aar 或 .jar）放到 `native/android/libs/` 目录
2. 在 `build.gradle` 中添加依赖
3. 在 `IAAAdsBridge.java` 中导入你的 SDK 类

### 3. 在代码中使用

```typescript
import { IAAAdManager, AdType, AdEvent } from './core/IAAAdManager';

// 初始化 SDK
IAAAdManager.initSdk(
    (attributed: boolean, info: string) => {
        console.log('User Attribute:', attributed, info);
    },
    (initialized: boolean) => {
        console.log('Ad Init:', initialized);
    }
);

// 显示广告
IAAAdManager.showAd(
    AdType.AD_TYPE_Interstitial,
    'placement_id',
    (adType: AdType, adEvent: AdEvent, error: string) => {
        console.log('Ad Event:', adType, adEvent, error);
        if (adEvent === AdEvent.Rewarded) {
            // 给予奖励
        }
    }
);

// 检查广告是否准备好
if (IAAAdManager.isAdReady(AdType.AD_TYPE_Reward)) {
    // 显示广告
}

// 记录事件
IAAAdManager.logSensorEvent('level_complete', {
    level: 1,
    score: 100
});
```

## 二、插件导出方案

### 方案 1：直接导出文件夹（推荐）

1. **创建插件文件夹结构**
   ```
   IAA_SDK_Plugin/
   ├── assets/
   │   └── core/
   │       └── IAAAdManager.ts
   ├── native/
   │   ├── ios/
   │   │   ├── IAAAdsBridge.mm
   │   │   └── IAAHelper.h
   │   └── android/
   │       └── IAAAdsBridge.java
   └── README.md
   ```

2. **压缩为 ZIP 文件**
   - 将整个 `IAA_SDK_Plugin` 文件夹压缩为 `IAA_SDK_Plugin.zip`
   - 提供给合作 CP

3. **CP 接入步骤**
   - 解压 ZIP 文件
   - 将 `assets/` 和 `native/` 文件夹复制到项目根目录
   - 按照上述步骤配置原生 SDK

### 方案 2：使用 Cocos Creator 扩展插件

1. **创建扩展插件**
   ```
   extensions/iaa-sdk/
   ├── package.json
   ├── main.ts
   └── templates/
       ├── assets/
       └── native/
   ```

2. **实现自动安装脚本**
   - 在 `main.ts` 中实现文件复制逻辑
   - 提供安装向导界面

3. **导出为 .cocos 扩展包**
   - 使用 Cocos Creator 的扩展打包功能
   - CP 可以直接在扩展管理器中安装

### 方案 3：使用 npm 包（适用于纯 TypeScript 部分）

1. **创建 npm 包**
   ```json
   {
     "name": "@iaa/sdk-cocos",
     "version": "1.0.0",
     "main": "dist/IAAAdManager.js"
   }
   ```

2. **发布到私有 npm 仓库**
   - CP 通过 `npm install` 安装
   - 原生部分仍需手动配置

## 三、与 Unity 方案的对比

| 特性 | Unity | Cocos Creator 3.8 |
|------|-------|-------------------|
| 接口语言 | C# | TypeScript |
| 原生桥接 | P/Invoke (iOS), JNI (Android) | JSB (iOS), JSB (Android) |
| 回调机制 | C# Action/Delegate | TypeScript 函数回调 |
| 插件导出 | .unitypackage | 文件夹/ZIP/扩展插件 |
| 单例管理 | MonoBehaviour | Component (单例) |

## 四、注意事项

1. **JSB 调用限制**
   - JSB 只能在原生平台（iOS/Android）上使用
   - 编辑器环境下会跳过原生调用

2. **线程安全**
   - 原生回调需要在主线程执行
   - iOS 使用 `dispatch_async(dispatch_get_main_queue())`
   - Android 使用 `runOnUiThread()`

3. **内存管理**
   - iOS 需要手动释放 C 字符串内存
   - Android 使用 Java 对象，由 GC 管理

4. **版本兼容**
   - 确保 Cocos Creator 版本 >= 3.8.0
   - 检查 JSB API 兼容性

## 五、常见问题

### Q1: 编辑器环境下如何测试？
A: 编辑器环境下会跳过原生调用，可以在代码中添加模拟逻辑。

### Q2: 如何调试原生代码？
A: 使用 Xcode (iOS) 或 Android Studio (Android) 进行调试，设置断点。

### Q3: 如何处理异步回调？
A: 使用 TypeScript 的 Promise 或 async/await 封装回调。

### Q4: 插件如何更新？
A: 提供版本号，CP 替换文件即可。建议使用语义化版本号。

## 六、示例代码

完整示例请参考项目中的 `assets/core/IAAAdManager.ts` 文件。

## 七、技术支持

如有问题，请联系技术支持团队。

