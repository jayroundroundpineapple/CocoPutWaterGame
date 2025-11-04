/**
 * @Descripttion:
 * @version: 1.0
 * @Author: Lioesquieu
 * @Date: 2020-03-04
 * @LastEditors: Lioesquieu
 * @LastEditTime: 2020-03-04
 */
import {EventTarget} from 'cc';

export default class EventMng {

    private static eventTarget: EventTarget = new EventTarget();

    public static on(type, callback, target) {
        this.eventTarget.on(type, callback, target);
    }

    public static once(type, callback, target) {
        this.eventTarget.once(type, callback, target)
    }

    public static offTarget(target) {
        this.eventTarget.targetOff(target);
    }

    public static off(type = null, callback = null, target = null) {
        if (type) {
            this.eventTarget.off(type, callback, target);
        }
    }

    public static emit(type, arg1 = null, arg2 = null, arg3 = null, arg4 = null) {
        // cc.log("EventMng emit", type);
        this.eventTarget.emit(type, arg1, arg2, arg3, arg4)
    }
}