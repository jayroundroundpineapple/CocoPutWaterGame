package com.sttn.bxvi;

import android.annotation.SuppressLint;
import android.app.Application;
import android.content.Context;
import android.util.Log;

import com.applovin.sdk.pub.CP_CPSDK;

/**
 * 自定义 Application 类
 * 用于 SDK 的应用级初始化
 * 位置：native/engine/android/app/src/com/sttn/bxvi/App.java
 */
public class App extends Application {
    private static final String TAG = "App";

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "App onCreate - 开始初始化 SDK");
        CP_CPSDK.CP_INIT_VMP(this);
        // AAAC_TGSDocosHelper.getInstance().initContext1(null, this);
        AAAC_TGSDocosHelper.getInstance().Anncf_cpInitSdk1();
        
        Log.d(TAG, "App onCreate - SDK 初始化完成");
    }
}
