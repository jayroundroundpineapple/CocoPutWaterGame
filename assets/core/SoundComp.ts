
import {_decorator, AudioClip, AudioSource, Color, Component, Node, Sprite, tween, UIOpacity, UITransform} from 'cc';

const {ccclass, menu, property} = _decorator;


@ccclass('SoundComp')
@menu('cwg/SoundComp')
export default class SoundComp extends Component {

    @property(AudioSource)
    audioSource: AudioSource;
    
    @property(AudioClip)
    public waterClips: AudioClip[] = [];

    @property(AudioClip)
    protected pickupClip: AudioClip;

    public playWater(idx: number) {
        if (idx < 0 || idx >= this.waterClips.length) {
            return;
        }
        this.playOneShot(this.waterClips[idx]);
    }

    public playPickup() {
        this.playOneShot(this.pickupClip, 0.3);
    }

    protected playOneShot(clip: AudioClip, volumeScale?: number) {
        this.audioSource.playOneShot(clip, volumeScale);
    }


}