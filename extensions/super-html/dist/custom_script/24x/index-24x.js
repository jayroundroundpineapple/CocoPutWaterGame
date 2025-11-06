"use strict";
(function () {
    console.timeEnd("load html");
    if (!window["JSZip"]) {
        _initJs();
        return;
    }
    _zip();
    function _zip() {
        console.log("init unzip");
        console.time("load res");
        window.__res = window.__res || {};
        const zip = new JSZip();
        let progress = 0;
        zip.loadAsync(window.__zip, {
            base64: true
        }).then(function (zip) {
            for (var filePath in zip.files) {
                if (zip.files[filePath].dir)
                    continue;
                progress++;
                // console.log(filePath, type);
                let key = filePath;
                zip.file(key).async("string").then(function (data) {
                    window.__res[key] = data;
                    progress--;
                    if (progress == 0) {
                        console.timeEnd("load res");
                        _initJs();
                    }
                });
            }
            ;
        }).catch((err) => {
            throw err;
        });
    }
    function _eval(txt) {
        eval.call(window, txt);
    }
    function _initJs() {
        console.log("init js");
        window.__js = {};
        for (var filePath in window.__res) {
            let suffix = filePath.split(".");
            suffix = "." + suffix[suffix.length - 1];
            if (suffix == ".js") {
                window.__js[filePath] = window.__res[filePath];
            }
        }
        var arr = ["src/settings.js", "main.js", "cocos2d-js.js", "cocos2d-js-min.js", "physics.js", "physics-min.js"];
        for (let i = 0; i < arr.length; i++) {
            _eval(window.__js[arr[i]]);
        }
        _success();
    }
    function _vconsole() {
        if (window.__js["vconsole.min.js"]) {
            _eval(window.__js["vconsole.min.js"]);
            delete window.__js["vconsole.min.js"];
            window.VConsole && (window.vConsole = new VConsole());
        }
    }
    function _success() {
        _vconsole();
        var funGameRun = cc.game.run;
        cc.game.run = function (option, onStart) {
            option.jsList = [];
            funGameRun.call(cc.game, option, onStart);
        };
        window.__custom();
        // 游戏启动脚本
        window.boot();
    }
})();
