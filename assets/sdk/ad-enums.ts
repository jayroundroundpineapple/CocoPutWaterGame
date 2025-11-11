export enum AdType {
    AD_TYPE_Open = 10,          // 开屏广告
    AD_TYPE_Interstitial = 13,  // 插屏广告
    AD_TYPE_Reward = 14         // 激励广告
}

export enum AdEvent {
    Loaded = 1,         // 广告加载完成
    Displayed = 2,      // 广告展示
    Hidden = 3,         // 广告隐藏
    Clicked = 4,        // 广告点击
    LoadFailed = 5,     // 广告加载失败
    DisplayFailed = 6,  // 广告展示失败
    Rewarded = 7,       // 广告奖励
    LoadTimeout = 8,    // 广告加载超时
    InitNotCompleted = 9,// 广告未初始化完成
    Loading = 10,       // 广告加载中
    Revenue = 11        // 广告收入
}