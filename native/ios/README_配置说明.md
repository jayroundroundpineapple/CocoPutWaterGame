# IAA SDK iOS 原生文件配置说明

## 问题说明

在 Cocos Creator 3.8 中，`native/ios` 目录下的文件不会自动添加到 Xcode 工程中，需要手动配置。

## 已完成的配置

### 1. 源文件配置（`native/engine/common/CMakeLists.txt`）

已添加以下源文件到编译列表：
- `IAACoreAdsJSB.mm` / `IAACoreAdsJSB.h`
- `IAACInitManager.mm` / `IAACInitManager.h`
- `IAACHelper.h`

### 2. Framework 配置（`native/engine/ios/CMakeLists.txt`）

已添加 Framework 搜索路径和链接配置。

## 如果文件仍未出现在 Xcode 中

### 方法 1：手动添加到 Xcode（推荐，最简单）

1. 在 Cocos Creator 中打包 iOS 项目
2. 用 Xcode 打开生成的 `.xcodeproj` 文件
3. 在 Xcode 中：
   - 右键点击项目 → "Add Files to..."
   - 选择 `native/ios/` 目录下的所有 `.mm` 和 `.h` 文件
   - 确保勾选 "Copy items if needed" 和 "Create groups"
   - 点击 "Add"

4. 添加 Framework：
   - 在 Xcode 项目设置中，选择 Target → "Build Phases"
   - 展开 "Link Binary With Libraries"
   - 点击 "+" 按钮
   - 点击 "Add Other..." → "Add Files..."
   - 选择 `native/ios/Frameworks/PixelInsight.xcframework`
   - 在 "Build Settings" 中，搜索 "Framework Search Paths"
   - 添加：`$(PROJECT_DIR)/../native/ios/Frameworks`（或相对路径）

### 方法 2：使用 Cocos Creator 扩展（自动化）

如果需要自动化，可以创建一个 Cocos Creator 扩展来自动添加文件。

### 方法 3：修改 CMake 配置（如果方法 1 不行）

如果 CMake 配置没有生效，可能需要检查：
1. CMake 版本是否支持 xcframework
2. 路径是否正确
3. 是否需要在 `cc_ios_after_target` 之后添加配置

## 验证配置

打包后，在 Xcode 中检查：

1. **源文件**：在项目导航器中应该能看到：
   - `IAACoreAdsJSB.mm`
   - `IAACInitManager.mm`
   - 对应的 `.h` 文件

2. **Framework**：在 "Frameworks" 文件夹中应该能看到：
   - `PixelInsight.xcframework`

3. **编译**：尝试编译项目，应该能成功编译，没有找不到文件的错误。

## 目录结构

```
native/
├── ios/
│   ├── Frameworks/
│   │   └── PixelInsight.xcframework/    # Framework 文件
│   ├── IAACoreAdsJSB.mm                 # JSB 桥接实现
│   ├── IAACoreAdsJSB.h                  # JSB 桥接头文件
│   ├── IAACInitManager.mm               # 初始化管理器实现
│   ├── IAACInitManager.h                # 初始化管理器头文件
│   └── IAACHelper.h                     # 工具函数头文件
└── engine/
    ├── ios/
    │   └── CMakeLists.txt               # iOS CMake 配置（已修改）
    └── common/
        └── CMakeLists.txt               # 通用 CMake 配置（已修改）
```

## 注意事项

1. **路径问题**：确保所有路径都是相对于项目根目录的
2. **Framework 路径**：xcframework 必须放在 `native/ios/Frameworks/` 目录下
3. **重新打包**：修改 CMake 配置后，需要重新打包 iOS 项目
4. **Xcode 版本**：确保使用支持 xcframework 的 Xcode 版本（Xcode 11+）

