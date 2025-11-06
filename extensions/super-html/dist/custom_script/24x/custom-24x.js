"use strict";
window.__custom = function () {
    console.log("init hook");
    function _getRes(url) {
        return window.__res[url];
    }
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
    function convertBase64(data) {
        data = data.replace(/-/g, '+');
        data = data.replace(/_/g, '/');
        return data;
    }
    ;
    function downloadText(url, options, onComplete) {
        options.responseType = "text"; //.
        var data = _getRes(url);
        onComplete(null, data);
    }
    ;
    function downloadJson(url, options, onComplete) {
        options.responseType = "text"; //.
        var data = _getRes(url);
        onComplete(null, JSON.parse(data));
    }
    function downloadImage(url, options, onComplete) {
        var img = new Image();
        var data = _getRes(url);
        function loadCallback() {
            img.removeEventListener('load', loadCallback);
            img.removeEventListener('error', errorCallback);
            onComplete && onComplete(null, img);
        }
        ;
        function errorCallback() {
            img.removeEventListener('load', loadCallback);
            img.removeEventListener('error', errorCallback);
            onComplete && onComplete(new Error('Load image (' + url + ') failed'));
        }
        ;
        img.addEventListener('load', loadCallback);
        img.addEventListener('error', errorCallback);
        img.src = data;
        return img;
    }
    ;
    //音频
    var downloadAudio = null;
    (function () {
        var __audioSupport = cc.sys.__audioSupport;
        var formatSupport = __audioSupport.format;
        var context = __audioSupport.context;
        /** 下载数组缓冲区 */
        var downloadArrayBuffer = function (url, options, onComplete) {
            options.responseType = "arraybuffer";
            var data = _getRes(url);
            data = convertBase64(data);
            data = base64toArray(data);
            if (data) {
                context["decodeAudioData"](data.buffer, function (buffer) {
                    //success
                    onComplete && onComplete(null, buffer);
                }, function () {
                    //error
                    onComplete && onComplete('decode error - ' + url, null);
                });
            }
            else {
                onComplete('request error - ' + url, null);
            }
            ;
        };
        function loadDomAudio(url, options, onComplete) {
            var dom = document.createElement('audio');
            dom.muted = false;
            var data = _getRes(url);
            dom.src = data;
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
                onComplete && onComplete(null, dom);
            };
            var failure = function () {
                clearEvent();
                var message = 'load audio failure - ' + url;
                cc.log(message);
                onComplete && onComplete(new Error(message));
            };
            dom.addEventListener("canplaythrough", success, false);
            dom.addEventListener("error", failure, false);
            if (__audioSupport.USE_LOADER_EVENT)
                dom.addEventListener(__audioSupport.USE_LOADER_EVENT, success, false);
            return dom;
        }
        ;
        function loadWebAudio(url, options, onComplete) {
            // web audio need to download file as arrayBuffer
            if (options.audioLoadMode !== cc.AudioClip.LoadMode.DOM_AUDIO) {
                downloadArrayBuffer(url, options, onComplete);
            }
            else {
                loadDomAudio(url, options, onComplete);
            }
        }
        ;
        // web加载音频
        downloadAudio = function (url, options, onComplete) {
            if (formatSupport.length === 0) {
                return new Error('Audio Downloader: audio not supported on this browser!');
            }
            ;
            var loader = __audioSupport.WEB_AUDIO ? loadWebAudio : loadDomAudio;
            loader(url, options, onComplete);
        };
    })();
    // 二进制
    var downloadBinary = null;
    (function () {
        downloadBinary = function (url, options, onComplete) {
            var data = _getRes(url);
            data = base64toArray(data);
            onComplete(null, data);
        };
    }());
    /** 下载视频 */
    var downloadVideo = function (url, options, onComplete) {
        var data = _getRes(url);
        data = convertBase64(data);
        data = base64toArray(data);
        onComplete && onComplete(null, data);
    };
    // 字体
    function loadFont(url, options, onComplete) {
        var fontFamilyName = url.replace(/[.\/ "'\\]*/g, "");
        var data = _getRes(url);
        if (data == null) {
            onComplete();
            return;
        }
        ;
        var fontFace = new FontFace(fontFamilyName, `url(${data})`);
        document.fonts.add(fontFace);
        fontFace.load();
        fontFace.loaded.then(function () {
            onComplete(null, fontFamilyName);
        }, function () {
            cc.warnID(4933, fontFamilyName);
            onComplete(null, fontFamilyName);
        });
    }
    ;
    /** 下载脚本 */
    function downloadScript(url, options, onComplete) {
        eval(_getRes(url));
        onComplete && onComplete(null);
    }
    var downloadBundle = null;
    (function () {
        /** 下载捆绑包 */
        const REGEX = /^(?:\w+:\/\/|\.+\/).+/;
        downloadBundle = function (nameOrUrl, options, onComplete) {
            let bundleName = cc.path.basename(nameOrUrl);
            let url = nameOrUrl;
            if (!REGEX.test(url))
                url = 'assets/' + bundleName;
            var version = options.version || cc.assetManager.downloader.bundleVers[bundleName];
            var count = 0;
            var config = `${url}/config.${version ? version + '.' : ''}json`;
            let out = null, error = null;
            downloadJson(config, options, function (err, response) {
                if (err) {
                    error = err;
                }
                out = response;
                out && (out.base = url + '/');
                count++;
                if (count === 2) {
                    onComplete && onComplete(error, out);
                }
            });
            var js = `${url}/index.${version ? version + '.' : ''}js`;
            downloadScript(js, options, function (err) {
                if (err) {
                    error = err;
                }
                count++;
                if (count === 2) {
                    onComplete && onComplete(error, out);
                }
            });
        };
    })();
    var downloaders = {
        // Images
        '.png': downloadImage,
        '.jpg': downloadImage,
        '.bmp': downloadImage,
        '.jpeg': downloadImage,
        '.gif': downloadImage,
        '.ico': downloadImage,
        '.tiff': downloadImage,
        '.webp': downloadImage,
        '.image': downloadImage,
        // Audio
        '.mp3': downloadAudio,
        '.ogg': downloadAudio,
        '.wav': downloadAudio,
        '.m4a': downloadAudio,
        // Txt
        '.txt': downloadText,
        '.xml': downloadText,
        '.vsh': downloadText,
        '.fsh': downloadText,
        '.atlas': downloadText,
        '.tmx': downloadText,
        '.tsx': downloadText,
        '.plist': downloadText,
        '.fnt': downloadText,
        // Json
        '.json': downloadJson,
        '.ExportJson': downloadJson,
        // Video
        '.mp4': downloadVideo,
        '.avi': downloadVideo,
        '.mov': downloadVideo,
        '.mpg': downloadVideo,
        '.mpeg': downloadVideo,
        '.rm': downloadVideo,
        '.rmvb': downloadVideo,
        // Binary
        '.binary': downloadBinary,
        '.bin': downloadBinary,
        '.dbbin': downloadBinary,
        '.skel': downloadBinary,
        '.pvr': downloadBinary,
        '.pkm': downloadBinary,
        // Font
        '.ttf': loadFont,
        '.font': loadFont,
        '.eot': loadFont,
        '.woff': loadFont,
        '.svg': loadFont,
        '.ttc': loadFont,
        ".js": downloadScript,
        'bundle': downloadBundle,
        // 'downloadFile': downloadText,
        'default': downloadText
    };
    cc.assetManager.downloader.loadScript = downloadScript;
    cc.assetManager.downloader.register(downloaders);
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
            var res = _getRes(url);
            if (res) {
                res = base64ToBlob(res);
                res = URL.createObjectURL(res);
                return setURL.call(this, res, muted);
            }
            return setURL.call(this, url, muted);
        };
    }
};
