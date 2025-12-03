import { _decorator, Button, Component, Node, SpriteFrame, AudioSource, sys, Tween, tween, Vec3, EditBox, Label, Graphics } from 'cc';
import { AdManager } from './adManager';
import { AdType } from './ad-enums';
import { PuzzleManager } from './PuzzleManager';
import { SettingUI } from '../UI/SettingUI';
import { LevelUnlockUI } from '../UI/LevelUnlockUI';
import { ChapterUI } from '../UI/ChapterUI';
import { PuzzleSuccessUI } from '../UI/PuzzleSuccessUI';
import { AudioManager } from '../utils/AudioManager';
import { Utils } from '../utils/Utils';
const { ccclass, property } = _decorator;

@ccclass('GameUI')
export class GameUI extends Component {
    @property(Node)
    private testPraphics: Node = null;
    @property(Node)
    private testBtn: Node = null;
    @property(Node)
    private initButton: Node = null;
    @property(Node)
    private settingBtn: Node = null;
    @property(SettingUI)
    private settingUI: SettingUI = null;
    @property(PuzzleManager)
    private puzzleManager: PuzzleManager = null;  //拼图管理器
    @property(ChapterUI)
    private chapterUI: ChapterUI = null;  // 章节选择UI
    @property(LevelUnlockUI)
    private levelUnlockUI: LevelUnlockUI = null;  // 关卡解锁UI
    @property(PuzzleSuccessUI)
    private puzzleSuccessUI: PuzzleSuccessUI = null;  // 拼图成功弹窗UI
    @property(Node)
    private puzzleGameUI: Node = null;  // 拼图游戏UI
    @property(Node)
    private exitGameBtn: Node = null;
    @property(Node)
    private hardTip: Node = null;
    @property(Node)
    private hardMask: Node = null;
    @property(Node)
    private levelInputDialog: Node = null;  // 关卡输入弹窗
    @property(EditBox)
    private levelInputEditBox: EditBox = null;  // 关卡输入框
    @property(Button)
    private levelInputConfirmBtn: Button = null;  // 确认按钮
    @property(Button)
    private levelInputCancelBtn: Button = null;  // 取消按钮
    @property(SpriteFrame)
    private puzzleImage: SpriteFrame = null;  // 拼图图片


    private bgmNode: Node = null; // 背景音乐节点
    private sfxNode: Node = null; // 音效节点
    private audioManager: AudioManager = null;

    // 当前章节信息（用于返回章节时使用）
    private currentChapter: number = 1;
    private currentStartLevel: number = 1;
    private currentEndLevel: number = 25;
    // 刚刚通关的关卡编号（用于播放解锁动画）
    private justCompletedLevel: number = 0;

    start() {
        (window as any).gameUI = this;
        this.puzzleGameUI.active = this.testBtn.active = false;
        
        //*测试绘图路径 */
        // const ctx = this.testPraphics.getComponent(Graphics);
        // const path: Array<{
        //     type: 'move' | 'line' | 'arc';
        //     x?: number; y?: number; cx?: number; cy?: number;
        //     r?: number; startAngle?: number; endAngle?: number; anticlockwise?: boolean
        // }> = [];
        // path.push({ type: 'move', x: 0, y: 50 });
        // path.push({ type: 'arc', cx: 0, cy: 0, r: 50, startAngle: 1 * Math.PI, endAngle: 0.5 * Math.PI, anticlockwise: false });
        // path.push({ type: 'line', x: 200, y: 50 });
        // for (const cmd of path) {
        //     if (cmd.type === 'move') {
        //         ctx.moveTo(cmd.x!, cmd.y!);
        //     } else if (cmd.type === 'line') {
        //         ctx.lineTo(cmd.x!, cmd.y!);
        //     } else if (cmd.type === 'arc') {
        //         ctx.arc(cmd.cx!, cmd.cy!, cmd.r!, cmd.startAngle!, cmd.endAngle!, cmd.anticlockwise!);
        //     }
        // }
        // ctx.stroke();
        // ctx.moveTo(100, 0);
        // ctx.arc(0, 0, 50, 0, 1 * Math.PI, false); //true为逆时针，false顺时针
        // ctx.stroke();
        //*测试绘图路径 */


        // 初始状态：显示章节界面，隐藏关卡解锁界面
        if (this.levelUnlockUI && this.levelUnlockUI.node) {
            this.levelUnlockUI.node.active = false;
        }
        // 初始状态：隐藏困难提示
        if (this.hardTip) {
            this.hardTip.active = false;
        }
        this.initButton.on(Node.EventType.TOUCH_END, this.onInitButtonClick, this);
        this.initTestButton();
        this.initLevelInputDialog();
        this.initPuzzle();
        this.initSettingUI();
        this.initChapterUI();
        this.initLevelUnlockUI();
        this.initPuzzleSuccessUI();
        this.initExitButton();
        this.initAudio();
        this.initPreload();
    }

    /**
     * 初始化预加载
     */
    private initPreload(): void {
        if (!this.puzzleManager) {
            console.warn('[GameUI] PuzzleManager 未设置，无法预加载资源');
            return;
        }

        // 等待配置加载完成后再预加载图片
        this.scheduleOnce(() => {
            this.startPreload();
        }, 0.5);
    }
    /**
     * 初始化测试按钮
     */
    private initTestButton(): void {
        if (this.testBtn) {
            this.testBtn.on(Node.EventType.TOUCH_END, this.onTestButtonClick, this);
        } else {
            console.warn('[GameUI] 未设置测试按钮');
        }
    }

    /**
     * 初始化关卡输入弹窗
     */
    private initLevelInputDialog(): void {
        if (this.levelInputDialog) {
            // 初始状态：隐藏弹窗
            this.levelInputDialog.active = false;

            // 绑定确认按钮
            if (this.levelInputConfirmBtn) {
                this.levelInputConfirmBtn.node.on(Node.EventType.TOUCH_END, this.onLevelInputConfirm, this);
            }

            // 绑定取消按钮
            if (this.levelInputCancelBtn) {
                this.levelInputCancelBtn.node.on(Node.EventType.TOUCH_END, this.onLevelInputCancel, this);
            }
        } else {
            console.warn('[GameUI] 未设置关卡输入弹窗');
        }
    }

    /**
     * 测试按钮点击事件
     * 显示输入弹窗
     */
    private onTestButtonClick(): void {
        if (this.levelInputDialog) {
            this.levelInputDialog.active = true;
            // 清空输入框
            if (this.levelInputEditBox) {
                this.levelInputEditBox.string = '';
                // 聚焦到输入框（延迟一下确保弹窗已显示）
                this.scheduleOnce(() => {
                    if (this.levelInputEditBox && this.levelInputEditBox.node.active) {
                        this.levelInputEditBox.focus();
                    }
                }, 0.1);
            }
        } else {
            console.warn('[GameUI] 关卡输入弹窗未设置');
        }
    }

    /**
     * 关卡输入确认按钮点击事件
     */
    private onLevelInputConfirm(): void {
        if (!this.levelInputEditBox) {
            console.warn('[GameUI] 关卡输入框未设置');
            return;
        }

        const input = this.levelInputEditBox.string.trim();
        if (!input) {
            console.warn('[GameUI] 请输入关卡编号');
            return;
        }

        const level = parseInt(input, 10);
        if (isNaN(level) || level < 1 || level > 50) {
            console.warn('[GameUI] 请输入有效的关卡编号（1-50）');
            // 可以在这里显示提示信息，或者使用 Label 显示错误信息
            return;
        }

        // 隐藏弹窗
        if (this.levelInputDialog) {
            this.levelInputDialog.active = false;
        }

        console.log(`[GameUI] 快速解锁并跳转到关卡 ${level}`);
        this.quickUnlockAndJumpToLevel(level);
    }

    /**
     * 关卡输入取消按钮点击事件
     */
    private onLevelInputCancel(): void {
        // 隐藏弹窗
        if (this.levelInputDialog) {
            this.levelInputDialog.active = false;
        }
    }

    /**
     * 快速解锁到指定关卡之前的所有关卡，并跳转到该关卡
     * @param level 目标关卡编号（全局关卡编号）
     */
    public quickUnlockAndJumpToLevel(level: number): void {
        console.log(`[GameUI] 快速解锁并跳转到关卡 ${level}`);

        // 1. 确定目标关卡所在的章节
        let targetChapter = 1;
        let targetStartLevel = 1;
        let targetEndLevel = 25;

        if (level >= 1 && level <= 25) {
            targetChapter = 1;
            targetStartLevel = 1;
            targetEndLevel = 25;
        } else if (level >= 26 && level <= 50) {
            targetChapter = 2;
            targetStartLevel = 26;
            targetEndLevel = 50;
        }

        // 2. 如果目标关卡在第二章节，需要先解锁第一章节的所有关卡
        if (targetChapter > 1) {
            // 先进入第一章节，解锁所有关卡
            this.enterChapter(1, 1, 25, false);
            this.scheduleOnce(() => {
                if (this.levelUnlockUI) {
                    // 解锁第一章节的所有关卡（1-25），传入 26 表示解锁到 26 之前的所有关卡
                    this.levelUnlockUI.quickUnlockBeforeLevel(26, false);
                    // 检查第一章节是否完成，并更新 ChapterUI
                    if (this.levelUnlockUI.isChapterCompleted()) {
                        if (this.chapterUI) {
                            this.chapterUI.updateChapterCompleted(1);
                            // 解锁第二章节
                            this.chapterUI.unlockChapter(2);
                        }
                    }
                }
                // 3. 进入目标章节
                this.scheduleOnce(() => {
                    this.enterChapter(targetChapter, targetStartLevel, targetEndLevel, false);
                    // 4. 解锁目标章节中目标关卡之前的所有关卡（如果目标关卡不是章节第一关）
                    this.scheduleOnce(() => {
                        if (this.levelUnlockUI && level > targetStartLevel) {
                            this.levelUnlockUI.quickUnlockBeforeLevel(level, false);
                        }
                        // 所有操作完成后，更新关卡标签
                        this.scheduleOnce(() => {
                            if (this.levelUnlockUI) {
                                this.levelUnlockUI.updateLevelLabel();
                            }
                        }, 0.1);
                    }, 0.2);
                }, 0.2);
            }, 0.2);
        } else {
            // 目标关卡在第一章节
            this.enterChapter(targetChapter, targetStartLevel, targetEndLevel, false);
            // 解锁目标关卡之前的所有关卡
            this.scheduleOnce(() => {
                if (this.levelUnlockUI && level > targetStartLevel) {
                    this.levelUnlockUI.quickUnlockBeforeLevel(level, false);
                    // 检查第一章节是否完成，并更新 ChapterUI
                    if (this.levelUnlockUI.isChapterCompleted()) {
                        if (this.chapterUI) {
                            this.chapterUI.updateChapterCompleted(1);
                            this.chapterUI.unlockChapter(2);
                        }
                    }
                }
                // 所有操作完成后，更新关卡标签
                this.scheduleOnce(() => {
                    if (this.levelUnlockUI) {
                        this.levelUnlockUI.updateLevelLabel();
                    }
                }, 0.1);
            }, 0.2);
        }
    }

    /**
     * 
     * @param level 关卡编号（全局关卡编号）
     */
    public quickUnlockBeforeLevel(level: number): void {
        if (this.levelUnlockUI) {
            this.levelUnlockUI.quickUnlockBeforeLevel(level, false);
        }
    }

    /**
     * 开始预加载所有关卡图片
     */
    private startPreload(): void {
        if (!this.puzzleManager) {
            return;
        }

        console.log('[GameUI] 开始预加载所有关卡图片资源...');

        // 设置预加载进度回调
        this.puzzleManager.onPreloadProgress = (loaded: number, total: number) => {
            const progress = Math.floor((loaded / total) * 100);
            if (loaded % 10 === 0 || loaded === total) {
                console.log(`[GameUI] 预加载进度: ${loaded}/${total} (${progress}%)`);
            }
        };

        // 设置预加载完成回调
        this.puzzleManager.onPreloadComplete = () => {
            console.log('[GameUI] ✅ 所有关卡图片预加载完成！游戏可以流畅运行了');
        };

        // 开始预加载
        this.puzzleManager.preloadAllImages(
            (loaded: number, total: number) => {
                // 进度回调
                const progress = Math.floor((loaded / total) * 100);
                if (loaded % 10 === 0 || loaded === total) {
                    console.log(`[GameUI] 预加载进度: ${loaded}/${total} (${progress}%)`);
                }
            },
            () => {
                // 完成回调
                console.log('[GameUI] ✅ 所有关卡图片预加载完成！游戏可以流畅运行了');
            }
        );
    }

    /**
     * 初始化音频系统
     */
    private initAudio(): void {
        // 获取音频管理器实例
        this.audioManager = AudioManager.getInstance();

        // 创建音频节点（如果未设置）
        if (!this.bgmNode) {
            this.bgmNode = new Node('BGMNode');
            this.bgmNode.parent = this.node;
            this.bgmNode.addComponent(AudioSource);
        }

        if (!this.sfxNode) {
            this.sfxNode = new Node('SFXNode');
            this.sfxNode.parent = this.node;
            this.sfxNode.addComponent(AudioSource);
        }

        // 初始化音频管理器（会自动播放背景音乐）
        this.audioManager.init(this.bgmNode, this.sfxNode);

        console.log('[GameUI] 音频系统初始化完成，背景音乐已开始播放');
    }

    /**
     * 初始化设置界面
     */
    private initSettingUI() {
        if (this.settingUI) {
            // 设置关闭回调
            this.settingUI.onClose = () => {
                console.log('[GameUI] 设置界面已关闭');
                this.restoreSettingButton();
            };
            // 设置返回首页回调
            this.settingUI.onHome = () => {
                console.log('[GameUI] 从设置界面返回首页');
                this.backToHome();
            };
            // 设置重置关卡回调
            this.settingUI.onReloadLevel = () => {
                console.log('[GameUI] 重置当前关卡');
                this.reloadCurrentLevel();
                this.closeSetting();
            };
        }
    }

    /**
     * 重置当前关卡
     */
    private reloadCurrentLevel(): void {
        if (this.puzzleManager) {
            this.puzzleManager.restartLevel();
            console.log('[GameUI] 关卡已重置');
            // 更新困难模式提示显示
            this.updateHardTipVisibility();
        } else {
            console.error('[GameUI] PuzzleManager 未设置，无法重置关卡');
        }
    }

    /**
     * 更新困难模式提示的显示状态
     */
    private updateHardTipVisibility(): void {
        if (!this.hardTip) {
            return;
        }
        if (this.puzzleManager) {
            const isHard = this.puzzleManager.isCurrentLevelHard();
            if (isHard) {
                this.hardTip.setScale(0, 0, 1);
                this.hardTip.active = true;
                this.scheduleOnce(() => {
                    this.hardMask.active = true;
                }, 0.1)
                tween(this.hardTip).delay(0.2)
                    .to(0.5, { scale: new Vec3(1, 1, 1) })
                    .delay(0.7)
                    .to(0.5, { scale: new Vec3(0, 0, 1) })
                    .call(() => {
                        this.hardTip.active = false;
                        this.hardMask.active = false;
                    })
                    .start();
            } else {
                console.log('[GameUI] 当前关卡为普通模式，隐藏困难提示');
            }
        }
    }

    /**
     * 初始化章节UI
     */
    private initChapterUI() {
        if (this.chapterUI) {
            // 设置进入章节回调
            this.chapterUI.onEnterChapter = (chapter: number, startLevel: number, endLevel: number) => {
                this.enterChapter(chapter, startLevel, endLevel, false);
            };
        }
    }

    /**
     * 初始化关卡解锁UI
     */
    private initLevelUnlockUI() {
        if (this.levelUnlockUI) {
            // 设置进入关卡回调（点击卡牌时触发）
            this.levelUnlockUI.onEnterLevel = (level: number) => {
                this.testBtn.active = false;
                this.enterLevel(level);
            };
            // 设置返回章节界面回调
            this.levelUnlockUI.onBackToChapter = () => {
                this.backToChapter();
                this.testBtn.active = false;
            };
        }
    }

    /**
     * 初始化拼图成功弹窗UI
     */
    private initPuzzleSuccessUI() {
        if (this.puzzleSuccessUI) {
            // 设置下一关回调
            this.puzzleSuccessUI.onNextLevel = () => {
                this.onNextLevelClick();
            };
        }
    }

    /**
     * 下一关按钮点击处理
     */
    private onNextLevelClick(): void {
        if (this.puzzleGameUI) {
            this.puzzleGameUI.active = false;
        }
        // 返回到章节UI，然后自动进入章节并显示解锁动画
        this.backToChapterWithUnlockAnimation();
    }

    /**
     * 返回章节界面并显示解锁动画
     */
    private backToChapterWithUnlockAnimation(): void {
        console.log('[GameUI] 返回章节界面并显示解锁动画');
        if (this.levelUnlockUI && this.levelUnlockUI.node) {
            this.levelUnlockUI.node.active = false;
        }
        this.scheduleOnce(() => {
            this.enterChapter(this.currentChapter, this.currentStartLevel, this.currentEndLevel, true);
        }, 0.3);
    }

    /**
     * 进入指定章节
     */
    private enterChapter(chapter: number, startLevel: number, endLevel: number, showUnlockAnimation: boolean = false): void {
        console.log(`[GameUI] 进入章节 ${chapter}，关卡范围：${startLevel}-${endLevel}`);

        // 保存当前章节信息
        this.testBtn.active = true;
        this.currentChapter = chapter;
        this.currentStartLevel = startLevel;
        this.currentEndLevel = endLevel;

        // 隐藏章节界面
        if (this.chapterUI && this.chapterUI.node) {
            this.chapterUI.hide();
        }

        // 显示关卡解锁UI
        if (this.levelUnlockUI && this.levelUnlockUI.node) {
            // 根据章节计算网格布局（5x5）
            const gridRows = 5;
            const gridCols = 5;

            // 获取章节对应的背景图
            let chapterBackgroundImage: SpriteFrame | null = null;
            if (this.chapterUI) {
                chapterBackgroundImage = this.chapterUI.getChapterBackgroundImage(chapter);
            }
            // 初始化关卡解锁UI，传入章节背景图
            this.levelUnlockUI.init(chapter, startLevel, endLevel, gridRows, gridCols, chapterBackgroundImage);
            this.levelUnlockUI.node.active = true;

            if (showUnlockAnimation && this.justCompletedLevel > 0) {
                this.scheduleOnce(() => {
                    this.levelUnlockUI.playUnlockAnimationForLevel(this.justCompletedLevel);
                    this.justCompletedLevel = 0;
                }, 0.2);
            }
        }
    }

    /**
     * 返回章节界面
     */
    private backToChapter(): void {
        console.log('[GameUI] 返回章节界面');

        // 隐藏关卡解锁UI
        if (this.levelUnlockUI && this.levelUnlockUI.node) {
            this.levelUnlockUI.node.active = false;
        }

        // 刷新章节UI状态（检查章节完成状态和解锁状态）
        if (this.chapterUI && this.chapterUI.node) {
            // 检查并更新所有章节的完成状态
            for (let chapter = 1; chapter <= 2; chapter++) {
                if (this.chapterUI.isChapterCompleted(chapter)) {
                    this.chapterUI.updateChapterCompleted(chapter);
                    // 如果第一章节完成，解锁第二章节
                    if (chapter === 1 && !this.chapterUI.isChapterUnlocked(2)) {
                        this.chapterUI.unlockChapter(2);
                    }
                }
            }
            this.chapterUI.show();
        }
    }

    /**
     * 返回首页（从设置界面）
     */
    private backToHome(event = null,custom = null): void {
        console.log('[GameUI] 返回首页');
        if (event && custom && custom == 99) {
            AudioManager.getInstance().playClickSound();
        }
        // 隐藏拼图游戏UI
        if (this.puzzleGameUI) {
            this.puzzleGameUI.active = false;
        }

        // 隐藏关卡解锁UI
        if (this.levelUnlockUI && this.levelUnlockUI.node) {
            this.levelUnlockUI.node.active = false;
        }

        // 刷新章节UI状态（检查章节完成状态和解锁状态）
        if (this.chapterUI && this.chapterUI.node) {
            // 检查并更新所有章节的完成状态
            for (let chapter = 1; chapter <= 2; chapter++) {
                if (this.chapterUI.isChapterCompleted(chapter)) {
                    this.chapterUI.updateChapterCompleted(chapter);
                    // 如果第一章节完成，解锁第二章节
                    if (chapter === 1 && !this.chapterUI.isChapterUnlocked(2)) {
                        this.chapterUI.unlockChapter(2);
                    }
                }
            }
            this.chapterUI.show();
        }
    }

    /**
     * 进入指定关卡
     */
    private enterLevel(level: number): void {
        console.log(`[GameUI] 进入关卡 ${level}`);

        // 隐藏关卡解锁UI
        if (this.levelUnlockUI && this.levelUnlockUI.node) {
            this.levelUnlockUI.node.active = false;
        }

        // 显示拼图游戏UI
        if (this.puzzleGameUI) {
            this.puzzleGameUI.active = true;
        }

        // 开始指定关卡的拼图
        if (this.puzzleManager) {
            this.puzzleManager.startLevel(level);
            this.updateHardTipVisibility();
        } else {
            console.error('[GameUI] PuzzleManager 未设置');
        }
    }

    /**
     * 开始拼图游戏（从开始游戏按钮调用）
     * 进入当前章节的最新关卡
     */
    private startPuzzleGameFromButton(): void {
        console.log('[GameUI] 从开始游戏按钮进入最新关卡');

        // 隐藏关卡解锁UI
        if (this.levelUnlockUI && this.levelUnlockUI.node) {
            this.levelUnlockUI.node.active = false;
        }

        // 显示拼图游戏UI
        if (this.puzzleGameUI) {
            this.puzzleGameUI.active = true;
        }

        // 计算当前章节的最新关卡
        if (this.levelUnlockUI && this.puzzleManager) {
            // 获取当前章节信息
            const chapter = this.levelUnlockUI.getChapter();
            const startLevel = this.currentStartLevel;
            const endLevel = this.currentEndLevel;
            // 从本地存储读取解锁状态
            const storageKey = `puzzle_unlock_states_chapter_${chapter}`;
            const saved = sys.localStorage.getItem(storageKey);
            let unlockStates: boolean[] = [];

            if (saved) {
                try {
                    unlockStates = JSON.parse(saved);
                } catch (e) {
                    console.error('[GameUI] 读取解锁状态失败:', e);
                }
            }
            // 找到已解锁的最高关卡
            let targetLevel = startLevel;  // 默认第一关
            const totalLevels = endLevel - startLevel + 1;
            for (let i = totalLevels - 1; i >= 0; i--) {
                if (unlockStates[i]) {
                    targetLevel = startLevel + i;
                    break;
                }
            }
            // 如果找到了已解锁的关卡，进入下一关（如果下一关存在）
            const nextLevel = targetLevel + 1;
            if (nextLevel <= endLevel) {
                targetLevel = nextLevel;
            }
            console.log(`[GameUI] 进入最新关卡: ${targetLevel}`);
            // 开始指定关卡的拼图
            this.puzzleManager.startLevel(targetLevel);
            // 延迟检查困难模式（等待关卡加载完成）
            this.scheduleOnce(() => {
                this.updateHardTipVisibility();
            }, 0.5);
        } else {
            console.error('[GameUI] LevelUnlockUI 或 PuzzleManager 未设置');
        }
    }

    /**
     * 初始化退出按钮
     */
    private initExitButton() {
        if (this.exitGameBtn) {
            this.exitGameBtn.on(Node.EventType.TOUCH_END, this.onExitGameBtnClick, this);
        } else {
            console.warn('[GameUI] 未设置退出游戏按钮');
        }
    }

    /**
     * 恢复设置按钮状态
     */
    private restoreSettingButton(): void {
        if (this.settingBtn) {
            const button = this.settingBtn.getComponent(Button);
            if (button) {
                button.interactable = true;
            }
        }
    }

    /**
     * 初始化拼图游戏
     */
    private initPuzzle() {
        if (!this.puzzleManager) {
            console.error('PuzzleManager 未设置！');
            return;
        }
        let spriteFrame: SpriteFrame = null;
        if (this.puzzleImage) {
            spriteFrame = this.puzzleImage;
        }
        if (spriteFrame) {
            this.puzzleManager.onPuzzleComplete = (level: number) => {
                this.onPuzzleComplete(level);
            };
        } else {
            console.error('无法获取拼图图片！请设置 puzzleImage');
        }
    }
    public openSetting(): void {
        if (this.settingUI) {
            // 播放点击音效
            if (this.audioManager) {
                this.audioManager.playClickSound();
            }

            // 检查是否在游戏中（puzzleGameUI 是否激活）
            const isInGame = this.puzzleGameUI && this.puzzleGameUI.active;

            // 显示设置界面，传递是否在游戏中的状态
            this.settingUI.show(0.3, isInGame);

            // 禁用设置按钮，防止重复打开
            if (this.settingBtn) {
                const button = this.settingBtn.getComponent(Button);
                if (button) {
                    button.interactable = false;
                }
            }
        } else {
            console.error('[GameUI] 设置界面未设置');
        }
    }

    public closeSetting(): void {
        if (this.settingUI) {
            this.settingUI.hide();
        }
    }
    public toggleSetting(): void {
        if (this.settingUI) {
            this.settingUI.toggle();
        }
    }

    /**
     * 开始拼图游戏
     */
    public startPuzzleGame(): void {
        console.log('[GameUI] 开始拼图游戏');

        // 隐藏关卡解锁UI
        if (this.levelUnlockUI && this.levelUnlockUI.node) {
            this.levelUnlockUI.node.active = false;
        }

        // 显示拼图游戏UI
        if (this.puzzleGameUI) {
            this.puzzleGameUI.active = true;
        }

        // 开始第一关拼图
        if (this.puzzleManager && this.puzzleImage) {
            // 这里可以加载第一关的图片
            // 或者让 PuzzleManager 自己从配置加载
            console.log('[GameUI] 准备开始拼图游戏');
        }
    }

    /**
     * 退出游戏按钮点击事件
     */
    private onExitGameBtnClick(): void {
        AudioManager.getInstance().playClickSound();
        Utils.setScale(this.exitGameBtn, 0.95, 0.1, () => {
            this.backToLevelUnlock();
        });
    }

    /**
     * 返回关卡解锁界面
     */
    public backToLevelUnlock(): void {
        console.log('[GameUI] 返回关卡解锁界面');
        this.testBtn.active = true;
        if (this.puzzleGameUI) {
            this.puzzleGameUI.active = false;
        }
        if (this.hardTip) {
            this.hardTip.active = false;
        }
        if (this.levelUnlockUI && this.levelUnlockUI.node) {
            this.levelUnlockUI.node.active = true;
            // 更新关卡标签显示（确保显示最新状态）
            this.scheduleOnce(() => {
                if (this.levelUnlockUI) {
                    this.levelUnlockUI.updateLevelLabel();
                }
            }, 0.1);
        }
    }

    /**
     * 拼图完成回调
     */
    private onPuzzleComplete(level: number) {
        console.log(`恭喜！完成第 ${level} 关拼图！`);

        // 记录刚刚通关的关卡
        this.justCompletedLevel = level;

        // 解锁对应关卡（不播放动画，动画将在返回章节后播放）
        if (this.levelUnlockUI) {
            this.levelUnlockUI.unlockLevel(level, false);  // 不播放动画，只保存状态

            // 检查章节是否全部完成
            if (this.levelUnlockUI.isChapterCompleted()) {
                const currentChapter = this.levelUnlockUI.getChapter();
                console.log(`[GameUI] 章节 ${currentChapter} 全部完成！`);

                // 更新章节完成状态
                if (this.chapterUI) {
                    this.chapterUI.updateChapterCompleted(currentChapter);
                }

                // 解锁下一章节
                if (this.chapterUI && currentChapter < 2) {
                    const nextChapter = currentChapter + 1;
                    this.chapterUI.unlockChapter(nextChapter);
                    console.log(`[GameUI] 章节 ${nextChapter} 已解锁！`);
                }
            }
        }

        // 显示成功弹窗（显示完成的拼图图片）
        if (this.puzzleSuccessUI && this.puzzleManager) {
            const completedImage = this.puzzleManager.getCurrentLevelImage();
            if (completedImage) {
                this.puzzleGameUI.active = false;
                this.puzzleSuccessUI.show(completedImage);
            } else {
                console.warn('[GameUI] 无法获取完成的拼图图片');
                // 即使没有图片也显示弹窗
                this.puzzleSuccessUI.show(null);
            }
        } else {
            console.warn('[GameUI] PuzzleSuccessUI 或 PuzzleManager 未设置');
        }
    }

    onInitButtonClick() {
        console.log('onInitButtonClick');
        AdManager.InitSdk(
            (attributed: boolean, info: string) => {
                console.log('User Attribute:', attributed, info);
            },
            (initialized: boolean) => {
                console.log('Ad Init:', initialized);
            }
        );
    }

    onShowRewardButtonClick() {
        console.log('onShowRewardButtonClick');
        AdManager.ShowAd(AdType.AD_TYPE_Reward, 'reward_placement', (adtype, adevent, error) => {
            console.log('Ad Event:', adtype, adevent, error);
        });
    }

    update(deltaTime: number) {

    }

    protected onDestroy() {
        // 清理事件监听
        if (this.exitGameBtn) {
            this.exitGameBtn.off(Node.EventType.TOUCH_END, this.onExitGameBtnClick, this);
        }
        if (this.initButton) {
            this.initButton.off(Node.EventType.TOUCH_END, this.onInitButtonClick, this);
        }

        if (this.testBtn) {
            this.testBtn.off(Node.EventType.TOUCH_END, this.onTestButtonClick, this);
        }

        if (this.levelInputConfirmBtn) {
            this.levelInputConfirmBtn.node.off(Node.EventType.TOUCH_END, this.onLevelInputConfirm, this);
        }

        if (this.levelInputCancelBtn) {
            this.levelInputCancelBtn.node.off(Node.EventType.TOUCH_END, this.onLevelInputCancel, this);
        }
    }
}

