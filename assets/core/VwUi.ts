/**
 * @Descripttion:
 * @version: 1.0
 * @Author: Lioesquieu
 * @Date: 2025-07-20
 * @LastEditors: Lioesquieu
 * @LastEditTime: 2024-08-08
 */
import {_decorator, Component, Label, Button, Sprite} from 'cc';
import { CwgStateInfo } from './CwgState';
import { VwFunland } from './VwFunland';
import EventMng from '../common/EventMng';
import { VwExchange } from './prop-anims/VwExchange';
import { VwAddGlass } from './prop-anims/VwAddGlass';

const {ccclass, menu, property} = _decorator;

@ccclass('VwUi')
@menu('cwg/VwUi')
export class VwUi extends Component {

    @property(Label)
    protected levelLabel: Label;

    @property(VwFunland)
    protected funlandView: VwFunland;

    @property(Button)
    protected undoButton: Button;

    @property(VwExchange)
    protected exchangeView: VwExchange;

    @property(VwAddGlass)
    protected addGlassView: VwAddGlass;

    public reset(info: CwgStateInfo) {
        this.levelLabel.string = "第" + (info.level + 1).toString() + "关";
        EventMng.on('completePour', this.handleCompletePour, this);
        if (this.exchangeView) {
            this.exchangeView.node.active = false;
        }
    }

    protected onDestroy() {
        EventMng.offTarget(this);
    }

    protected handleCompletePour() {
        this.updateUndoDisplayState();
    }

    protected updateUndoDisplayState() {
        this.undoButton.interactable = this.funlandView.undoStack != undefined;
        this.undoButton.node.getComponent(Sprite).grayscale = !this.undoButton.interactable;
    }

    protected handleProp(_, propName: string) {
        if (propName === "exchange") {
            this.exchangeView.show();
        } else if (propName === "undo") {
            this.funlandView.handleUndo();
            this.updateUndoDisplayState();
        } else if (propName === "addEmptyGlass") {
            this.addGlassView.show();
        }
    }
}