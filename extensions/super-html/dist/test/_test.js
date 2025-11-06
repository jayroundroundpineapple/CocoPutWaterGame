"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const build_1 = __importDefault(require("../core/build"));
const config_1 = __importDefault(require("../core/config"));
let _path = "D:/project/tool/super-html/ccc_project/";
let _out = "D:/project/tool/super-html/build/";
// run("2.3.4","234_example-cases/build/web-mobile", "234_example/");
// run("2.4.0","247_example-cases/build/web-mobile", "247_example/");
// run("3.4.1", "341_example/build/web-mobile", "341_example/");
run("3.4.1", "super-html-gui/build/web-mobile", "super_ui_example/");
// config.obfuscator = false
config_1.default.is_debug = false;
function run(engine_version, input, out) {
    config_1.default.max_size = 0;
    // new build(engine_version,_path + input, _out + out.replace(".html", "_zip.html"))
    config_1.default.obfuscator = true;
    new build_1.default(engine_version, _path + input, _out + out, () => {
        console.log("success");
    });
}
