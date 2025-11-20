# Framework 配置说明 - 解决 dyld 错误

## 错误说明

```
Library not loaded: @rpath/PixelInsight.framework/PixelInsight
Reason: no LC_RPATH's found
```

这个错误表示：
1. 应用试图加载 `PixelInsight.framework`，但找不到
2. 没有设置正确的运行时搜索路径（LC_RPATH）

## 解决方案：在 Xcode 中正确配置 Framework

### 步骤 1：确认 Framework 位置

确保 `PixelInsight.xcframework` 位于以下位置之一：
- `native/ios/Frameworks/PixelInsight.xcframework/`
- `native/engine/ios/Frameworks/PixelInsight.xcframework/`

### 步骤 2：在 Xcode 中添加 Framework

1. **打开 Xcode 项目**
   - 用 Xcode 打开从 Cocos Creator 导出的 `.xcodeproj` 文件

2. **添加 Framework 到项目**
   - 在 Xcode 项目导航器中，右键点击项目名称
   - 选择 "Add Files to [项目名]..."
   - 导航到 `native/ios/Frameworks/` 或 `native/engine/ios/Frameworks/`
   - 选择 `PixelInsight.xcframework` 文件夹
   - ✅ **重要**：勾选 "Create groups"（不是 "Create folder references"）
   - ✅ **重要**：确保选择了正确的 Target（例如：`waterdemo-mobile`）
   - 点击 "Add"

### 步骤 3：配置 Framework 链接

1. **选择项目 Target**
   - 在左侧项目导航器中，点击项目名称（最顶部的蓝色图标）
   - 选择你的 Target（例如：`waterdemo-mobile`）

2. **配置 Build Settings**
   - 切换到 "Build Settings" 标签
   - 在搜索框中输入 "Framework Search Paths"
   - 找到 "Framework Search Paths" 设置
   - 点击 "+" 添加路径：
     ```
     $(PROJECT_DIR)/../native/ios/Frameworks
     ```
     或者（如果 Framework 在 `native/engine/ios/`）：
     ```
     $(PROJECT_DIR)/../native/engine/ios/Frameworks
     ```

3. **配置 Runpath Search Paths**
   - 在搜索框中输入 "Runpath Search Paths"
   - 找到 "Runpath Search Paths" 设置
   - 点击 "+" 添加路径：
     ```
     $(PROJECT_DIR)/../native/ios/Frameworks
     ```
     或者：
     ```
     $(PROJECT_DIR)/../native/engine/ios/Frameworks
     ```
   - 确保包含 `@executable_path/Frameworks`（通常已存在）

### 步骤 4：链接 Framework

1. **切换到 Build Phases**
   - 选择 "Build Phases" 标签
   - 展开 "Link Binary With Libraries"

2. **添加 Framework**
   - 点击 "+" 按钮
   - 如果 `PixelInsight.xcframework` 不在列表中：
     - 点击 "Add Other..." → "Add Files..."
     - 选择 `PixelInsight.xcframework` 文件夹
     - 点击 "Add"

3. **配置 Framework 嵌入**
   - 展开 "Embed Frameworks"（如果不存在，点击 "+" 添加）
   - 确保 `PixelInsight.xcframework` 在列表中
   - 如果不在，点击 "+" 添加
   - ✅ **重要**：确保 "Code Sign On Copy" 已勾选
   - ✅ **重要**：确保 "Remove Headers On Copy" 已勾选（可选）

### 步骤 5：验证配置

1. **检查 Framework 路径**
   - 在项目导航器中，选择 `PixelInsight.xcframework`
   - 在右侧 "File Inspector" 中，检查 "Location" 路径是否正确

2. **检查 Target Membership**
   - 在右侧 "File Inspector" 中，检查 "Target Membership"
   - 确保你的 Target（例如：`waterdemo-mobile`）已勾选

### 步骤 6：清理并重新构建

1. **清理项目**
   - 菜单：Product → Clean Build Folder（或按 `Shift + Cmd + K`）

2. **重新构建**
   - 菜单：Product → Build（或按 `Cmd + B`）

3. **运行项目**
   - 在真机上运行，应该可以正常加载 Framework

## 如果仍然有问题

### 检查 Framework 结构

确保 `PixelInsight.xcframework` 结构正确：
```
PixelInsight.xcframework/
├── Info.plist
├── ios-arm64/
│   └── PixelInsight.framework/
│       ├── PixelInsight
│       ├── Headers/
│       └── Info.plist
└── ios-arm64_x86_64-simulator/
    └── PixelInsight.framework/
        ├── PixelInsight
        ├── Headers/
        └── Info.plist
```

### 检查 Framework 路径设置

在 Xcode 中，检查以下设置的值：

1. **Framework Search Paths**：
   ```
   $(PROJECT_DIR)/../native/ios/Frameworks
   $(inherited)
   ```

2. **Runpath Search Paths**：
   ```
   @executable_path/Frameworks
   $(PROJECT_DIR)/../native/ios/Frameworks
   $(inherited)
   ```

3. **Other Linker Flags**（如果需要）：
   ```
   -framework PixelInsight
   ```

### 使用相对路径还是绝对路径

- **相对路径**（推荐）：`$(PROJECT_DIR)/../native/ios/Frameworks`
- **绝对路径**（不推荐）：`/Users/.../native/ios/Frameworks`

## 常见错误

1. **"Create folder references" 而不是 "Create groups"**
   - ❌ 错误：选择 "Create folder references"
   - ✅ 正确：选择 "Create groups"

2. **Framework 没有添加到 Target**
   - 检查 Target Membership，确保已勾选

3. **路径不正确**
   - 使用 `$(PROJECT_DIR)` 相对路径，不要使用绝对路径

4. **没有设置 Runpath Search Paths**
   - 必须设置 Runpath Search Paths，否则运行时找不到 Framework

## 验证成功

如果配置正确，运行应用时应该：
- ✅ 不再出现 `Library not loaded` 错误
- ✅ 应用可以正常启动
- ✅ SDK 可以正常调用


