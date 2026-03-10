package org.cocos2dx.javascript;

import android.app.Application;
import android.os.Bundle;
import com.sttn.bxvi.AAAC_TGSDKUnityHelper;
import com.applovin.sdk.pub.CP_CPSDK;

public class AppActivity extends Cocos2dxActivity {
    private static AppActivity instance;
    private static Application appInstance;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        instance = this;
        appInstance = getApplication();
        
        // 初始化 SDK 上下文
        AAAC_TGSDKUnityHelper.initContext(this, appInstance);
        // Activity 级初始化
        CP_CPSDK.CP_INIT_ACTIVITY(this);
    }

    // 提供静态方法获取 Activity/Application 实例
    public static AppActivity getInstance() {
        return instance;
    }

    public static Application getAppInstance() {
        return appInstance;
    }
}