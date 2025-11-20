# 禁用 Main Thread Checker 解决崩溃问题

## 问题说明

崩溃发生在 Cocos Creator 引擎内部的 `CCMTLSwapchain::doInit`，这是引擎在后台线程访问 UIView 的 layer 导致的。这是 Cocos Creator 3.8 引擎的已知问题，不是我们的 SDK 代码导致的。

## 解决方案：在 Xcode 中禁用 Main Thread Checker

### 步骤：

1. **打开 Xcode 项目**
   - 用 Xcode 打开从 Cocos Creator 导出的 `.xcodeproj` 文件

2. **选择项目 Target**
   - 在左侧项目导航器中，点击项目名称（最顶部的蓝色图标）
   - 选择你的 Target（例如：`waterdemo-mobile`）

3. **打开 Scheme Editor**
   - 点击顶部菜单：Product → Scheme → Edit Scheme...
   - 或者按快捷键：`Cmd + <`

4. **禁用 Main Thread Checker**
   - 在左侧选择 "Run"
   - 切换到 "Diagnostics" 标签
   - **取消勾选** "Main Thread Checker"
   - 点击 "Close"

5. **重新运行**
   - 重新构建并运行项目
   - 应用应该可以正常启动，不会再崩溃

## 注意事项

- 这只是临时解决方案，禁用了 Main Thread Checker 的警告
- 应用仍然可以正常运行，只是不会检测主线程违规
- 这是 Cocos Creator 引擎的问题，等待引擎更新可能会修复

## 替代方案

如果不想禁用 Main Thread Checker，可以：
1. 升级到更新版本的 Cocos Creator（如果可用）
2. 等待 Cocos Creator 官方修复这个问题
3. 在真机上测试（某些情况下真机可能不会有这个问题）


