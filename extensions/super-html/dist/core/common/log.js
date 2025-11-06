"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = __importDefault(require("../config"));
const s_prefix = config_1.default.package_name + " : ";
class default_1 {
    static debug(...p) {
        if (!config_1.default.is_debug) {
            return;
        }
        this.log(...p);
    }
    static log(...p) {
        //@ts-ignore
        if (global["Editor"] && Editor.log) {
            //@ts-ignore
            Editor.log(s_prefix, ...p);
        }
        else {
            console.log(s_prefix, ...p);
        }
    }
    static warn(...p) {
        //@ts-ignore
        if (global["Editor"] && Editor.warn) {
            //@ts-ignore
            Editor.warn(s_prefix, ...p);
        }
        else {
            console.warn(s_prefix, ...p);
        }
    }
    static error(...p) {
        //@ts-ignore
        if (global["Editor"] && Editor.error) {
            //@ts-ignore
            Editor.error(s_prefix, ...p);
        }
        else {
            console.error(s_prefix, ...p);
        }
    }
}
exports.default = default_1;
