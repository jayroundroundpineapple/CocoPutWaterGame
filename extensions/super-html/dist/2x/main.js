"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
const build_1 = __importDefault(require("../core/build"));
class main {
    constructor() {
        this.messages = {
            'open-panel'() {
                Editor.Panel.open('super-html.setting');
            },
        };
    }
    //当package被正确加载的时候执行
    load() {
        Editor.Builder.on('build-start', this.funOnBuildStart);
        Editor.Builder.on('build-finished', this.funOnBuildFinished);
    }
    //当package被正确卸载的时候执行
    unload() {
        Editor.Builder.removeListener('build-start', this.funOnBuildStart);
        Editor.Builder.removeListener('build-finished', this.funOnBuildFinished);
    }
    funOnBuildStart(options, callback) {
        callback();
    }
    funOnBuildFinished(options, callback) {
        if (options.actualPlatform !== "web-mobile" && options.platform !== "web-desktop") {
            callback();
            return;
        }
        try {
            const indexPath = path.join(options.dest, "../");
            new build_1.default(Editor.App.version, options.dest, indexPath);
            Editor.log("super-html success: ," + indexPath);
        }
        catch (error) {
            Editor.error(error);
        }
        callback();
    }
}
module.exports = new main();
