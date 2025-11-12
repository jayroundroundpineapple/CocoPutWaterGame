/**
 * IAA SDK Bridge for Cocos Creator 3.8 Android
 * 类似 Unity 的 IAACoreAdsBridge，桥接原生 Android SDK
 */

package com.iaa.ads;

import android.app.Activity;
import android.util.Log;
import org.json.JSONObject;
import org.json.JSONException;
import com.cocos.lib.CocosActivity;
import com.cocos.lib.CocosJavascriptJavaBridge;

/**
 * IAA SDK Bridge for Android
 */
public class IAAAdsBridge {
    private static final String TAG = "IAAAdsBridge";
    private static Activity activity;
    
    // 回调接口
    public interface UserAttributeCallback {
        void onResult(boolean attributed, String info);
    }
    
    public interface AdInitCallback {
        void onResult(boolean initialized);
    }
    
    public interface AdEventCallback {
        void onEvent(int adType, int adEvent, String error);
    }
    
    public interface CheckWebCallback {
        void onResult(boolean accessable);
    }
    
    public interface ShowAppstoreCallback {
        void onResult(boolean success);
    }
    
    // 静态回调变量
    private static UserAttributeCallback userAttributeCallback;
    private static AdInitCallback adInitCallback;
    private static AdEventCallback adEventCallback;
    private static CheckWebCallback checkWebCallback;
    private static ShowAppstoreCallback showAppstoreCallback;
    
    /**
     * 初始化
     */
    public static void init(Activity act) {
        activity = act;
    }
    
    /**
     * 初始化 SDK
     */
    public static void initSDK(final UserAttributeCallback userCallback, final AdInitCallback adInitCallback) {
        IAAAdsBridge.userAttributeCallback = userCallback;
        IAAAdsBridge.adInitCallback = adInitCallback;
        
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                IAA_CoreAds.initSDK(new IAA_CoreAds.UserAttributeListener() {
                    @Override
                    public void onUserAttribute(boolean attributed, String info) {
                        if (userAttributeCallback != null) {
                            userAttributeCallback.onResult(attributed, info);
                        }
                    }
                }, new IAA_CoreAds.AdInitListener() {
                    @Override
                    public void onAdInit(boolean initialized) {
                        if (IAAAdsBridge.adInitCallback != null) {
                            IAAAdsBridge.adInitCallback.onResult(initialized);
                        }
                    }
                });
            }
        });
    }
    
    /**
     * 显示广告
     */
    public static void showAd(final int adType, final String placement, final AdEventCallback adEventCallback) {
        IAAAdsBridge.adEventCallback = adEventCallback;
        
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                IAA_CoreAds.showAd(adType, placement, new IAA_CoreAds.AdEventListener() {
                    @Override
                    public void onAdEvent(int type, int event, String error) {
                        if (IAAAdsBridge.adEventCallback != null) {
                            IAAAdsBridge.adEventCallback.onEvent(type, event, error);
                        }
                    }
                });
            }
        });
    }
    
    /**
     * 检查是否可以打开网页
     */
    public static void checkOpenWebAccessable(final CheckWebCallback resultCallback) {
        IAAAdsBridge.checkWebCallback = resultCallback;
        
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                IAA_CoreAds.checkOpenWebAccessable(new IAA_CoreAds.CheckWebListener() {
                    @Override
                    public void onResult(boolean accessable) {
                        if (checkWebCallback != null) {
                            checkWebCallback.onResult(accessable);
                        }
                    }
                });
            }
        });
    }
    
    /**
     * 显示打开网页页面
     */
    public static void showOpenWebPage() {
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                IAA_CoreAds.checkOpenWebAccessable(new IAA_CoreAds.CheckWebListener() {
                    @Override
                    public void onResult(boolean accessable) {
                        if (accessable) {
                            IAA_CoreAds.showOpenWebPage();
                        }
                    }
                });
            }
        });
    }
    
    /**
     * 取消广告显示
     */
    public static void cancelAdShow(final int adType) {
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                IAA_CoreAds.cancelShowAd(adType);
            }
        });
    }
    
    /**
     * 判断广告是否准备好
     */
    public static boolean isAdReady(final int adType) {
        return IAA_CoreAds.isAdReady(adType);
    }
    
    /**
     * 显示应用商店页面
     */
    public static void showAppstorePage(final ShowAppstoreCallback resultCallback) {
        IAAAdsBridge.showAppstoreCallback = resultCallback;
        
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                IAA_CoreAds.showAppstorePage(new IAA_CoreAds.ShowAppstoreListener() {
                    @Override
                    public void onResult(boolean success) {
                        if (showAppstoreCallback != null) {
                            showAppstoreCallback.onResult(success);
                        }
                    }
                });
            }
        });
    }
    
    /**
     * 记录传感器事件
     */
    public static void logSensorEvent(final String eventName, final String propertiesJson) {
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    JSONObject properties = propertiesJson != null ? new JSONObject(propertiesJson) : null;
                    IAA_CoreAds.logSensorEvent(eventName, properties);
                } catch (JSONException e) {
                    Log.e(TAG, "Failed to parse properties JSON", e);
                }
            }
        });
    }
    
    /**
     * 应用进入游戏
     */
    public static void applicationDidEnterGame() {
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                IAA_CoreAds.applicationDidEnterGame();
            }
        });
    }
    
    /**
     * 获取 SDK 版本
     */
    public static String getSDKVersion() {
        return IAA_CoreAds.getSDKVersion();
    }
    
    /**
     * JSB 回调：用户属性结果
     */
    public static void onUserAttributeResult(final boolean attributed, final String info) {
        CocosActivity activity = (CocosActivity) CocosActivity.getContext();
        activity.runOnGLThread(new Runnable() {
            @Override
            public void run() {
                CocosJavascriptJavaBridge.evalString(
                    String.format("IAAAdManager.onUserAttributeResult(%s, '%s');", 
                        attributed, info != null ? info : "")
                );
            }
        });
    }
    
    /**
     * JSB 回调：广告初始化结果
     */
    public static void onAdInitResult(final boolean initialized) {
        CocosActivity activity = (CocosActivity) CocosActivity.getContext();
        activity.runOnGLThread(new Runnable() {
            @Override
            public void run() {
                CocosJavascriptJavaBridge.evalString(
                    String.format("IAAAdManager.onAdInitResult(%s);", initialized)
                );
            }
        });
    }
    
    /**
     * JSB 回调：广告事件
     */
    public static void onAdEvent(final int adType, final int adEvent, final String error) {
        CocosActivity activity = (CocosActivity) CocosActivity.getContext();
        activity.runOnGLThread(new Runnable() {
            @Override
            public void run() {
                CocosJavascriptJavaBridge.evalString(
                    String.format("IAAAdManager.onAdEvent(%d, %d, '%s');", 
                        adType, adEvent, error != null ? error : "")
                );
            }
        });
    }
    
    /**
     * JSB 回调：检查网页可访问性结果
     */
    public static void onCheckWebAccessableResult(final boolean accessable) {
        CocosActivity activity = (CocosActivity) CocosActivity.getContext();
        activity.runOnGLThread(new Runnable() {
            @Override
            public void run() {
                CocosJavascriptJavaBridge.evalString(
                    String.format("IAAAdManager.onCheckWebAccessableResult(%s);", accessable)
                );
            }
        });
    }
    
    /**
     * JSB 回调：显示应用商店结果
     */
    public static void onShowAppstoreResult(final boolean success) {
        CocosActivity activity = (CocosActivity) CocosActivity.getContext();
        activity.runOnGLThread(new Runnable() {
            @Override
            public void run() {
                CocosJavascriptJavaBridge.evalString(
                    String.format("IAAAdManager.onShowAppstoreResult(%s);", success)
                );
            }
        });
    }
}

