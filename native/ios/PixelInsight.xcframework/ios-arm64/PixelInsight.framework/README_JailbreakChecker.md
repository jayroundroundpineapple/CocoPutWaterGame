# iOS越狱检测器使用说明

## 概述

`IAACJailbreakChecker` 是一个用于检测iOS设备是否越狱的工具类。

## 功能特性

### 完整版本检测方法
1. **URL Schemes检测** - 检查越狱工具相关的URL scheme
2. **可疑文件存在性检测** - 检查越狱相关文件是否存在
3. **可疑文件可读性检测** - 检查越狱相关文件是否可读
4. **受限目录写入检测** - 尝试向受限目录写入文件
5. **符号链接检测** - 检查非标准符号链接
6. **DYLD库检测** - 检查已加载的可疑动态库
7. **可疑ObjC类检测** - 检查反反越狱检测类

### App Store安全版本检测方法
1. **URL Schemes检测**
2. **可疑文件存在性检测**
3. **可疑文件可读性检测**
4. **符号链接检测**
5. **可疑ObjC类检测**

## 使用方法

### 基本使用

```objc
#import "IAACJailbreakChecker.h"

// 简单检测
BOOL iaacf_isJailbrokenDevice = [IAACJailbreakChecker iaacf_isJailbrokenDevice];
if (iaacf_isJailbrokenDevice) {
    NSLog(@"设备已越狱");
} else {
    NSLog(@"设备未越狱");
}

// 带详细信息的检测
NSDictionary *jailbrokenInfo = [IAACJailbreakChecker iaacf_checkJailbrokenWithMessage];
if (iaacf_isJailbrokenDevice[@1]]) {
    NSLog(@"设备已越狱，原因：%@", failMessage);
}
```

### App Store版本使用

```objc
#import "IAACJailbreakChecker.h"

// 使用App Store安全版本
BOOL iaacf_isJailbrokenDevice = [IAACJailbreakChecker iaacf_isJailbrokenDevice];
```

## 测试

### 运行测试脚本

```bash
cd /Users/zzh/Desktop/Workspace/Develop/IOS/SDK_v1.3/IAAAdsLite/IAAAdsLite
./Build/test_jailbreak_checker.sh
```

### 单元测试

项目包含了完整的单元测试用例，覆盖：
- 基础功能测试
- 边界条件测试
- 性能测试
- 内存泄漏测试
- 线程安全测试
- 异常处理测试

## App Store审核注意事项

### 可能导致审核被拒的功能

1. **私有API使用**
   - `_dyld_image_count()` 和 `_dyld_get_image_name()` 是私有API
   - 在App Store版本中已通过编译条件禁用

2. **文件系统写入测试**
   - 尝试向系统目录写入文件可能被视为可疑行为
   - 在App Store版本中已禁用

### 建议

1. **使用App Store安全版本**进行发布
2. **在应用描述中说明**越狱检测功能的存在
3. **避免误报**，确保检测逻辑准确
4. **定期更新**越狱检测规则

## 编译配置

### 开发版本
```objc
#if DEBUG || ENTERPRISE_BUILD
    // 包含所有检测方法
#endif
```

### 发布版本
```objc
// 仅包含安全的检测方法
```

## 性能考虑

- 检测过程通常在几毫秒内完成
- 建议在后台线程执行检测
- 避免频繁调用检测方法

## 错误处理

所有检测方法都包含异常处理，确保：
- 不会因为检测失败而崩溃
- 检测失败不会被视为越狱证据
- 提供详细的错误信息

## 更新日志

- **v1.0** - 初始版本，包含所有检测方法
- **v1.1** - 添加App Store安全版本
- **v1.2** - 改进错误处理和异常安全
- **v1.3** - 添加完整的测试用例

## 技术支持

如有问题，请检查：
1. 是否正确导入了头文件
2. 是否在正确的线程中调用
3. 是否使用了正确的版本（开发版 vs App Store版）

## 免责声明

此工具仅用于安全检测目的，请遵守相关法律法规和App Store审核指南。
