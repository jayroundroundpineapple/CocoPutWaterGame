"use strict";
function trans(path) {
    return Editor.url("packages://super-html/" + path);
}
var fs = require("fs");
var path = require("path");
const electron = require("electron");
const build = require(trans("dist/core/build")).default;
const cache = require(trans("dist/core/common/cache")).default;
//@ts-ignore
window._tool = {
    cache: cache,
    build: build,
    shell: electron.shell,
    fs: fs,
    path: path,
};
Editor.Panel.extend({
    style: `#GameDiv, #Cocos3dGameContainer, #GameCanvas {
        width: 100%;
        height: 100%;
      }`,
    template: `
    <div id="GameDiv" >
    <div id="Cocos3dGameContainer">
      <canvas id="GameCanvas" oncontextmenu="event.preventDefault()" tabindex="0"></canvas>
    </div>
    </div>
`,
    ready() {
        //@ts-ignore
        let dom = document.getElementById(Editor.argv.panelID).shadowRoot;
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
        let txt = fs.readFileSync(Editor.url("packages://super-html/static/index.html", "utf8"), "utf8");
        let str_temp = `<script type="text/javascript">`;
        var start = txt.indexOf(str_temp);
        txt = txt.substring(start + str_temp.length);
        txt = txt.replace(/<script type="text\/javascript">/g, "");
        txt = txt.replace(/<\/script>/g, "");
        txt = txt.replace(/<\/body>/g, "");
        txt = txt.replace(/<\/html>/g, "");
        eval.call(window, txt);
    }
});
