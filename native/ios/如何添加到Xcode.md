# 如何将 native/ios 文件添加到 Xcode 项目

## 问题说明

在 Cocos Creator 3.8 中，虽然已经在 CMakeLists.txt 中配置了源文件，但这些文件可能不会自动出现在 Xcode 项目的文件导航器中。这是因为 CMake 只负责编译配置，不负责 Xcode 项目的文件树结构。

## 解决方案

### 方法 1：手动添加到 Xcode（推荐，最简单可靠）

1. **在 Cocos Creator 中打包 iOS 项目**
   - 菜单：项目 → 构建发布 → 选择 iOS 平台 → 构建

2. **用 Xcode 打开项目**
   - 打开生成的 `.xcodeproj` 文件

3. **添加源文件到 Xcode**
   - 在 Xcode 项目导航器中，找到项目根目录
   - 右键点击项目根目录 → 选择 "Add Files to [项目名]..."
   - 导航到项目目录下的 `native/ios/` 文件夹
   - 选择以下文件：
     - `IAACoreAdsJSB.mm`
     - `IAACoreAdsJSB.h`
     - `IAACInitManager.mm`
     - `IAACInitManager.h`
     - `IAACHelper.h`
   - **重要选项**：
     - ✅ 勾选 "Copy items if needed"（如果文件不在项目目录内）
     - ✅ 选择 "Create groups"（不是 "Create folder references"）
     - ✅ 确保选择了正确的 Target（通常是你的主 Target）
   - 点击 "Add"

4. **添加 Framework 到 Xcode**
   - 在 Xcode 项目导航器中，找到或创建 "Frameworks" 文件夹
   - 右键点击 "Frameworks" → 选择 "Add Files to [项目名]..."
   - 导航到 `native/ios/Frameworks/` 文件夹
   - 选择 `PixelInsight.xcframework`
   - **重要选项**：
     - ✅ 勾选 "Copy items if needed"
     - ✅ 选择 "Create groups"
     - ✅ 确保选择了正确的 Target
   - 点击 "Add"

5. **配置 Framework 链接**
   - 选择项目 Target → "Build Phases" 标签
   - 展开 "Link Binary With Libraries"
   - 如果 `PixelInsight.xcframework` 不在列表中，点击 "+" 按钮
   - 在弹出窗口中选择 `PixelInsight.xcframework`，点击 "Add"
   - 在 "Build Settings" 中搜索 "Framework Search Paths"
   - 添加路径：`$(PROJECT_DIR)/../native/ios/Frameworks`（相对路径）
   - 或者添加绝对路径（不推荐，因为路径可能变化）

6. **验证配置**
   - 在 Xcode 项目导航器中，应该能看到：
     - 源文件（`.mm` 和 `.h` 文件）
     - Framework（`PixelInsight.xcframework`）
   - 尝试编译项目，应该没有找不到文件的错误

### 方法 2：使用脚本自动添加（高级）

如果需要自动化，可以创建一个构建后脚本来自动添加文件，但这需要更复杂的配置。

## 为什么需要手动添加？

1. **CMake 的限制**：CMake 负责编译配置，但不负责 Xcode 项目的文件树结构
2. **Cocos Creator 的构建系统**：Cocos Creator 3.8 使用 CMake 生成 Xcode 项目，但不会自动扫描 `native/ios/` 目录
3. **Xcode 项目结构**：Xcode 项目文件（`.pbxproj`）需要明确列出所有文件引用

## 注意事项

1. **文件路径**：确保文件路径正确，使用相对路径更可靠
2. **Target 选择**：确保文件添加到正确的 Target
3. **重新打包**：如果修改了 `native/ios/` 下的文件，可能需要重新添加到 Xcode
4. **版本控制**：添加到 Xcode 后，`.pbxproj` 文件会被修改，记得提交到版本控制

## 验证清单

- [ ] 所有 `.mm` 和 `.h` 文件都出现在 Xcode 项目导航器中
- [ ] `PixelInsight.xcframework` 出现在 "Frameworks" 文件夹中
- [ ] Framework 在 "Link Binary With Libraries" 中
- [ ] Framework Search Paths 配置正确
- [ ] 项目可以成功编译，没有找不到文件的错误

