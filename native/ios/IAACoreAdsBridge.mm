#import <PixelInsight/PixelInsight.h>
#import "IAACHelper.h"

// --- C# 回调函数指针类型定义 ---
typedef void (*IAAAdEventCallback)(int adType, int adEvent, const char* errorJson);
typedef void (*IAACheckWebAccessableCallback)(bool accessable);
typedef void (*IAAShowAppstoreResultCallback)(bool success);


// --- 存储 C# 回调的静态变量 ---
static IAAAdEventCallback iaacv_adEventCallback = NULL;
static IAACheckWebAccessableCallback iaacv_checkWebCallback = NULL;
static IAAShowAppstoreResultCallback iaacv_showAppstoreCallback = NULL;

extern "C" {
    void iaacf_showAd(int adType, const char* placement, IAAAdEventCallback adEventCallback) {
        iaacv_adEventCallback = adEventCallback;
        
        [IAA_CoreAds iaa_showAd:(IAA_AdType)adType
             iaa_fromPlacement:CreateNSString(placement)
                     iaa_Event:^(IAA_AdType type, IAA_AdEvent event, NSError * _Nullable error) {
                        if (iaacv_adEventCallback) {
                            NSDictionary* errorDict = error ? @{@"message": error.localizedDescription} : nil;
                            iaacv_adEventCallback((int)type, (int)event, DictionaryToJSON(errorDict));
                        }
                     }];
    }

    void iaacf_checkOpenWebAccessable(IAACheckWebAccessableCallback resultCallback) {
        iaacv_checkWebCallback = resultCallback;
        [IAA_CoreAds iaa_checkOpenWebAccessable:^(BOOL iaa_accessable) {
            if (iaacv_checkWebCallback) {
                iaacv_checkWebCallback(iaa_accessable);
            }
        }];
    }

    void iaacf_showOpenWebPage() {
        [IAA_CoreAds iaa_checkOpenWebAccessable:^(BOOL iaa_accessable) {
            if (iaa_accessable) {
                [IAA_CoreAds iaa_showOpenWebPage];
            }
        }];
    }
    void iaacf_cancelAdShow(int adType){
        [IAA_CoreAds iaa_cancelShowAd:adType];
    }
    
    bool iaacf_isAdReady(int adType){
        BOOL ready = [IAA_CoreAds iaa_adIsReadyForType:adType];
        return ready ? true:false;
    }

    void iaacf_showAppstorePage(IAAShowAppstoreResultCallback resultCallback) {
        iaacv_showAppstoreCallback = resultCallback;
         [IAA_CoreAds iaa_showAppstorePageWithResultCallback:^(BOOL success) {
            if (iaacv_showAppstoreCallback) {
                iaacv_showAppstoreCallback(success);
            }
        }];
    }

    void iaacf_logSensorEvent(const char* eventName, const char* propertiesJson) {
        [IAA_CoreAds iaa_logSensorEvent:CreateNSString(eventName)
                         iaa_properties:JSONToDictionary(propertiesJson)];
    }

    void iaacf_applicationDidEnterGame() {
        [IAA_CoreAds iaa_applicationDidEnterGame];
    }
    
    const char* iaacf_sdkVersion() {
        return CStringCopy([IAA_CoreAds iaa_sdkVersion]);
    }
}

