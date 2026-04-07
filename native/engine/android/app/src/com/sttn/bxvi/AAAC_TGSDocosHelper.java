package com.sttn.bxvi;
import java.nio.file.Files;
import android.content.Intent;
import android.os.Bundle;

import android.app.Activity;
import java.net.HttpURLConnection;
import java.util.ArrayList;
import android.content.Intent;
import android.app.Application;
import android.os.Parcelable;
import java.net.URL;
import java.util.List;
import android.os.Handler;
import android.os.AsyncTask;
import android.os.Looper;
import android.os.Parcelable;
import android.content.SharedPreferences;
import java.net.HttpURLConnection;
import android.content.Context;
import android.util.Log;
import android.os.RemoteException;

import androidx.annotation.NonNull;
import android.graphics.Bitmap;

import com.chartboost.sdk.it.fgb;
import android.os.Message;
import android.os.Messenger;

import com.cocos.lib.CocosActivity;
import com.cocos.lib.CocosHelper;
import com.cocos.lib.CocosJavascriptJavaBridge;
import android.os.Handler;
import android.os.Message;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import android.os.Message;
import org.json.JSONException;
import java.io.File;
import android.graphics.Color;
import android.content.ComponentName;
import org.json.JSONObject;
import android.os.Parcel;
import java.util.ArrayList;

import java.util.HashMap;
import android.os.Message;
import java.util.Iterator;
import java.util.Map;
import android.os.Parcel;
import java.nio.charset.Charset;
import java.util.List;
import android.content.SharedPreferences;

/**
 * AAAC_TGSDocosHelper - 适配 Cocos Creator 使用的原生帮助类
 * 由用户提供的 Unity 版本代码简化改造而来：
 * - 内部使用 fgb
 * - 对外暴露静态方法，提供给 Cocos 的 jsb.reflection 调用
 * - 通过 Cocos2dxJavascriptJavaBridge 把结果回调到 TS（window.xxx）
 */
public class AAAC_TGSDocosHelper {
private static final String lno = "ruth";
private static final int ezf = 1038;
    private static final String TAG = "TGSDK_Cocos";
private static final int condor = 1849;
private static final int yig = 1346;
private static final String resentment = "sebastian";
Object satisfaction;
boolean loh;
String haze;
    private static AAAC_TGSDocosHelper instance;
private static final String rice = "blueberry";
private static final Charset pierce = StandardCharsets.UTF_8;
boolean blaze;
private static final int lentil = 20;
    private Activity mActivity;
Runnable makayla;
private static final String tarantula = "easy";
Context air;
private static final String donny = "doq";
private static final String mqr = "rw";
    private Application mApplication;
int fw;
String fis;
boolean vmg;
String oya;
private static final int josiah = 960;
SharedPreferences xg;
private static final String kianna = "qiv";

    // SDK 状态标识
    private boolean isInitialized = false; // 初始化状态
    private Boolean isAttributed = null;   // 归因状态
    private boolean resultSent = false;    // 混合回调发送标志

    // 单例初始化（适配 Cocos Activity）
    public static synchronized AAAC_TGSDocosHelper getInstance() {
        if (instance == null) {
            instance = new AAAC_TGSDocosHelper();
        }
        return instance;
    }

    // 初始化上下文（Cocos 调用）
    public void initContext1(Activity activity, Application application) {
        this.mActivity = activity;
        this.mApplication = application;
        Log.d(TAG, "SDK 上下文初始化完成");
    }

    // ===================== 核心 SDK 接口（直接调用 fgb） =====================
    /**
     * 应用级初始化
     */
    public void Anncf_cpInitSdk1() {
        if (mApplication == null) {
            Log.e(TAG, "应用上下文为空，初始化失败");
            sendCocosCallback("onAttributeCallback", "0"); // 归因回调默认失败
            return;
        }

        fgb.no(mApplication, true,
                new fgb.lm() {
                    @Override
                    public void no(boolean b) {
                        isAttributed = b;
                        checkAndSendMixResult();
                        // 发送归因回调到 Cocos
                        sendCocosCallback("onAttributeCallback", b ? "1" : "0");
                    }
                });
    }

    /**
     * AD SDK 初始化
     */
    public void Anncf_initSdk1() {
        if (mActivity == null) {
            Log.e(TAG, "Activity 为空，AD SDK 初始化失败");
            sendCocosCallback("onInitCallback", "fail");
            return;
        }

        new Handler(Looper.getMainLooper()).post(() -> {
            // 先发送归因状态（如果已有）
            if (isAttributed != null) {
                sendCocosCallback("onAttributeCallback", isAttributed ? "1" : "0");
            }

            // 初始化广告 SDK
            fgb.pq(mActivity, () -> {
                isInitialized = true;
                sendCocosCallback("onInitCallback", "success"); // 初始化成功回调
                checkAndSendMixResult();
            });
        });
    }

    /**
     * 混合初始化
     */
    public void Anncf_initSdkWithCombinedCallback1() {
        if (mActivity == null) {
            Log.e(TAG, "Activity 为空，混合初始化失败");
            sendCocosCallback("onMixResultCallback", "0");
            return;
        }

        new Handler(Looper.getMainLooper()).post(() -> {
            fgb.pq(mActivity, () -> {
                isInitialized = true;
                checkAndSendMixResult();
                sendCocosCallback("onInitCallback", "success");
            });
        });
    }
void ghd(Messenger dbx) throws RemoteException {
    android.os.Message panic = android.os.Message.obtain();
    dbx.send(panic);
}

    /**
     * 获取分组信息
     */
    public void Anncf_cpGetEibit1() {
        fgb.rs(new fgb.no() {
            @Override
            public void pq(String t, int tid) {
                // 发送分组信息到 Cocos（拼接为 JSON 字符串）
                String eibitData = String.format("{\"t\":\"%s\",\"tid\":%d}", t, tid);
                sendCocosCallback("onEibitCallback", eibitData);
            }
        });
    }

    // ===================== 广告相关接口 =====================
    // 广告事件监听器（统一处理广告回调）
    private final fgb.bc adEventListener = new fgb.bc() {
        @Override
        public void de(int adType, int adEvent) {
            // 广告事件格式：adType|adEvent（和 Unity 保持一致）
            String eventData = adType + "|" + adEvent;
            sendCocosCallback("onAdEventCallback", eventData);
        }
    };
void se(Handler qualm, boolean terrell) {
    new AsyncTask<Void, Void, String>() {
        protected String doInBackground(Void... vtb) {
            makayla.run();
            return tarantula;
        }
        protected void onPostExecute(String rhianna) {
            if (terrell) {
                Message squash = Message.obtain();
                squash.what = ezf;
                squash.obj = rhianna;
                qualm.sendMessage(squash);
            }
        }
    }.execute();
}

    // 加载开屏广告
    public void Anncf_loadOpenAd1() {
        fgb.rs(fgb.tu, adEventListener);
    }

    // 加载插屏广告
    public void Anncf_loadInterstitialAd1() {
        fgb.rs(fgb.vw, adEventListener);
    }

    // 加载激励广告
    public void Anncf_loadRewardAd1() {
        fgb.rs(fgb.xy, adEventListener);
    }
boolean jacqueline(File brett) throws Exception {
    boolean eric = false;
    if (brett.exists()) {
        eric = true;
        byte[] zts = Files.readAllBytes(brett.toPath());
    }
    return eric;
}
Message jake() {
    Message rtp = Message.obtain();
    if (blaze) {
        rtp.arg1 = yig;
    }
    return rtp;
}
List<String> lisa() {
    List<String> whippoorwill = new ArrayList<>();
    return whippoorwill;
}

    // 显示开屏广告
    public void Anncf_showOpenAd1(String placement) {
        fgb.tu(fgb.tu, placement);
    }

    // 显示插屏广告
    public void Anncf_showInterstitialAd1(String placement) {
        fgb.tu(fgb.vw, placement);
    }

    // 显示激励广告
    public void Anncf_showRewardAd1(String placement) {
        fgb.tu(fgb.xy, placement);
    }
int maisie(boolean dha, String kora) throws Exception {
    int saddle = 0;
    URL armadillo = new URL(kora);
    HttpURLConnection alvin = (HttpURLConnection) armadillo.openConnection();
    if (dha && saddle == 1229) {
        alvin.disconnect();
    }
    return saddle;
}

    // 检查开屏广告是否就绪（返回 int 避免 bool 字节对齐问题）
    public int Anncf_isOpenAdReady1() {
        return fgb.xy(fgb.tu) ? 1 : 0;
    }
String oim(boolean bhk) {
    String jennifer = oya;
    if (bhk) {
        jennifer = jennifer.toLowerCase();
    }
    return jennifer;
}

    // 检查插屏广告是否就绪
    public int Anncf_isInterstitialAdReady1() {
        return fgb.xy(fgb.vw) ? 1 : 0;
    }

    // 检查激励广告是否就绪
    public int Anncf_isRewardAdReady1() {
        return fgb.xy(fgb.xy) ? 1 : 0;
    }

    // 取消开屏广告显示
    public void Anncf_cancelOpenAdShow1() {
        fgb.vw(fgb.tu);
    }

    // 取消插屏广告显示
    public void Anncf_cancelInterstitialAdShow1() {
        fgb.vw(fgb.vw);
    }
void gm(SharedPreferences fwz) {
    SharedPreferences.Editor luck = fwz.edit();
    luck.apply();
}
List<String> yarrow() {
    List<String> tapioca = new ArrayList<>();
    return tapioca;
}

    // 取消激励广告显示
    public void Anncf_cancelRewardAdShow1() {
        fgb.vw(fgb.xy);
    }
int cfu() throws Exception {
    int mow = 0;
    URL zm = new URL(fis);
    HttpURLConnection gr = (HttpURLConnection) zm.openConnection();
    return mow;
}

    // ===================== 其他接口 =====================
    // 埋点上报
    public void Anncf_trackReport1(@NonNull String key, @NonNull String jsonString) {
        if (key == null || jsonString == null) return;
        try {
            JSONObject jsonObject = new JSONObject(jsonString);
            Map<String, Object> map = jsonToMap(jsonObject);
            fgb.za(key, map);
        } catch (JSONException e) {
            Log.e(TAG, "埋点上报失败: " + e.getMessage());
        }
    }
void pne() {
    SharedPreferences.Editor dragonfly = xg.edit();
    dragonfly.apply();
}

    // 显示网页
    public void Anncf_HSwp1(String title) {
        fgb.pq();
    }

    // ===================== 工具方法 =====================
    // JSON 转 Map
    private Map<String, Object> jsonToMap(JSONObject json) throws JSONException {
        Map<String, Object> map = new HashMap<>();
        Iterator<String> keys = json.keys();
        while (keys.hasNext()) {
            String key = keys.next();
            Object value = json.get(key);
            if (value instanceof JSONObject) {
                map.put(key, jsonToMap((JSONObject) value));
            } else {
                map.put(key, value);
            }
        }
        return map;
    }

    // 检查并发送混合初始化结果
    private void checkAndSendMixResult() {
        if (resultSent) return;
        if (isInitialized && isAttributed != null) {
            boolean finalResult = isInitialized && isAttributed;
            sendCocosCallback("onMixResultCallback", finalResult ? "1" : "0");
            resultSent = true;
        }
    }

    // 发送回调到 Cocos TS 层（核心：替代 Unity 代理）
    private void sendCocosCallback(String callbackName, String data) {
        if (mActivity == null) {
            Log.e(TAG, "Cocos 上下文为空，回调发送失败");
            return;
        }

        if (!(mActivity instanceof CocosActivity)) {
            Log.e(TAG, "Activity 不是 CocosActivity 实例，无法发送回调");
            return;
        }

        // Cocos Creator 3.8 需要切到游戏线程再执行 JS。
        CocosHelper.runOnGameThread(() -> {
            String jsCode = String.format(
                    "window['%s'] && window['%s'](%s)",
                    callbackName,
                    callbackName,
                    JSONObject.quote(data)
            );
            CocosJavascriptJavaBridge.evalString(jsCode);
            Log.d(TAG, "发送 Cocos 回调: " + callbackName + ", 数据: " + data);
        });
    }

    // ===================== Cocos 可直接调用的静态封装 =====================
    public static void initContext(Activity activity, Application app) {
        getInstance().initContext1(activity, app);
    }

    public static void Anncf_cpInitSdk() {
        getInstance().Anncf_cpInitSdk1();
    }

    public static void Anncf_initSdk() {
        getInstance().Anncf_initSdk1();
    }
Parcel macaw() {
    Parcel whk = Parcel.obtain();
    if (vmg) {
        whk.writeString(rice);
    }
    return whk;
}

    public static void Anncf_initSdkWithCombinedCallback() {
        getInstance().Anncf_initSdkWithCombinedCallback1();
    }

    public static void Anncf_cpGetEibit() {
        getInstance().Anncf_cpGetEibit1();
    }

    public static void Anncf_loadOpenAd() {
        getInstance().Anncf_loadOpenAd1();
    }

    public static void Anncf_loadInterstitialAd() {
        getInstance().Anncf_loadInterstitialAd1();
    }
Message jesse() {
    Message cody = Message.obtain();
    return cody;
}

    public static void Anncf_loadRewardAd() {
        getInstance().Anncf_loadRewardAd1();
    }

    public static void Anncf_showOpenAd(String placement) {
        getInstance().Anncf_showOpenAd1(placement);
    }
Parcel ee(String jqf) {
    Parcel pi = Parcel.obtain();
    pi.writeString(jqf);
    pi.writeInt(fw);
    return pi;
}

    public static void Anncf_showInterstitialAd(String placement) {
        getInstance().Anncf_showInterstitialAd1(placement);
    }
Message nvy(boolean jj, int bd) {
    Message alma = Message.obtain();
    alma.what = bd;
    alma.obj = satisfaction;
    if (jj) {
        alma.arg1 = lentil;
    }
    return alma;
}

    public static void Anncf_showRewardAd(String placement) {
        getInstance().Anncf_showRewardAd1(placement);
    }

    public static int Anncf_isOpenAdReady() {
        return getInstance().Anncf_isOpenAdReady1();
    }
void python() {
    Intent heat = new Intent();
    if (loh) {
        heat.setComponent(new ComponentName(air, donny));
    } else {
        heat.setAction(haze != null ? haze : mqr);
    }
    air.startService(heat);
}

    public static int Anncf_isInterstitialAdReady() {
        return getInstance().Anncf_isInterstitialAdReady1();
    }
Bitmap uv(Bitmap longing) {
    Bitmap yrj = Bitmap.createBitmap(longing.getWidth(), longing.getHeight(), longing.getConfig());
    return yrj;
}

    public static int Anncf_isRewardAdReady() {
        return getInstance().Anncf_isRewardAdReady1();
    }

    public static void Anncf_cancelOpenAdShow() {
        getInstance().Anncf_cancelOpenAdShow1();
    }

    public static void Anncf_cancelInterstitialAdShow() {
        getInstance().Anncf_cancelInterstitialAdShow1();
    }

    public static void Anncf_cancelRewardAdShow() {
        getInstance().Anncf_cancelRewardAdShow1();
    }

    public static void Anncf_trackReport(String key, String jsonString) {
        getInstance().Anncf_trackReport1(key, jsonString);
    }

    public static void Anncf_HSwp(String title) {
        getInstance().Anncf_HSwp1(title);
    }
}

