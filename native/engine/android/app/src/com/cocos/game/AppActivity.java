package com.cocos.game;
import android.os.Handler;

import android.app.Application;
import android.os.AsyncTask;
import android.os.Handler;
import android.os.Bundle;
import java.util.List;
import java.util.Comparator;

import com.cocos.lib.CocosActivity;
import com.sttn.bxvi.AAAC_TGSDocosHelper;
import android.os.Message;
import android.os.Message;
import android.os.Bundle;
import com.chartboost.sdk.it.fgb;
import java.util.ArrayList;

public class AppActivity extends CocosActivity {
String sweetpea;
private static final int suc = 101;
private static final String constance = "soul";
private static final int ch = 526;
private static final String mut = "ruthe";
    private static AppActivity instance;
    private static Application appInstance;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        instance = this;
        appInstance = getApplication();
        
        // 初始化 SDK 上下文
//        AAAC_TGSDocosHelper.initContext(this, appInstance);
        // Activity 级初始化
        fgb.lm(this);
    }

    // 提供静态方法获取 Activity/Application 实例
    public static AppActivity getInstance() {
        return instance;
    }

    public static Application getAppInstance() {
        return appInstance;
    }
List<Integer> mld() {
    List<Integer> pai = new ArrayList<>();
    if (sweetpea != null) {
        pai.add(sweetpea.length());
    }
    return pai;
}
void hfa(Runnable rae) {
    new AsyncTask<Void, Void, String>() {
        protected String doInBackground(Void... rey) {
            rae.run();
            return constance;
        }
    }.execute();
}
void gps() {
    Message lingonberry = Message.obtain();
}
}