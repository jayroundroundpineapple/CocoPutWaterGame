"use strict";
window.__custom = function () {
    function _getRes(item) {
        return window.__res[item.url];
    }
    function downloadText(item, callback) {
        var data = _getRes(item);
        callback(null, data);
    }
    ;
    function downloadImage(item, callback, isCrossOrigin, img) {
        if (isCrossOrigin === undefined) {
            isCrossOrigin = true;
        }
        var url = _getRes(item);
        img = img || new Image();
        if (isCrossOrigin && window.location.protocol !== 'file:') {
            img.crossOrigin = 'anonymous';
        }
        else {
            img.crossOrigin = null;
        }
        if (img.complete && img.naturalWidth > 0 && img.src === url) {
            return img;
        }
        else {
            function loadCallback() {
                img.removeEventListener('load', loadCallback);
                img.removeEventListener('error', errorCallback);
                img.id = item.id;
                callback(null, img);
            }
            function errorCallback() {
                img.removeEventListener('load', loadCallback);
                img.removeEventListener('error', errorCallback);
                // Retry without crossOrigin mark if crossOrigin loading fails
                // Do not retry if protocol is https, even if the image is loaded, cross origin image isn't renderable.
                if (window.location.protocol !== 'https:' && img.crossOrigin && img.crossOrigin.toLowerCase() === 'anonymous') {
                    downloadImage(item, callback, false, img);
                }
                else {
                    callback(new Error(debug.getError(4930, url)));
                }
            }
            img.addEventListener('load', loadCallback);
            img.addEventListener('error', errorCallback);
            img.src = url;
        }
    }
    ;
    //音频
    var downloadAudio = null;
    (function () {
        var __audioSupport = cc.sys.__audioSupport;
        var formatSupport = __audioSupport.format;
        var context = __audioSupport.context;
        function convertBase64(data) {
            data = data.replace(/-/g, '+');
            data = data.replace(/_/g, '/');
            return data;
        }
        ;
        // cocos2.0以上版本加载domaudio,兼容1X版本
        function loadDomAudio2X(item, callback) {
            var data = _getRes(item);
            var dom = document.createElement('audio');
            dom.muted = false;
            if (data == null) {
                callback();
                return;
            }
            else {
                dom.src = data;
            }
            ;
            var clearEvent = function () {
                clearTimeout(timer);
                dom.removeEventListener("canplaythrough", success, false);
                dom.removeEventListener("error", failure, false);
                if (__audioSupport.USE_LOADER_EVENT)
                    dom.removeEventListener(__audioSupport.USE_LOADER_EVENT, success, false);
            };
            var timer = setTimeout(function () {
                if (dom.readyState === 0)
                    failure();
                else
                    success();
            }, 8000);
            var success = function () {
                clearEvent();
                callback(null, dom);
            };
            var failure = function () {
                clearEvent();
                var message = 'load audio failure - ' + item.url;
                cc.log(message);
                callback(message);
            };
            dom.addEventListener("canplaythrough", success, false);
            dom.addEventListener("error", failure, false);
            if (__audioSupport.USE_LOADER_EVENT)
                dom.addEventListener(__audioSupport.USE_LOADER_EVENT, success, false);
        }
        ;
        // cocos2.0以上版本加载webaudio,兼容1X版本
        function loadWebAudio2X(item, callback) {
            if (!context)
                callback(new Error('Audio Downloader: no web audio context.'));
            var data = _getRes(item);
            if (data == null) {
                callback();
                return;
            }
            data = convertBase64(data);
            data = base64toArray(data);
            if (data) {
                context["decodeAudioData"](data.buffer, function (buffer) {
                    //success
                    callback(null, buffer);
                }, function () {
                    //error
                    callback('decode error - ' + item.id, null);
                });
            }
            else {
                callback('request error - ' + item.id, null);
            }
            ;
        }
        ;
        // web加载音频
        function loadWebAudio(item, callback) {
            loadWebAudio2X(item, callback);
        }
        ;
        // dom加载音频
        function loadDomAudio(item, callback) {
            loadDomAudio2X(item, callback);
        }
        ;
        // web加载音频
        downloadAudio = function (item, callback) {
            if (formatSupport.length === 0) {
                return new Error('Audio Downloader: audio not supported on this browser!');
            }
            ;
            var loader;
            if (!__audioSupport.WEB_AUDIO) {
                // If WebAudio is not supported, load using DOM mode
                loader = loadDomAudio;
            }
            else {
                var loadByDeserializedAudio = item._owner instanceof cc.AudioClip;
                if (loadByDeserializedAudio) {
                    loader = (item._owner.loadMode === cc.AudioClip.LoadMode.WEB_AUDIO) ?
                        loadWebAudio : loadDomAudio;
                }
                else {
                    loader = (item.urlParam && item.urlParam['useDom']) ? loadDomAudio :
                        loadWebAudio;
                }
                ;
            }
            ;
            if (!loader) {
                loader = loadDomAudio;
            }
            ;
            loader(item, callback);
        };
    })();
    function base64toArray(base64) {
        // 将base64转为Unicode规则编码
        var bstr = atob(base64.substring(base64.indexOf(',') + 1)), n = bstr.length, u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n); // 转换编码后才可以使用charCodeAt 找到Unicode编码
        }
        ;
        return u8arr;
    }
    ;
    // 二进制
    var downloadBinary = null;
    (function () {
        downloadBinary = function (item, callback) {
            var data = _getRes(item);
            if (data == null) {
                callback();
                return;
            }
            ;
            data = base64toArray(data);
            callback(null, data);
        };
    }());
    // 字体
    function loadFont(item, callback) {
        var url = item.url;
        var fontFamilyName = url.replace(/[.\/ "'\\]*/g, "");
        var data = _getRes(item);
        if (data == null) {
            callback();
            return;
        }
        ;
        var fontFace = new FontFace(fontFamilyName, `url(${data})`);
        document.fonts.add(fontFace);
        fontFace.load();
        fontFace.loaded.then(function () {
            callback(null, fontFamilyName);
        }, function () {
            cc.warnID(4933, fontFamilyName);
            callback(null, fontFamilyName);
        });
    }
    ;
    // 添加加载函数
    cc.loader.addDownloadHandlers({
        // Images
        'png': downloadImage,
        'jpg': downloadImage,
        'bmp': downloadImage,
        'jpeg': downloadImage,
        'gif': downloadImage,
        'ico': downloadImage,
        'tiff': downloadImage,
        'webp': downloadImage,
        'image': downloadImage,
        // Audio
        'mp3': downloadAudio,
        'ogg': downloadAudio,
        'wav': downloadAudio,
        'm4a': downloadAudio,
        // Txt
        'txt': downloadText,
        'xml': downloadText,
        'vsh': downloadText,
        'fsh': downloadText,
        'atlas': downloadText,
        'tmx': downloadText,
        'tsx': downloadText,
        'json': downloadText,
        'ExportJson': downloadText,
        'plist': downloadText,
        'fnt': downloadText,
        // Binary
        'binary': downloadBinary,
        'bin': downloadBinary,
        'dbbin': downloadBinary,
        'pvr': downloadBinary,
        'pkm': downloadBinary,
        'default': downloadText
    });
    cc.loader.addLoadHandlers({
        // Font
        'ttf': loadFont,
        'font': loadFont,
        'eot': loadFont,
        'woff': loadFont,
        'svg': loadFont,
        'ttc': loadFont,
    });
    function base64ToBlob(base64, fileType) {
        let audioSrc = base64;
        let arr = audioSrc.split(',');
        let array = arr[0].match(/:(.*?);/);
        let mime = (array && array.length > 1 ? array[1] : type) || type;
        let bytes = window.atob(arr[1]);
        let ab = new ArrayBuffer(bytes.length);
        let ia = new Uint8Array(ab);
        for (let i = 0; i < bytes.length; i++) {
            ia[i] = bytes.charCodeAt(i);
        }
        return new Blob([ab], {
            type: mime
        });
    }
    if (cc.VideoPlayer) {
        const setURL = cc.VideoPlayer.Impl.prototype.setURL;
        cc.VideoPlayer.Impl.prototype.setURL = function (url, muted) {
            var res = _getRes({ url: url });
            if (res) {
                res = base64ToBlob(res);
                res = URL.createObjectURL(res);
                return setURL.call(this, res, muted);
            }
            return setURL.call(this, url, muted);
        };
    }
};
