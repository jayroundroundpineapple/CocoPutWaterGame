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
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
exports.default = {
    package_name: "super-html",
    // debug = true 会让 min_css和min_js 都变为false
    is_debug: false,
    //最大大小 mb
    max_size: 2,
    //混淆
    obfuscator: true,
    //这两个是默认开启的不给用户选
    is_min_css: true,
    is_min_js: true,
    ZIP_SCRIPT: path.join(__dirname, "..", "custom_script/pako.js"),
    // web-mobile包基础路径
    CUSTOM_SCRIPT: {
        v23x: [
            path.join(__dirname, "..", "custom_script/23x/custom-23x.js"),
            path.join(__dirname, "..", "custom_script/23x/index-23x.js"),
        ],
        v24x: [
            path.join(__dirname, "..", "custom_script/24x/custom-24x.js"),
            path.join(__dirname, "..", "custom_script/24x/index-24x.js"),
        ],
        v34x: [
            path.join(__dirname, "..", "custom_script/34x/custom-34x.js"),
            path.join(__dirname, "..", "custom_script/34x/index-34x.js"),
        ]
    },
    RES_STRING_EXTNAME_SET: new Set([
        '.txt',
        '.xml',
        '.vsh',
        '.fsh',
        '.atlas',
        '.tmx',
        '.tsx',
        '.json',
        '.ExportJson',
        '.plist',
        '.fnt',
        '.js',
        ".zip"
    ]),
    RES_FILTER_EXTNAME_SET: new Set([
        ".ico",
        ".html",
        ".css",
        ".wasm"
    ])
};
