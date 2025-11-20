# Unity 与 Cocos Creator 目录结构对比

## Unity 目录结构

### Unity 项目中的位置：
```
Unity项目/
└── Assets/
    └── Plugins/
        └── iOS/
            ├── PixelInsight.xcframework/
            ├── IAACoreAdsJSB.mm
            ├── IAACoreAdsJSB.h
            ├── IAACInitManager.mm
            ├── IAACInitManager.h
            └── IAACHelper.h
```

### 导出到 Xcode 后的位置：
```
Xcode项目/
└── Unity-iPhone/
    ├── Frameworks/
    │   └── Plugins/
    │       └── iOS/
    │           └── PixelInsight.xcframework/  ← xcframework 在这里
    └── Libraries/
        └── Plugins/
            └── iOS/
                ├── IAACoreAdsJSB.mm          ← .mm/.h 文件在这里
                ├── IAACoreAdsJSB.h
                ├── IAACInitManager.mm
                ├── IAACInitManager.h
                └── IAACHelper.h
```

---

## Cocos Creator 目录结构

### Cocos Creator 项目中的位置（推荐）：

**方案 1：放在 `native/ios/` 目录（推荐，与 Unity 类似）**
```
CocosCreator项目/
└── native/
    └── ios/
        ├── Frameworks/
        │   └── PixelInsight.xcframework/
        ├── IAACoreAdsJSB.mm
        ├── IAACoreAdsJSB.h
        ├── IAACInitManager.mm
        ├── IAACInitManager.h
        └── IAACHelper.h
```

**方案 2：放在 `native/engine/ios/` 目录（当前你的位置）**
```
CocosCreator项目/
└── native/
    └── engine/
        └── ios/
            ├── Frameworks/
            │   └── PixelInsight.xcframework/
            ├── IAACoreAdsJSB.mm
            ├── IAACoreAdsJSB.h
            ├── IAACInitManager.mm
            ├── IAACInitManager.h
            └── IAACHelper.h
```

### 导出到 Xcode 后的位置：

**Cocos Creator 3.8 不会像 Unity 那样自动创建 `Plugins/iOS` 目录结构。**

在 Xcode 项目中，文件会出现在：

1. **xcframework**：
   - 如果手动添加到 Xcode，会出现在：
     - `项目名/Frameworks/PixelInsight.xcframework`（如果手动添加）
     - 或者直接在项目根目录下（取决于添加方式）

2. **.mm/.h 文件**：
   - 如果手动添加到 Xcode，会出现在：
     - `项目名/` 根目录下（如果直接添加）
     - 或者 `项目名/native/ios/` 下（如果保持目录结构）

---

## 关键差异

| 特性 | Unity | Cocos Creator 3.8 |
|------|-------|-------------------|
| **源文件位置** | `Assets/Plugins/iOS/` | `native/ios/` 或 `native/engine/ios/` |
| **自动添加到 Xcode** | ✅ 自动 | ❌ 需要手动添加 |
| **Xcode 中的位置** | `Libraries/Plugins/iOS/` | 取决于手动添加的位置 |
| **Framework 位置** | `Frameworks/Plugins/iOS/` | 取决于手动添加的位置 |
| **目录结构保持** | ✅ 保持 | ⚠️ 取决于添加方式 |

---

## 你的当前情况

根据你的项目结构，文件实际在：
- **xcframework**: `native/engine/ios/Frameworks/PixelInsight.xcframework/` 和 `native/engine/ios/PixelInsight.xcframework/`（有两个！）
- **源文件**: `native/engine/ios/` 目录下

但是 CMakeLists.txt 配置的是从 `native/ios/` 读取，所以需要：

### 选项 1：移动文件到 `native/ios/`（推荐）

```
native/
├── ios/                          ← 新建这个目录
│   ├── Frameworks/
│   │   └── PixelInsight.xcframework/
│   ├── IAACoreAdsJSB.mm
│   ├── IAACoreAdsJSB.h
│   ├── IAACInitManager.mm
│   ├── IAACInitManager.h
│   └── IAACHelper.h
└── engine/
    └── ios/                      ← 保持引擎文件在这里
```

### 选项 2：修改 CMakeLists.txt 指向 `native/engine/ios/`

修改 CMakeLists.txt 中的路径从 `../../ios` 改为 `../ios`。

---

## 推荐方案

**推荐使用 `native/ios/` 目录**，原因：
1. ✅ 与 Unity 的 `Assets/Plugins/iOS/` 概念类似
2. ✅ 与 Cocos Creator 官方文档推荐一致
3. ✅ 与 CMakeLists.txt 当前配置匹配
4. ✅ 更清晰，区分用户代码和引擎代码

### 操作步骤：

1. **创建目录结构**：
   ```bash
   mkdir -p native/ios/Frameworks
   ```

2. **移动文件**：
   - 将 `native/engine/ios/IAACoreAdsJSB.*` 移动到 `native/ios/`
   - 将 `native/engine/ios/IAACInitManager.*` 移动到 `native/ios/`
   - 将 `native/engine/ios/IAACHelper.h` 移动到 `native/ios/`
   - 将 `native/engine/ios/Frameworks/PixelInsight.xcframework/` 移动到 `native/ios/Frameworks/`
   - 删除 `native/engine/ios/PixelInsight.xcframework/`（重复的）

3. **在 Xcode 中手动添加**：
   - 打包 iOS 项目
   - 在 Xcode 中添加文件（参考之前的说明文档）

---

## 在 Xcode 中的最终位置

无论文件在哪个目录，**在 Xcode 中手动添加后**，你可以选择：

1. **保持目录结构**（推荐）：
   ```
   Xcode项目/
   └── 项目名/
       └── native/
           └── ios/
               ├── Frameworks/
               │   └── PixelInsight.xcframework/
               ├── IAACoreAdsJSB.mm
               └── ...
   ```

2. **扁平化结构**：
   ```
   Xcode项目/
   └── 项目名/
       ├── Frameworks/
       │   └── PixelInsight.xcframework/
       ├── IAACoreAdsJSB.mm
       └── ...
   ```

**建议保持目录结构**，这样更清晰，也便于管理。


