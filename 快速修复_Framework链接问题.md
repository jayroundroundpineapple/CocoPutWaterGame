# 快速修复：Framework 链接问题

## 问题
```
Library not loaded: @rpath/PixelInsight.framework/PixelInsight
Reason: no LC_RPATH's found
```

## 快速解决步骤（在 Xcode 中）

### 1. 打开 Xcode 项目
- 打开从 Cocos Creator 导出的 `.xcodeproj` 文件

### 2. 添加 Framework 到项目（如果还没有添加）

1. 在项目导航器中，右键点击项目名称
2. 选择 "Add Files to [项目名]..."
3. 导航到：`native/engine/ios/PixelInsight.xcframework`
4. 选择 `PixelInsight.xcframework` 文件夹
5. ✅ **重要**：勾选 "Create groups"（不是 "Create folder references"）
6. ✅ **重要**：确保选择了正确的 Target（例如：`waterdemo-mobile`）
7. 点击 "Add"

### 3. 配置 Build Settings

1. 选择项目 → 选择 Target（例如：`waterdemo-mobile`）
2. 切换到 "Build Settings" 标签
3. 搜索 "Framework Search Paths"
   - 添加：`$(PROJECT_DIR)/../native/engine/ios`
   - 或者：`$(SRCROOT)/../native/engine/ios`
4. 搜索 "Runpath Search Paths"
   - 添加：`$(PROJECT_DIR)/../native/engine/ios`
   - 确保包含：`@executable_path/Frameworks`（通常已存在）

### 4. 链接 Framework（Build Phases）

1. 切换到 "Build Phases" 标签
2. 展开 "Link Binary With Libraries"
3. 点击 "+" 按钮
4. 如果看到 `PixelInsight.framework`，选择它
5. 如果没看到，点击 "Add Other..." → "Add Files..."
   - 选择 `PixelInsight.xcframework` 文件夹
   - 点击 "Add"

### 5. 嵌入 Framework（最重要！）

1. 在 "Build Phases" 中，找到 "Embed Frameworks"
   - 如果没有，点击左上角 "+" → "New Copy Files Phase"
   - 将 "Destination" 改为 "Frameworks"
   - 将名称改为 "Embed Frameworks"
2. 在 "Embed Frameworks" 中，点击 "+"
3. 选择 `PixelInsight.xcframework`
4. ✅ **重要**：确保 "Code Sign On Copy" 已勾选
5. ✅ **重要**：确保 "Remove Headers On Copy" 已勾选（可选）

### 6. 验证 Target Membership

1. 在项目导航器中，选择 `PixelInsight.xcframework`
2. 在右侧 "File Inspector" 中
3. 检查 "Target Membership"
4. ✅ 确保你的 Target（例如：`waterdemo-mobile`）已勾选

### 7. 清理并重新构建

1. 菜单：Product → Clean Build Folder（`Shift + Cmd + K`）
2. 菜单：Product → Build（`Cmd + B`）
3. 在真机上运行

## 如果仍然有问题

### 检查 Framework 路径

在 Xcode 中，检查以下设置：

**Framework Search Paths** 应该包含：
```
$(PROJECT_DIR)/../native/engine/ios
$(inherited)
```

**Runpath Search Paths** 应该包含：
```
@executable_path/Frameworks
$(PROJECT_DIR)/../native/engine/ios
$(inherited)
```

### 使用绝对路径（临时方案）

如果相对路径不工作，可以临时使用绝对路径：

1. 在 "Framework Search Paths" 中，添加 Framework 的完整路径
2. 例如：`/Users/admin/Desktop/myPro/3DCocoPlayable/watercocos-master/native/engine/ios`
3. ⚠️ 注意：这不是推荐方案，因为路径是硬编码的

### 检查 Framework 结构

确保 `PixelInsight.xcframework` 结构正确：
```
PixelInsight.xcframework/
├── Info.plist
├── ios-arm64/
│   └── PixelInsight.framework/
│       ├── PixelInsight          ← 二进制文件
│       └── Headers/
└── ios-arm64_x86_64-simulator/
    └── PixelInsight.framework/
        ├── PixelInsight          ← 二进制文件
        └── Headers/
```

## 常见错误

1. ❌ **"Create folder references" 而不是 "Create groups"**
   - 必须选择 "Create groups"

2. ❌ **Framework 没有添加到 "Embed Frameworks"**
   - 这是最常见的问题！
   - Framework 必须被嵌入到应用中

3. ❌ **没有设置 Runpath Search Paths**
   - 必须设置，否则运行时找不到 Framework

4. ❌ **Framework 没有添加到 Target**
   - 检查 Target Membership

## 验证成功

如果配置正确：
- ✅ 不再出现 `Library not loaded` 错误
- ✅ 应用可以正常启动
- ✅ SDK 可以正常调用


