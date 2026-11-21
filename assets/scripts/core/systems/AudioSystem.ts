import { UCUFLogger, LogCategory } from '../utils/UCUFLogger';
// @spec-source → 見 docs/cross-reference-index.md
import { AudioClip, AudioSource, Node, director, tween } from "cc";
import { AUDIO_PREFS_KEY, parseAudioPrefs, type AudioPrefs } from "./BattleSettingsView";

/**
 * 音效系統
 *
 * 負責 BGM、單次音效、循環音效的統一管理。
 * 核心特性：50ms 防重複播放，避免同一音效在連擊時爆音。
 *
 * Unity 對照：
 *   - bgmSource   ≈ AudioSource 上的 PlayLoop
 *   - sfxSource   ≈ AudioSource.PlayOneShot（非循環）
 *   - loopSource  ≈ 另一個 AudioSource 用於持續循環的環境音效
 *
 * 使用方式：
 *   1. ServiceLoader.initialize(hostNode) 時自動呼叫 setup()
 *   2. 先 registerClip(name, clip) 快取 AudioClip
 *   3. 之後 playSfx(name) 即可播放
 */
/** 音效節流閘門：回傳 false 表示這次不播（PROG-2-9441）。 */
export type SfxGate = (clip: string) => boolean;

export class AudioSystem {
    private bgmSource: AudioSource | null = null;
    /** 第二 BGM 軌，專用於 crossfade 漸進 */
    private bgmSourceB: AudioSource | null = null;
    /** 目前活躍 BGM 軌（'A' = bgmSource，'B' = bgmSourceB） */
    private activeBgm: 'A' | 'B' = 'A';
    /** 追蹤 BGM 目標音量，crossfade 漸进終點用 */
    private bgmVolume: number = 0.5;
    private sfxSource: AudioSource | null = null;
    /** 掛音源的節點（正常為常駐節點 AudioHost）；失效時要重新 setup */
    private host: Node | null = null;
    private loopSource: AudioSource | null = null;
    /** 玩家在設定面板關掉的音樂／音效（存 localStorage，PROG-2-1890） */
    private prefs: AudioPrefs = parseAudioPrefs(null);

    /** 防重複播放時間戳記（key=音效名稱, value=上次播放 ms） */
    private lastPlayTime = new Map<string, number>();

    /** AudioClip 快取（name → clip），由外部 registerClip 或 loadClips 填入 */
    private clipCache = new Map<string, AudioClip>();

    /** 防重複播放的最小間隔（ms） */
    private static readonly DEBOUNCE_MS = 50;

    /**
     * 統一音效節流閘門（PROG-2-9441）。所有 SFX 都從 playSfx／playSfxWithCooldown 出去，
     * 由這一個閘門決定播不播；戰場裝上共用 SfxThrottle（同檔合併＋每秒上限），沒裝時用內建 50ms 防重複。
     * 閘門自帶時鐘，回傳 false 就不播。
     */
    private sfxGate: SfxGate | null = null;

    // ─────────────────────────────────────────
    //  初始化
    // ─────────────────────────────────────────

    /**
     * 由 ServiceLoader.initialize(hostNode) 呼叫。
     * AudioSource 必須掛載在活躍的 Node 上，不可用 new AudioSource()。
     *
     * Unity 對照：相當於在 GameManager 物件上掛 3 個 AudioSource 組件
     */
    public setup(hostNode: Node): void {
        // 音源掛在跨場景常駐的專用節點上：呼叫端的節點（登入頁、面板）會隨場景銷毀，
        // 直接掛上去的話換到戰場後音源就失效，整場沒有聲音。
        hostNode = this.host = this._persistentHost(hostNode);
        this.bgmSource = hostNode.addComponent(AudioSource);
        this.bgmSource.loop = true;
        this.bgmSource.volume = 0.5;

        // 第二 BGM 軌：技能毳電時 crossfade 用，很始靜音
        this.bgmSourceB = hostNode.addComponent(AudioSource);
        this.bgmSourceB.loop = true;
        this.bgmSourceB.volume = 0;

        this.sfxSource = hostNode.addComponent(AudioSource);
        this.sfxSource.volume = 1.0;

        this.loopSource = hostNode.addComponent(AudioSource);
        this.loopSource.loop = true;
        this.loopSource.volume = 0.8;

        this.prefs = parseAudioPrefs(this._readPrefs());
    }

    /** 音源是否還能用；尚未掛載或宿主已被銷毀時為 false，需要再 setup 一次。 */
    public isReady(): boolean {
        return !!this.sfxSource && !!this.host?.isValid;
    }

    private _persistentHost(fallback: Node): Node {
        const scene = director?.getScene?.();
        if (!scene) return fallback;
        const host = new Node('AudioHost');
        scene.addChild(host);
        director.addPersistRootNode(host);
        return host;
    }

    // ─────────────────────────────────────────
    //  玩家音訊偏好（設定面板開關）
    // ─────────────────────────────────────────

    public isBgmMuted(): boolean { return this.prefs.bgmMuted; }
    public isSfxMuted(): boolean { return this.prefs.sfxMuted; }

    public setBgmMuted(muted: boolean): void {
        this.prefs.bgmMuted = muted;
        const src = this.activeBgm === 'A' ? this.bgmSource : this.bgmSourceB;
        if (src) src.volume = this._bgmTargetVolume();
        this._writePrefs();
    }

    public setSfxMuted(muted: boolean): void {
        this.prefs.sfxMuted = muted;
        if (muted) this.loopSource?.stop();
        this._writePrefs();
    }

    private _bgmTargetVolume(): number {
        return this.prefs.bgmMuted ? 0 : this.bgmVolume;
    }

    private _readPrefs(): string | null {
        try {
            return (globalThis as any)?.localStorage?.getItem(AUDIO_PREFS_KEY) ?? null;
        } catch {
            return null;
        }
    }

    private _writePrefs(): void {
        try {
            (globalThis as any)?.localStorage?.setItem(AUDIO_PREFS_KEY, JSON.stringify(this.prefs));
        } catch {
            // 私密模式或無 localStorage：只在本次執行有效
        }
    }

    // ─────────────────────────────────────────
    //  音效快取管理
    // ─────────────────────────────────────────

    /** 手動快取單個 AudioClip（由 BattleScene 在加載資源後呼叫） */
    public registerClip(name: string, clip: AudioClip): void {
        this.clipCache.set(name, clip);
    }

    /** 批次快取多個 AudioClip（key = 檔名不含副檔名） */
    public registerClips(clips: Record<string, AudioClip>): void {
        // ES2015 不支援 Object.entries，改用 Object.keys
        Object.keys(clips).forEach(name => {
            this.clipCache.set(name, clips[name]);
        });
    }

    public hasClip(name: string): boolean {
        return this.clipCache.has(name);
    }

    // ─────────────────────────────────────────
    //  BGM
    // ─────────────────────────────────────────

    public playBgm(clipOrName: AudioClip | string, volume = 0.5): void {
        if (!this.bgmSource) return;
        const clip = typeof clipOrName === "string"
            ? this.clipCache.get(clipOrName) ?? null
            : clipOrName;
        if (!clip) {
            UCUFLogger.warn(LogCategory.DATA, `[AudioSystem] BGM clip 不存在: ${clipOrName}`);
            return;
        }
        this.bgmVolume = volume;
        // 總是使用 bgmSource（A 軌）直接播放，無漸變
        this.bgmSourceB?.stop();
        this.activeBgm = 'A';
        this.bgmSource.clip = clip;
        this.bgmSource.volume = this._bgmTargetVolume();
        this.bgmSource.play();
    }

    public stopBgm(): void {
        this.bgmSource?.stop();
        this.bgmSourceB?.stop();
    }
    public pauseBgm(): void {
        const src = this.activeBgm === 'A' ? this.bgmSource : this.bgmSourceB;
        src?.pause();
    }
    public resumeBgm(): void {
        const src = this.activeBgm === 'A' ? this.bgmSource : this.bgmSourceB;
        src?.play();
    }
    public setBgmVolume(v: number): void {
        this.bgmVolume = v;
        const src = this.activeBgm === 'A' ? this.bgmSource : this.bgmSourceB;
        if (src) src.volume = this._bgmTargetVolume();
    }

    /**
     * 漸變切換 BGM：新 BGM 漸入的同時舊 BGM 漸出，無硬切斷感。
     *
     * Unity 對照：用兩個 AudioSource + Mathf.Lerp(volume) 實現 Cross-Fade。
     *   from 軌：to(duration, { volume: 0 })
     *   to   軌：to(duration, { volume: bgmVolume })
     *
     * @param clipOrName  目標 AudioClip 或已注冊的名稱
     * @param duration    漸變時長（秒，預設 1.5）
     */
    public crossfadeTo(clipOrName: AudioClip | string, duration: number = 1.5): void {
        if (!this.bgmSource || !this.bgmSourceB) return;

        const clip = typeof clipOrName === 'string'
            ? this.clipCache.get(clipOrName) ?? null
            : clipOrName;
        if (!clip) {
            UCUFLogger.warn(LogCategory.DATA, `[AudioSystem] crossfadeTo clip 不存在: ${clipOrName}`);
            return;
        }

        const from = this.activeBgm === 'A' ? this.bgmSource : this.bgmSourceB;
        const to   = this.activeBgm === 'A' ? this.bgmSourceB : this.bgmSource;

        // 開始漸變：to 軌從靖音漸入新曲目
to.clip = clip;
        to.volume = 0;
        to.play();

        tween(from).to(duration, { volume: 0 }).call(() => from.stop()).start();
        tween(to).to(duration, { volume: this._bgmTargetVolume() }).start();

        this.activeBgm = this.activeBgm === 'A' ? 'B' : 'A';
    }

    // ─────────────────────────────────────────
    //  單次音效（SFX）
    // ─────────────────────────────────────────

    /**
     * 播放單次音效，50ms 內同名音效不重複觸發。
     *
     * Unity 對照：AudioSource.PlayOneShot(clip, volume)
     *
     * @param name   AudioClip 快取名稱（無副檔名）
     * @param volume 音量 0~1，預設 1.0
     */
    public playSfx(name: string, volume = 1.0): void {
        if (!this.sfxSource || this.prefs.sfxMuted) return;
        if (!this._passSfxGate(name)) return;

        const clip = this.clipCache.get(name);
        if (!clip) {
            if (this._isPreviewMode()) {
                UCUFLogger.info(LogCategory.DATA, `[AudioSystem] preview mode SFX clip 缺失，略過: ${name}`);
            } else {
                UCUFLogger.warn(LogCategory.DATA, `[AudioSystem] SFX clip 不存在: ${name}`);
            }
            return;
        }
        this.sfxSource.playOneShot(clip, volume);
    }

    /** 裝上（或傳 null 拆掉）統一節流閘門；同一時間只會有一個閘門。 */
    public setSfxGate(gate: SfxGate | null): void { this.sfxGate = gate; }

    public getSfxGate(): SfxGate | null { return this.sfxGate; }

    /** 閘門判斷：有裝閘門就交給它，否則同名音效 50ms 內不重複（連擊音爆保護）。 */
    private _passSfxGate(name: string): boolean {
        if (this.sfxGate) return this.sfxGate(name);
        const now = Date.now();
        const last = this.lastPlayTime.get(name) ?? 0;
        if (now - last < AudioSystem.DEBOUNCE_MS) return false;
        this.lastPlayTime.set(name, now);
        return true;
    }

    /**
     * 播放單次音效（較長防重複間隔版本，適合技能音效）
     * @param cooldownMs 防重複的冷卻時間（ms），預設 300ms
     */
    public playSfxWithCooldown(name: string, volume = 1.0, cooldownMs = 300): void {
        if (!this.sfxSource || this.prefs.sfxMuted) return;
        const now = Date.now();
        const last = this.lastPlayTime.get(name) ?? 0;
        if (now - last < cooldownMs) return;
        if (this.sfxGate && !this.sfxGate(name)) return;
        this.lastPlayTime.set(name, now);

        const clip = this.clipCache.get(name);
        if (!clip) {
            if (this._isPreviewMode()) {
                UCUFLogger.info(LogCategory.DATA, `[AudioSystem] preview mode SFX clip 缺失，略過: ${name}`);
            } else {
                UCUFLogger.warn(LogCategory.DATA, `[AudioSystem] SFX clip 不存在: ${name}`);
            }
            return;
        }
        this.sfxSource.playOneShot(clip, volume);
    }

    private _isPreviewMode(): boolean {
        try {
            const globalScope = globalThis as any;
            const search = globalScope?.window?.location?.search as string | undefined;
            const query = new URLSearchParams(search ?? '');
            const queryMode = query.get('previewMode') ?? query.get('PREVIEW_MODE');
            const storedMode = globalScope?.window?.localStorage?.getItem('PREVIEW_MODE') ?? '';
            return queryMode === 'true' || storedMode === 'true';
        } catch {
            return false;
        }
    }

    // ─────────────────────────────────────────
    //  循環音效（環境音、持續 Buff 音效）
    // ─────────────────────────────────────────

    public playLoopSfx(name: string, volume = 0.8): void {
        if (!this.loopSource || this.prefs.sfxMuted) return;
        const clip = this.clipCache.get(name);
        if (!clip) {
            UCUFLogger.warn(LogCategory.DATA, `[AudioSystem] Loop clip 不存在: ${name}`);
            return;
        }
        this.loopSource.clip = clip;
        this.loopSource.volume = volume;
        this.loopSource.play();
    }

    public stopLoopSfx(): void { this.loopSource?.stop(); }

    // ─────────────────────────────────────────
    //  清理
    // ─────────────────────────────────────────

    public clearCache(): void {
        this.clipCache.clear();
        this.lastPlayTime.clear();
    }
}
