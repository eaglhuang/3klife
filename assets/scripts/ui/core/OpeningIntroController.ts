// @spec-source → 新手開場規格書.md §4 第一幕（分鏡 1–4）；PROG-2-0646；PROG-2-10064（稽核 B1：4 頁合併成一頁自動長卷）
/**
 * OpeningIntroController — 第一幕「情懷定錨」的單頁長卷（純邏輯，不依賴 cc）。
 *
 * 原本四個分鏡各一頁、每頁都要按「繼續」（約 4 次點擊）；現在合併成一頁長卷：
 * 四段文字每隔 INTRO_PARAGRAPH_MS 自動多浮現一段（接在前一段下面），全部出現再停 INTRO_HOLD_MS 後自動進下一幕，
 * 玩家完全不必點擊；想略過時按右下「略過」（next()）一次跳到第一幕結束。
 * 四段原文取自 INTRO_PANELS（使用者原稿，不改寫）；語系字串由呼叫端用 texts 傳入，沒傳就用 INTRO_PANELS 的原文。
 *
 * 畫面層每 INTRO_TICK_SEC 呼叫 tick() 推進；回傳 true 表示第一幕結束，由呼叫端送出 intro-done。
 * 輸出扁平 FlowView，key 與 opening-intro-main.json 的節點 id 一一對應。
 *
 * Unity 對照：Presenter。像一條自動播放的 Timeline，播放頭由畫面呼叫 tick() 推進；按鈕只是「跳到結尾」。
 */
import { INTRO_PANELS, type IntroPanel } from '../../core/systems/NewPlayerOpening';

export interface OpeningIntroFlowView {
    texts: Record<string, string>;
    actives: Record<string, boolean>;
    enabled: Record<string, boolean>;
}

/** 自動播放的時間步長（秒）；畫面每步呼叫一次 tick()。 */
export const INTRO_TICK_SEC = 0.05;
/** 每段文字浮現的間隔（毫秒）。 */
export const INTRO_PARAGRAPH_MS = 1100;
/** 最後一段浮現後停留多久自動進下一幕（毫秒）。 */
export const INTRO_HOLD_MS = 1500;
/** 略過按鈕預設字（語系字串沒傳時用）。 */
export const INTRO_SKIP_LABEL_DEFAULT = '略過';

export interface OpeningIntroOptions {
    /** 各段文字（已查好語系）；段數需與 panels 相同，不符時改用 panels 原文。 */
    texts?: readonly string[];
    /** 右下略過按鈕的字。 */
    skipLabel?: string;
}

export class OpeningIntroController {
    private _elapsedMs = 0;
    private _skipped = false;
    private readonly _texts: readonly string[];
    private readonly _skipLabel: string;

    constructor(
        private readonly _panels: readonly IntroPanel[] = INTRO_PANELS,
        options: OpeningIntroOptions = {},
    ) {
        this._texts = options.texts && options.texts.length === _panels.length ? options.texts : _panels.map(panel => panel.text);
        this._skipLabel = options.skipLabel || INTRO_SKIP_LABEL_DEFAULT;
    }

    /** 整段長卷的時長（毫秒）：最後一段浮現的時間點＋停留。 */
    public get totalMs(): number { return (this._panels.length - 1) * INTRO_PARAGRAPH_MS + INTRO_HOLD_MS; }
    /** 目前已浮現的段數（至少 1，最多 panels.length）；結束後維持最大。 */
    public get revealedCount(): number {
        return Math.min(this._panels.length, 1 + Math.floor(this._elapsedMs / INTRO_PARAGRAPH_MS));
    }
    public get finished(): boolean { return this._skipped || this._elapsedMs >= this.totalMs; }
    /** 長卷自動播放中（尚未結束）；畫面層據此決定要不要排程 tick。 */
    public get autoPlaying(): boolean { return !this.finished; }

    /** 略過：直接結束第一幕；第一次呼叫回傳 true，已結束後再呼叫回傳 false。 */
    public next(): boolean {
        if (this.finished) return false;
        this._skipped = true;
        return true;
    }

    /** 自動播放推進；播到結尾的那一步回傳 true（第一幕結束），其餘回傳 false。 */
    public tick(deltaMs: number): boolean {
        if (this.finished || !Number.isFinite(deltaMs) || deltaMs <= 0) return false;
        this._elapsedMs += deltaMs;
        return this.finished;
    }

    public getFlowView(): OpeningIntroFlowView {
        const done = this.finished;
        return {
            texts: {
                introText: done ? '' : this._texts.slice(0, this.revealedCount).join('\n\n'),
                btnIntroNextLabel: done ? '' : this._skipLabel,
            },
            actives: { introCard: !done },
            enabled: { btnIntroNext: !done },
        };
    }
}
