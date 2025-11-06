"use strict";
window._custom = function () {
    function _importMap() {
        var script = document.createElement('script');
        script.type = "systemjs-importmap";
        script.text = getRes("src/import-map.json");
        document.body.appendChild(script);
    }
    _importMap();
    function getResPath(key, target, log) {
        for (var k in target) {
            if (k == key) {
                return k;
            }
            const index = key.indexOf(k);
            if (index != -1 && index + k.length == key.length) {
                return k;
            }
        }
        return null;
    }
    function getRes(key) {
        return window.__res[getResPath(key, window.__res)];
    }
    function getScript(key) {
        if (key.indexOf("bullet.wasm") != -1) {
            for (var k2 in window.__js) {
                if (k2.indexOf("bullet.cocos") != -1) {
                    key = k2;
                    break;
                }
            }
        }
        let _key = getResPath(key, window.__js);
        var res = window.__js[_key];
        if (res) {
            delete window.__js[_key];
        }
        return res;
    }
    function _initScript() {
        const _createElement = document.createElement;
        document.createElement = function (type, option) {
            const v = _createElement.call(document, type, option);
            if (type == "script") {
                v.addEventListener = function (type, listener) {
                    if (type == "load") {
                        this.__load_listener = listener;
                    }
                    HTMLScriptElement.prototype.addEventListener.call(this, type, listener);
                };
                const src = Object.getOwnPropertyDescriptor(v.__proto__, "src");
                Object.defineProperty(v, "src", {
                    set: function (url) {
                        const res = getScript(url);
                        // console.log("script:", url)
                        if (!res) {
                            src.call(v, url);
                            return;
                        }
                        eval(res);
                        setTimeout(() => {
                            v.__load_listener();
                            if (window.cc) {
                                _custom_cc();
                            }
                        });
                        return;
                    }
                });
            }
            return v;
        };
    }
    function _custom_cc() {
        if (window.xxxx__) {
            return;
        }
        window.xxxx__ = true;
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
        if (cc.internal.VideoPlayerImplManager) {
            function downloadVideo(url, options, onComplete) {
                var video = document.createElement('video');
                var source = document.createElement('source');
                video.appendChild(source);
                onComplete(null, video);
            }
            cc.assetManager.downloader.register({
                '.mp4': downloadVideo,
                '.avi': downloadVideo,
                '.mov': downloadVideo,
                '.mpg': downloadVideo,
                '.mpeg': downloadVideo,
                '.rm': downloadVideo,
                '.rmvb': downloadVideo
            });
            const getImpl = cc.internal.VideoPlayerImplManager.getImpl;
            cc.internal.VideoPlayerImplManager.getImpl = function (comp) {
                const impl = getImpl.call(this, comp);
                const createVideoPlayer = impl.createVideoPlayer;
                impl.createVideoPlayer = function (url) {
                    var res = getRes(url);
                    if (res) {
                        res = base64ToBlob(res);
                        res = URL.createObjectURL(res);
                        return createVideoPlayer.call(this, res);
                    }
                    return createVideoPlayer.call(this, url);
                };
                return impl;
            };
        }
        function _initFont() {
            function loadFont(url, options, onComplete) {
                var fontFamilyName = url.replace(/[.\/ "'\\]*/g, "");
                var data = getRes(url);
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
                    console.error(`url${url}load fail`);
                    onComplete(null, fontFamilyName);
                });
            }
            ;
            cc.assetManager.downloader.register({
                '.font': loadFont,
                '.eot': loadFont,
                '.ttf': loadFont,
                '.woff': loadFont,
                '.svg': loadFont,
                '.ttc': loadFont,
            });
        }
        _initFont();
    }
    _initScript();
    function base64toArrayBuffer(base64) {
        // 将base64转为Unicode规则编码
        var bstr = atob(base64.substring(base64.indexOf(',') + 1)), n = bstr.length, u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n); // 转换编码后才可以使用charCodeAt 找到Unicode编码
        }
        ;
        return u8arr.buffer;
    }
    function _initXMLHttp() {
        const _XMLHttpRequest = window.XMLHttpRequest;
        window.XMLHttpRequest = function () {
            const v = new _XMLHttpRequest();
            v.open = function (method, url, async, password) {
                const res = getRes(url);
                // console.log("XMLHttpRequest:", url)
                if (!res) {
                    v.__proto__.open.call(v, method, url, true, password);
                    return;
                }
                v.send = function () {
                    let _response = null;
                    switch (this.responseType) {
                        case "json":
                            _response = JSON.parse(res);
                            break;
                        case "text":
                            _response = res;
                            break;
                        case "arraybuffer":
                            _response = base64toArrayBuffer(res);
                            break;
                        default:
                            console.err("type error", url, this.responseType);
                            break;
                    }
                    Object.defineProperty(this, "response", {
                        get: function () {
                            return _response;
                        }
                    });
                    this.onload();
                };
            };
            return v;
        };
    }
    _initXMLHttp();
    function _initImage() {
        const _Image = window.Image;
        window.Image = function () {
            const v = new _Image();
            const src = Object.getOwnPropertyDescriptor(v.__proto__, "src");
            Object.defineProperty(v, "src", {
                set: function (url) {
                    //   console.log("Image:", url)
                    const res = getRes(url);
                    if (res) {
                        src.set.call(v, res);
                    }
                    else {
                        src.set.call(v, url);
                    }
                }
            });
            return v;
        };
    }
    _initImage();
    function _get_path(key) {
        for (var k in window.__res) {
            if (k.indexOf(key) == 0) {
                return k;
            }
        }
        throw Error("no find " + key);
    }
    function _eval(name) {
        eval(window.__js[name]);
        delete window.__js[name];
    }
    _eval(_get_path("src/polyfills.bundle"));
    _eval(_get_path("src/system.bundle"));
    System.import('./' + _get_path("index")).catch(function (err) {
        console.error(err);
    });
};
