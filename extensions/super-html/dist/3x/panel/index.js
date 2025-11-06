"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const cache_1 = __importDefault(require("../../core/common/cache"));
const build_1 = __importDefault(require("../../core/build"));
const electron_1 = require("electron");
//@ts-ignore
window._tool = {
    cache: cache_1.default,
    build: build_1.default,
    shell: electron_1.shell,
    fs: fs_1.default,
    path: path_1.default,
};
exports.style = `#GameDiv, #Cocos3dGameContainer, #GameCanvas {
    width: 100%;
    height: 100%;
  }`;
exports.template = ` <div id="GameDiv">
<div id="Cocos3dGameContainer">
  <canvas id="GameCanvas" oncontextmenu="event.preventDefault()" tabindex="0"></canvas>
</div>
</div>`;
exports.ready = async function () {
    //@ts-ignore
    let dom = document.getElementById("dock").shadowRoot.childNodes[7].childNodes[0].childNodes[1].childNodes[0].shadowRoot;
    var GameCanvas = dom.getElementById("GameCanvas");
    var GameDiv = dom.getElementById("GameDiv");
    var Cocos3dGameContainer = dom.getElementById("Cocos3dGameContainer");
    const getElementById = document.getElementById;
    document.getElementById = function (str) {
        if (str === "GameCanvas") {
            return GameCanvas;
        }
        getElementById.call(this, str);
    };
    const querySelector = document.querySelector;
    document.querySelector = function (str) {
        if (str === "#GameCanvas") {
            return GameCanvas;
        }
        else if (str === "#GameDiv") {
            return GameDiv;
        }
        else if (str === "#Cocos3dGameContainer") {
            return Cocos3dGameContainer;
        }
        querySelector.call(this, str);
    };
    let txt = fs_1.default.readFileSync(path_1.default.join(__dirname, "../../../static", 'index.html'), "utf8");
    let str_temp = `<script type="text/javascript">`;
    var start = txt.indexOf(str_temp);
    txt = txt.substring(start + str_temp.length);
    txt = txt.replace(/<script type="text\/javascript">/g, "");
    txt = txt.replace(/<\/script>/g, "");
    txt = txt.replace(/<\/body>/g, "");
    txt = txt.replace(/<\/html>/g, "");
    eval.call(window, txt);
};
