// @spec-source → 新手開場規格書.md §4 第一幕（分鏡 1–4）；PROG-2-0646；漩渦自動播放接 OpeningAct1Cues（PROG-2-1362）
/**
 * OpeningIntroController — 第一幕「情懷定錨」的逐頁流程（純邏輯，不依賴 cc）。
 *
 * 職責：記住目前第幾頁，按鈕呼叫 next() 翻頁；翻完最後一頁回傳 true，由呼叫端送出 intro-done。
 * 輸出扁平 FlowView，key 與 opening-intro-main.json 的節點 id 一一對應。
 *
 * 漩渦分鏡（PROG-2-1362）：ACT1_CUES 標為「不點擊、演完自動進下一幕」的漩渦分鏡，
 * 由 tick() 依 VortexTransition 的總時長自動翻頁；播放中按鈕停用。
 * 暫定：只有 vortex 接自動播放；古文與像素回憶仍維持按鈕翻頁，等演出接上再開。
 * 畫面層每幀讀 vortexState 決定漩渦階段的視覺，座標與貼圖交 Codex 實機調整。
 *
 * Unity 對照：Presenter。畫面只讀 getFlowView()，按鈕只呼叫 next()；
 * 自動播放像一條 Timeline，播放頭每幀由畫面呼叫 tick() 推進，播完才觸發翻頁。
 */
import { INTRO_PANELS, type IntroPanel } from '../../core/systems/NewPlayerOpening';
import { ACT1_CUES, type Act1Cue } from './OpeningAct1Cues';
import { vortexPhaseAt, vortexTransitionTotalMs, type VortexPhaseState } from '../../core/systems/VortexTransition';

export interface OpeningIntroFlowView {
    texts: Record<string, string>;
    actives: Record<string, boolean>;
    enabled: Record<string, boolean>;
}

/** 目前有接上自動播放的演出類型；其餘分鏡維持點擊翻頁。 */
const AUTO_PLAY_PRESENTATIONS: readonly string[] = ['vortex'];

/** 自動播放的時間步長（秒）；畫面每步呼叫一次 tick()。 */
export const INTRO_TICK_SEC = 0.05;

export class OpeningIntroController {
    private _index = 0;
    private _elapsedMs = 0;

    constructor(
        private readonly _panels: readonly IntroPanel[] = INTRO_PANELS,
        private readonly _cues: readonly Act1Cue[] = ACT1_CUES,
    ) {}

    public get index(): number { return this._index; }
    public get finished(): boolean { return this._index >= this._panels.length; }

    /** 目前分鏡的演出提示；第一幕結束後為 undefined。 */
    public get currentCue(): Act1Cue | undefined {
        if (this.finished) return undefined;
        const panelId = this._panels[this._index].id;
        return this._cues.find((cue) => cue.panelId === panelId);
    }

    /** 目前分鏡是否正在自動播放（不需點擊、且演出已接上）。 */
    public get autoPlaying(): boolean {
        const cue = this.currentCue;
        return !!cue && !cue.requiresClick && AUTO_PLAY_PRESENTATIONS.includes(cue.presentation);
    }

    /** 漩渦階段（給畫面層每幀讀）；非漩渦分鏡或已播完時為 null。 */
    public get vortexState(): VortexPhaseState | null {
        if (!this.autoPlaying || this.currentCue?.presentation !== 'vortex') return null;
        return vortexPhaseAt(this._elapsedMs);
    }

    /** 翻到下一頁；翻完最後一頁時回傳 true（第一幕結束）。已結束後再呼叫回傳 false。 */
    public next(): boolean {
        if (this.finished) return false;
        this._index += 1;
        this._elapsedMs = 0;
        return this.finished;
    }

    /**
     * 自動播放推進：非自動播放分鏡回傳 false、不動作。
     * 播完當頁時自動翻頁，回傳與 next() 相同的結束旗標。
     */
    public tick(deltaMs: number): boolean {
        if (!this.autoPlaying || !Number.isFinite(deltaMs) || deltaMs <= 0) return false;
        this._elapsedMs += deltaMs;
        if (this._elapsedMs < vortexTransitionTotalMs()) return false;
        return this.next();
    }

    public getFlowView(): OpeningIntroFlowView {
        const panel = this._panels[Math.min(this._index, this._panels.length - 1)];
        const done = this.finished;
        const playing = this.autoPlaying;
        return {
            texts: {
                introText: done ? '' : panel.text,
                introStep: done ? '' : `${this._index + 1} / ${this._panels.length}`,
                btnIntroNextLabel: done ? '' : panel.button,
            },
            actives: { introCard: !done },
            enabled: { btnIntroNext: !done && !playing },
        };
    }
}
