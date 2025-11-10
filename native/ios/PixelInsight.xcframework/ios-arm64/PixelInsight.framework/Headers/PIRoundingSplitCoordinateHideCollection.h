//
//  PIRoundingSplitCoordinateHideCollection.h
//  PixelInsight
//
//  Created by zzh on 2025/7/14.
//

#ifndef PIFieldHeaderDateDelegateiCard_h
#define PIFieldHeaderDateDelegateiCard_h

#define IAA_CoreAds PixelInsight

#define IAA_AdType PIFeatureStringTexturePresentationFlowResolver
#define IAA_AdTypeOpen PISubtitleMusicDateSwitchLoadingTabShellWrappedMultipleFont
#define IAA_AdTypeInterstitial PIKeyButtonsExampleLoadingDelegateExamplesLayoutStoreConfigurableInterstitial
#define IAA_AdTypeReward PIRegionFlowComputeCoderFileButtonsLayoutParserClass

#define IAA_AdEvent PIDownloadingScrollLoadingStoreSceneEvent
#define IAA_AdEventLoaded PIFooterCoderNavigationFieldHeaderDisplaySourceAsyncTitle
#define IAA_AdEventDisplayed PITopStyleInteractionHandlerPersonConfigurationTextFocusCompareAnimator
#define IAA_AdEventHidden PIFeatureViewGridResolvablePresenterModelBlockGame
#define IAA_AdEventClicked PIMusicActionDynamicExtensionsHandlerSizeBlasterIconClicked
#define IAA_AdEventLoadFailed PIDynamicSequenceHeartFlowMusicDateCollectionDemoSizeFailed
#define IAA_AdEventDisplayFailed PILoadingTestStoreAudioApplicationPerControllerInType
#define IAA_AdEventDisplayCancelled PIScrollManagerPersonMoveDownloadingAttributesKeyViewMutexUiCache
#define IAA_AdEventRewarded PILogicMusicTrackingButtonSizeTablePersonGame
#define IAA_AdEventLoadTimeout PIProposeTableDynamicModelSourceiButtonsTextGeometryCompare
#define IAA_AdEventInitNotCompleted PIImageTransformImageWindowGeometryControlBlueprintPreferenceLogicReducer
#define IAA_AdEventLoading PIJobIconMocksPromoDefaultsPersonUiControlRoundingLoading
#define IAA_AdEventRevenue PIContainerActionableLinkErrorErrorSwiftBarErrorLayer

#define iaa_initSDKWithLaunchOptions resolvingByPastPromoInitRejectedTitle
#define iaa_userAttributeResult startMethodsDay
#define iaa_userAttributeResultCallback colorSwipe
#define iaa_initialized editedT
#define iaa_adInitResult stringInsetPreviousFooter
#define iaa_adInitResultCallback targetsGestureObliqueness
#define iaa_resultCallback fadeRstr2binl
#define iaa_isInitialized collisionsAllNameHexmd
#define iaa_sdkVersion granuralityTracking
#define iaa_Event autoLinkSave
#define iaa_adEventCallback yearsTimers
#define iaa_adIsReadyForType keyboardTopIs
#define iaa_cancelShowAd allComponentsCache
#define iaa_showAd key_binary
#define iaa_fromPlacement exampleChangeEmoji
#define iaa_showAppstorePageWithResultCallback newestObservingIndexesDisplayUnwrap
#define iaa_logSensorEvent heightSingle
#define iaa_properties listableAny
#define iaa_checkOpenWebAccessable assertListMosaicNoRegularChain
#define iaa_accessable asyncdisplaykitFixingAffine
#define iaa_showOpenWebPage interitemAnimationFullWrapperShould
#define iaa_applicationDidEnterGame assertUnlockAll

// 广告类型
typedef NS_OPTIONS(NSUInteger, IAA_AdType) {
    IAA_AdTypeOpen = 10,
    IAA_AdTypeInterstitial = 13,
    IAA_AdTypeReward = 14
};

// 事件
typedef NS_ENUM(NSUInteger, IAA_AdEvent) {
    IAA_AdEventLoaded = 1, //广告加载完成
    IAA_AdEventDisplayed = 2, //广告展示完成
    IAA_AdEventHidden = 3, //广告隐藏
    IAA_AdEventClicked = 4, //广告被点击
    IAA_AdEventLoadFailed = 5, //广告加载失败
    IAA_AdEventDisplayFailed = 6, //广告展示失败
    IAA_AdEventRewarded = 7, //广告激励回调（激励视频）
    IAA_AdEventLoadTimeout = 8, //广告加载超时
    IAA_AdEventInitNotCompleted = 9, //广告初始化未完成
    IAA_AdEventLoading = 10, //广告加载中
    IAA_AdEventRevenue = 11,
    IAA_AdEventDisplayCancelled = 901, //广告展示取消
};


#endif /* PIFieldHeaderDateDelegateiCard_h */
