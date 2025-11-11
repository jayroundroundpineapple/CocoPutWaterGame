# Cocos Creator iOS 原生文件目录结构说明

## 问题分析

### 你的当前情况：

**文件实际位置：**
- xcframework: `native/engine/ios/Frameworks/PixelInsight.xcframework/` 和 `native/engine/ios/PixelInsight.xcframework/`（重复了）
- 源文件: `native/engine/ios/IAACoreAdsJSB.mm` 等

**CMakeLists.txt 配置：**
- 期望从 `native/ios/` 读取文件（`../../ios` 从 `native/engine/ios/` 向上两级是 `native/`，然后 `ios/`）

**结果：** 配置和实际文件位置不匹配！

---

## Unity vs Cocos Creator 对比

### Unity 的目录结构：

```
Unity项目/
└── Assets/
    └── Plugins/
        └── iOS/                    ← 所有文件放这里
            ├── PixelInsight.xcframework/
            ├── *.mm
            └── *.h
```

**导出到 Xcode 后：**
- xcframework → `Unity-iPhone/Frameworks/Plugins/iOS/`
- .mm/.h 文件 → `Unity-iPhone/Libraries/Plugins/iOS/`

### Cocos Creator 的目录结构（推荐）：

```
CocosCreator项目/
└── native/
    ├── ios/                        ← 用户自定义原生文件（推荐）
    │   ├── Frameworks/
    │   │   └── PixelInsight.xcframework/
    │   ├── IAACoreAdsJSB.mm
    │   ├── IAACoreAdsJSB.h
    │   ├── IAACInitManager.mm
    │   ├── IAACInitManager.h
    │   └── IAACHelper.h
    └── engine/
        └── ios/                    ← 引擎文件（不要放用户文件）
            ├── AppDelegate.mm
            ├── ViewController.mm
            └── ...
```

---

## 在 Xcode 中的位置

### 重要：Cocos Creator 不会像 Unity 那样自动创建目录结构！

**在 Xcode 中，文件的位置取决于你手动添加的方式：**

#### 方式 1：保持目录结构（推荐）

在 Xcode 中添加文件时，选择 "Create groups"（不是 "Create folder references"），文件会出现在：

```
Xcode项目导航器/
└── 项目名/
    └── native/                     ← 手动添加时保持这个结构
        └── ios/
            ├── Frameworks/
            │   └── PixelInsight.xcframework/
            ├── IAACoreAdsJSB.mm
            ├── IAACoreAdsJSB.h
            └── ...
```

**在 Xcode 的物理文件系统中：**
- 文件仍然在 `native/ios/` 目录下（如果选择 "Copy items if needed" 为 false）
- 或者被复制到项目目录下（如果选择 "Copy items if needed" 为 true）

#### 方式 2：扁平化结构

如果直接添加到项目根目录，文件会出现在：

```
Xcode项目导航器/
└── 项目名/
    ├── Frameworks/
    │   └── PixelInsight.xcframework/
    ├── IAACoreAdsJSB.mm
    ├── IAACoreAdsJSB.h
    └── ...
```

---

## 推荐方案

### 步骤 1：整理文件位置

**将文件移动到 `native/ios/` 目录：**

```bash
# 创建目录
mkdir -p native/ios/Frameworks

# 移动源文件（从 native/engine/ios/ 移动到 native/ios/）
mv native/engine/ios/IAACoreAdsJSB.mm native/ios/
mv native/engine/ios/IAACoreAdsJSB.h native/ios/
mv native/engine/ios/IAACInitManager.mm native/ios/
mv native/engine/ios/IAACInitManager.h native/ios/
mv native/engine/ios/IAACHelper.h native/ios/

# 移动 Framework（选择其中一个，删除重复的）
mv native/engine/ios/Frameworks/PixelInsight.xcframework native/ios/Frameworks/
# 删除重复的
rm -rf native/engine/ios/PixelInsight.xcframework
```

### 步骤 2：验证 CMakeLists.txt 配置

当前 CMakeLists.txt 已经配置为从 `native/ios/` 读取，所以不需要修改。

### 步骤 3：在 Xcode 中手动添加

1. **打包 iOS 项目**
2. **用 Xcode 打开项目**
3. **添加文件**：
   - 右键项目 → "Add Files to [项目名]..."
   - 选择 `native/ios/` 目录下的所有 `.mm` 和 `.h` 文件
   - ✅ 勾选 "Create groups"
   - ✅ 不勾选 "Copy items if needed"（保持原位置）
   - 点击 "Add"
4. **添加 Framework**：
   - 右键项目 → "Add Files to [项目名]..."
   - 选择 `native/ios/Frameworks/PixelInsight.xcframework`
   - ✅ 勾选 "Create groups"
   - ✅ 不勾选 "Copy items if needed"
   - 点击 "Add"
5. **配置链接**：
   - Target → Build Phases → Link Binary With Libraries
   - 添加 `PixelInsight.xcframework`
   - Build Settings → Framework Search Paths
   - 添加：`$(PROJECT_DIR)/../native/ios/Frameworks`

---

## 最终目录结构

### Cocos Creator 项目中的结构：
```
native/
├── ios/                            ← 用户自定义原生文件
│   ├── Frameworks/
│   │   └── PixelInsight.xcframework/
│   ├── IAACoreAdsJSB.mm
│   ├── IAACoreAdsJSB.h
│   ├── IAACInitManager.mm
│   ├── IAACInitManager.h
│   └── IAACHelper.h
└── engine/
    └── ios/                        ← 引擎文件（不要动）
        ├── AppDelegate.mm
        └── ...
```

### Xcode 项目导航器中的结构（手动添加后）：
```
项目名/
├── native/
│   └── ios/
│       ├── Frameworks/
│       │   └── PixelInsight.xcframework/
│       ├── IAACoreAdsJSB.mm
│       └── ...
└── ...
```

---

## 关键点总结

1. **Cocos Creator 不会自动添加文件到 Xcode**，需要手动添加
2. **文件位置**：推荐放在 `native/ios/`，与 Unity 的 `Assets/Plugins/iOS/` 概念类似
3. **Xcode 中的位置**：取决于你手动添加的方式，推荐保持 `native/ios/` 目录结构
4. **Framework 位置**：在 Xcode 的 "Frameworks" 文件夹中，或保持 `native/ios/Frameworks/` 结构

