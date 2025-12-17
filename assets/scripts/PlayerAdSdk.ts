import { sys } from "cc";

export class PlayerAdSdk {
    static AD_TYPE = {
        "MTG": "MTG",
        "APPLOVIN": "APPLOVIN",
        "NEWSBREAK": "NEWSBREAK",
        "UNITY": "UNITY",
        "KWAI": "KWAI",
        "IRONSOURCES": "IRONSOURCES",
        "TT": "TT",
        "BIGO":"BIGO",
        "Moloco":"Moloco"
    }
    static init() {
        if (window["AD_TYPE"] == this.AD_TYPE.MTG) {
            window["gameReady"] && window["gameReady"]();
        }
        if (window["AD_TYPE"] == this.AD_TYPE.MTG) {
            window["gameStart"] && window["gameStart"]();
        }
        if (window["AD_TYPE"] == this.AD_TYPE.UNITY) {
            if (window['mraid']) {
                if (window['mraid'].getState() === 'loading') {
                    window['mraid'].addEventListener('ready', this.onSdkReady);
                } else {
                    this.onSdkReady();
                }

            }
        }
        if (window["AD_TYPE"] == this.AD_TYPE.IRONSOURCES) {
            if (window['mraid']) {
                if (window['mraid'].getState() === 'loading') {
                    window['mraid'].addEventListener('ready', this.onSdkReady);
                } else {
                    this.onSdkReady();
                }
            }
        }
        if (window["AD_TYPE"] == this.AD_TYPE.KWAI) {
            window["ks_playable_exposurePage"]();
        }
        if (window["AD_TYPE"] == this.AD_TYPE.BIGO) {
            window["BGY_MRAID"] && window["BGY_MRAID"].gameReady();
        }
    }

    static clickPage() {
        if (window["AD_TYPE"] == this.AD_TYPE.KWAI) {
            window["ks_playable_startPlay"]();
        }
    }

    static onSdkReady() {
        if (window["AD_TYPE"] == this.AD_TYPE.UNITY) {
            window['mraid'].addEventListener('viewableChange', this.viewableChangeHandler);
            window['mraid'].addEventListener('sizeChange', this.sizeChangeHandler);
            if (window['mraid'].isViewable()) {
                this.showMyAd();
            }
        }
        if (window["AD_TYPE"] == this.AD_TYPE.IRONSOURCES) {
            window['mraid'].removeEventListener("ready", this.onSdkReady);
            window['mraid'].addEventListener('viewableChange', this.viewableChangeHandler);
            window['mraid'].addEventListener('sizeChange', this.sizeChangeHandler);
            if (window['mraid'].isViewable()) {
                this.adVisibleCallback({ isViewable: true });
            }
            // window['dapi'].addEventListener("audioVolumeChange", this.audioVolumeChangeCallback);
        }
    }

    static viewableChangeHandler(viewable) {
        if (viewable) {
            this.showMyAd();
            //console.log("---进入前台")
        } else {
            // pause
            //console.log("---进入后台")
            this.stopMyAd();
        }
    }

    static audioVolumeChangeCallback(volume) {
        let isAudioEnabled = !!volume;
        // if (isAudioEnabled) {
        //     audioEngine.setMusicVolume(1);
        //     audioEngine.setEffectsVolume(1);
        //     // 打开声音
        // } else {
        //     audioEngine.setMusicVolume(0);
        //     audioEngine.setEffectsVolume(0);
        //     // 关闭声音
        // }
    }

    static adVisibleCallback(event) {
        // console.log(​"isViewable " + event.isViewable);
        if (event.isViewable) {
            //启动或恢复广告
            sys["__audioSupport"].context.resume();
        } else {
            //暂停广告并静音
            sys["__audioSupport"].context.suspend();

        }
    }

    static showMyAd() {
    }
    static stopMyAd() {
    }
    static sizeChangeHandler() {
    }

    static gameEnd() {
        console.log('gameEnd');
        if (window["AD_TYPE"] == this.AD_TYPE.MTG) {
            window["gameEnd"] && window["gameEnd"]();
        }
        if (window["AD_TYPE"] == this.AD_TYPE.BIGO) {
            window["BGY_MRAID"] && window["BGY_MRAID"].gameEnd();
        }
        if (window["AD_TYPE"] == this.AD_TYPE.Moloco) {
            window["FBPlayableOnCTAClick"]();
        }
    }

    static jumpStore() {
        if (window["AD_TYPE"] == this.AD_TYPE.MTG) {
            window["install"] && window["install"]();
        }
        if (window["AD_TYPE"] == this.AD_TYPE.APPLOVIN) {
            window['mraid'] && window['mraid'].open()
        }
        if (window["AD_TYPE"] == this.AD_TYPE.NEWSBREAK) {
            window['mraid'] && window['mraid'].open()
        }
        if (window["AD_TYPE"] == this.AD_TYPE.UNITY) {
            if (window['mraid']) {
                let userAgent = navigator.userAgent || navigator.vendor;
                let url = window["GGURL"];
                if (/android/i.test(userAgent)) {
                    url = window["GGURL"];
                }
                window['mraid'].open(url);
            }
        }
        if (window["AD_TYPE"] == this.AD_TYPE.IRONSOURCES) {
            // window["mraid"].openStoreUrl();
            window['mraid'].open(window["GGURL"]);
        }
        if (window["AD_TYPE"] == this.AD_TYPE.KWAI) {
            window["ks_playable_openAppStore"]();
        }
        if (window["AD_TYPE"] == this.AD_TYPE.TT) {
            window.playableSDK.openAppStore();
        }
    }
}
window["PlayerAdSdk"] = PlayerAdSdk;

window["gameStart"] = function () {
}
window["gameClose"] = function () {
}