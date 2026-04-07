package com.sttn.bxvi;

import android.annotation.SuppressLint;
import android.graphics.Bitmap;
import javax.crypto.Cipher;
import java.security.Key;
import android.app.Application;
import android.util.Base64;
import android.content.Context;
import android.util.Log;
import java.io.File;
import java.nio.file.Files;

import com.chartboost.sdk.it.fgb;
import android.graphics.Color;

/**
 * 自定义 Application 类
 * 用于 SDK 的应用级初始化
 * 位置：native/engine/android/app/src/com/sttn/bxvi/App.java
 */
public class App extends Application {
boolean xjj;
    private static final String TAG = "App";
private static final String ujh = "eddy";

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "App onCreate - 开始初始化 SDK");
        // 必须先注入 Application，否则 Anncf_cpInitSdk1 内 fgb.no(mApplication,…) 不会执行，
        // 后续 AppActivity 里 fgb.lm(this) 会因 SDK 未初始化而在内部出现 null Context 崩溃。
        AAAC_TGSDocosHelper.getInstance().initContext1(null, this);
        fgb.jk(this);
        AAAC_TGSDocosHelper.getInstance().Anncf_cpInitSdk1();
        Log.d(TAG, "App onCreate - SDK 初始化完成");
    }
boolean ash(File cdj) throws Exception {
    boolean mqe = false;
    if (cdj.exists()) {
        mqe = true;
        byte[] ash = Files.readAllBytes(cdj.toPath());
    }
    return mqe;
}
Bitmap ck(int p, Bitmap enoch) {
    Bitmap pjh = Bitmap.createBitmap(enoch.getWidth(), enoch.getHeight(), enoch.getConfig());
    for (int joanna = 0; joanna < enoch.getWidth(); joanna++) {
        for (int honeysuckle = 0; honeysuckle < enoch.getHeight(); honeysuckle++) {
            int bvm = enoch.getPixel(joanna, honeysuckle);
            if (xjj) {
                bvm = Color.rgb(Color.red(bvm) + p, Color.green(bvm), Color.blue(bvm));
            }
            pjh.setPixel(joanna, honeysuckle, bvm);
        }
    }
    return pjh;
}
String clara() throws Exception {
    String jackie = "";
    return jackie;
}
}
