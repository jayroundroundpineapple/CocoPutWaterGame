"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = __importDefault(require("./config"));
const log_1 = __importDefault(require("./common/log"));
const task_1 = __importDefault(require("./task"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const cache_1 = __importDefault(require("./common/cache"));
class build {
    constructor(engine_version, path_input_dir, path_out_dir, cb) {
        log_1.default.log("-- start --");
        log_1.default.log("engine version " + engine_version);
        let version = "";
        if (engine_version.search(/3.[0-9].[0-9]/) == 0) {
            if (engine_version.search(/3.[0-2]/) == 0) {
                throw Error(`This engine version is not supported. Please contact the developer`);
            }
            version = "34x";
        }
        else if (engine_version.search(/2.4.[0-9]/) == 0) {
            version = "24x";
        }
        else if (engine_version.search(/2.[0-9].[0-9]/) == 0) {
            version = "23x";
        }
        else {
            throw Error(`This engine version is not supported. Please contact the developer`);
        }
        //@ts-ignore
        let l_custom_script = config_1.default.CUSTOM_SCRIPT["v" + version];
        if (config_1.default.is_debug) {
            config_1.default.is_min_js = false;
            config_1.default.is_min_css = false;
        }
        if (!fs_1.default.existsSync(path_out_dir)) {
            fs_1.default.mkdirSync(path_out_dir);
        }
        this.build(l_custom_script, path_input_dir, path_out_dir, cb);
    }
    async build(l_custom_script, path_input_dir, path_out_dir, cb) {
        task_1.default.clear();
        let _task = new task_1.default({
            l_custom_script: l_custom_script,
            path_input_dir: path_input_dir,
            path_html: path_1.default.join(path_input_dir, "index.html"),
            path_out_file: path_1.default.join(path_out_dir, "index.html"),
            enable_obfuscator: cache_1.default.get().enable_obfuscator,
            max_size: cache_1.default.get().max_size * 1024 * 1024,
        });
        await _task.build();
        log_1.default.log("-- end --");
        cb && cb();
    }
}
exports.default = build;
