/**
 * @Descripttion: 水瓶交互控制组件
 */
import {_decorator} from 'cc';
import Glass from '../core/Glass';
import {EdGlassInfo} from './EdFunlandInfo';

const {ccclass, menu, property} = _decorator;


@ccclass('EdGlass')
@menu('cwg/EdGlass')
export default class EdGlass extends Glass {

    public info: EdGlassInfo = undefined;

    public init(info: EdGlassInfo) {
        super.init(info);
    }

}