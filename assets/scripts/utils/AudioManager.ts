import { _decorator, AudioClip, AudioSource, Node, resources, sys } from 'cc';
const { ccclass } = _decorator;

/**
 * 音频管理器
 * 统一管理背景音乐和音效
 */
export class AudioManager {
    private static instance: AudioManager = null;
    
    // 背景音乐 AudioSource
    private bgmAudioSource: AudioSource = null;
    // 音效 AudioSource
    private sfxAudioSource: AudioSource = null;
    
    // 音频资源缓存
    private audioClips: Map<string, AudioClip> = new Map();
    
    // 音乐开关状态
    private musicEnabled: boolean = true;
    // 音效开关状态
    private soundEnabled: boolean = true;
    
    // 存储键名
    private readonly MUSIC_KEY = 'game_music_enabled';
    private readonly SOUND_KEY = 'game_sound_enabled';
    
    private constructor() {
        // 从本地存储加载设置
        this.loadSettings();
    }
    
    /**
     * 获取单例实例
     */
    public static getInstance(): AudioManager {
        if (!AudioManager.instance) {
            AudioManager.instance = new AudioManager();
        }
        return AudioManager.instance;
    }
    
    /**
     * 初始化音频管理器
     * @param bgmNode 背景音乐节点（需要添加 AudioSource 组件）
     * @param sfxNode 音效节点（需要添加 AudioSource 组件）
     */
    public init(bgmNode: Node, sfxNode: Node): void {
        // 获取或添加 AudioSource 组件
        this.bgmAudioSource = bgmNode.getComponent(AudioSource) || bgmNode.addComponent(AudioSource);
        this.sfxAudioSource = sfxNode.getComponent(AudioSource) || sfxNode.addComponent(AudioSource);
        
        // 设置背景音乐循环播放
        this.bgmAudioSource.loop = true;
        
        // 加载背景音乐并自动播放
        this.loadBGM();
    }
    
    /**
     * 加载背景音乐
     */
    private loadBGM(): void {
        resources.load('audio/bgm', AudioClip, (err, clip) => {
            if (err) {
                console.error('[AudioManager] 加载背景音乐失败:', err);
                return;
            }
            this.audioClips.set('bgm', clip);
            // 如果音乐开关是开启的，自动播放
            if (this.musicEnabled) {
                this.playBGM();
            }
        });
    }
    
    /**
     * 预加载音效（可选，按需加载）
     * @param soundName 音效名称（resources/audio/ 下的文件名，不含扩展名）
     */
    public preloadSound(soundName: string): void {
        if (this.audioClips.has(soundName)) {
            return; // 已加载
        }
        
        resources.load(`audio/${soundName}`, AudioClip, (err, clip) => {
            if (err) {
                console.error(`[AudioManager] 加载音效 ${soundName} 失败:`, err);
                return;
            }
            this.audioClips.set(soundName, clip);
        });
    }
    
    /**
     * 播放背景音乐
     */
    public playBGM(): void {
        if (!this.bgmAudioSource) {
            console.warn('[AudioManager] 背景音乐 AudioSource 未初始化');
            return;
        }
        
        const clip = this.audioClips.get('bgm');
        if (!clip) {
            console.warn('[AudioManager] 背景音乐未加载');
            return;
        }
        
        if (!this.musicEnabled) {
            return;
        }
        
        this.bgmAudioSource.clip = clip;
        this.bgmAudioSource.play();
    }
    
    /**
     * 停止背景音乐
     */
    public stopBGM(): void {
        if (this.bgmAudioSource) {
            this.bgmAudioSource.stop();
        }
    }
    
    /**
     * 暂停背景音乐
     */
    public pauseBGM(): void {
        if (this.bgmAudioSource) {
            this.bgmAudioSource.pause();
        }
    }
    
    /**
     * 恢复背景音乐
     */
    public resumeBGM(): void {
        if (this.bgmAudioSource && this.musicEnabled) {
            this.bgmAudioSource.play();
        }
    }
    
    /**
     * 播放音效
     * @param soundName 音效名称（resources/audio/ 下的文件名，不含扩展名）
     * @param volume 音量（0-1），默认 1
     */
    public playSound(soundName: string, volume: number = 1): void {
        if (!this.soundEnabled) {
            return; // 音效关闭，不播放
        }
        
        if (!this.sfxAudioSource) {
            console.warn('[AudioManager] 音效 AudioSource 未初始化');
            return;
        }
        
        // 检查缓存
        let clip = this.audioClips.get(soundName);
        
        if (clip) {
            // 已加载，直接播放
            this.sfxAudioSource.playOneShot(clip, volume);
        } else {
            // 未加载，动态加载并播放
            resources.load(`audio/${soundName}`, AudioClip, (err, audioClip) => {
                if (err) {
                    console.error(`[AudioManager] 加载音效 ${soundName} 失败:`, err);
                    return;
                }
                // 缓存音效
                this.audioClips.set(soundName, audioClip);
                // 播放音效
                this.sfxAudioSource.playOneShot(audioClip, volume);
            });
        }
    }
    
    /**
     * 播放点击音效（快捷方法）
     */
    public playClickSound(): void {
        this.playSound('click');
    }
    
    /**
     * 设置音乐开关
     * @param enabled 是否开启
     */
    public setMusicEnabled(enabled: boolean): void {
        this.musicEnabled = enabled;
        this.saveSettings();
        
        if (enabled) {
            this.playBGM();
        } else {
            this.stopBGM();
        }
    }
    
    /**
     * 设置音效开关
     * @param enabled 是否开启
     */
    public setSoundEnabled(enabled: boolean): void {
        this.soundEnabled = enabled;
        this.saveSettings();
    }
    
    /**
     * 获取音乐开关状态
     */
    public isMusicEnabled(): boolean {
        return this.musicEnabled;
    }
    
    /**
     * 获取音效开关状态
     */
    public isSoundEnabled(): boolean {
        return this.soundEnabled;
    }
    
    /**
     * 设置音乐音量
     * @param volume 音量（0-1）
     */
    public setMusicVolume(volume: number): void {
        if (this.bgmAudioSource) {
            this.bgmAudioSource.volume = Math.max(0, Math.min(1, volume));
        }
    }
    
    /**
     * 设置音效音量
     * @param volume 音量（0-1）
     */
    public setSoundVolume(volume: number): void {
        if (this.sfxAudioSource) {
            this.sfxAudioSource.volume = Math.max(0, Math.min(1, volume));
        }
    }
    
    /**
     * 从本地存储加载设置
     */
    private loadSettings(): void {
        const musicSaved = sys.localStorage.getItem(this.MUSIC_KEY);
        if (musicSaved !== null) {
            this.musicEnabled = musicSaved === 'true';
        }
        
        const soundSaved = sys.localStorage.getItem(this.SOUND_KEY);
        if (soundSaved !== null) {
            this.soundEnabled = soundSaved === 'true';
        }
    }
    
    /**
     * 保存设置到本地存储
     */
    private saveSettings(): void {
        sys.localStorage.setItem(this.MUSIC_KEY, this.musicEnabled.toString());
        sys.localStorage.setItem(this.SOUND_KEY, this.soundEnabled.toString());
    }
}

