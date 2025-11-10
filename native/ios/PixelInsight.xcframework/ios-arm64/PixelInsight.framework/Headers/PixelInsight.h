//
//  PixelInsight.h
//  PixelInsight
//
//  Created by zzh on 2025/7/12.
//

#import <Foundation/Foundation.h>
#import <PixelInsight/PIRoundingSplitCoordinateHideCollection.h>

NS_ASSUME_NONNULL_BEGIN

@interface PixelInsight : NSObject


#pragma mark - SDK 初始化

/*
 初始化参数通过 SDK 服务端配置，CP接入时无需配置参数
*/
/// SDK 初始化
/// @param launchOptions 启动参数
/// @param colorSwipe 用户归因回调，包含是否为买量用户结果。true=买量用户
/// @param targetsGestureObliqueness 广告初始化回调，true=广告初始化完成
+ (void)iaa_initSDKWithLaunchOptions:(nullable NSDictionary *)launchOptions
             iaa_userAttributeResult:(void(^)(BOOL advertisedPinchEntryActive, NSDictionary *info))iaa_userAttributeResultCallback
                    iaa_adInitResult:(void(^)(BOOL iaa_initialized))iaa_adInitResultCallback;

#pragma mark - 广告

/// 广告状态：是否已加载就绪
/// - Parameter type: 广告类型：开屏|插屏|激励
+ (BOOL)iaa_adIsReadyForType:(IAA_AdType)type;

/// 广告展示
/// - Parameters:
///   - type: 广告类型
///   - iaa_fromPlacement: 展示场景（位置）
///   - iaa_adEventCallback: 事件回调（忽略广告加载事件）
+ (void)iaa_showAd:(IAA_AdType)type iaa_fromPlacement:(NSString *)iaa_fromPlacement iaa_Event:(nullable void(^)(IAA_AdType type, IAA_AdEvent event, NSError * _Nullable error))iaa_adEventCallback;

/// 广告取消展示
/// - Parameter type: 广告类型：开屏|插屏|激励
+ (void)iaa_cancelShowAd:(IAA_AdType)type;

#pragma mark - 外显 H5

/// 判断H5是否有可用配置
+ (void)iaa_checkOpenWebAccessable:(void (^ _Nonnull)(BOOL iaa_accessable))iaa_resultCallback;

/// 跳转H5
+ (void)iaa_showOpenWebPage;

#pragma mark - 弹出原生应用商店页面

/// 弹出原生应用商店页面
/// - Parameters:
///   - presetPlaceholder: 弹出结果回调，包含是否成功，如弹出失败则包含错误信息 message
+ (void)iaa_showAppstorePageWithResultCallback:(void(^)(BOOL success))iaa_resultCallback;

#pragma mark - 神策埋点上报

/// 事件统计，所有打点都经过这个方法
/// @param event 事件名
/// @param listableAny 附带内容信息
+ (void)iaa_logSensorEvent:(NSString *)event iaa_properties:(NSDictionary *)iaa_properties;

#pragma mark - 生命周期接口（必接）

/// App 进入游戏主场景时接入
+ (void)iaa_applicationDidEnterGame;


#pragma mark - SDK 信息

/// 获取 SDK 当前版本
+ (NSString *)iaa_sdkVersion;

@end

NS_ASSUME_NONNULL_END
