// @spec-source → 新手開場規格書.md §4 分鏡 6（名將逐一登場）、§5.2 登場台詞、§6 名將清單；WBS OPEN-06（PROG-2-1365）；PROG-2-10064（稽核 B1：六名將一頁橫排）
/**
 * InitialShowcaseController — 六位初始名將一頁亮相（純邏輯，不依賴 cc）。
 *
 * 原本六位一人一頁、要按 6 次「下一位」；現在六位橫排同一頁，名字、稱號、台詞同時看得到，
 * 按一次「前往宿命轉蛋」（next()）就結束亮相，由呼叫端送出 showcase-done。
 * 輸出扁平 FlowView，key 與 initial-showcase-main.json 的節點 id 一一對應（每位名將一組，後綴為順序 0～5）。
 *
 * 幕位置：開場信之後、宿命轉蛋之前（PROG-2-2222 使用者裁決），六名將說完台詞引導玩家進轉蛋。
 *
 * Unity 對照：Presenter。畫面只讀 getFlowView()，按鈕只呼叫 next()。
 */
import { INITIAL_SHOWCASE_ENTRIES, SHOWCASE_LINE_STYLE_DEFAULT, showcaseLineOf, type InitialShowcaseEntry, type ShowcaseLineStyle } from '../../core/systems/InitialGeneralShowcase';

/** 按鈕預設字（語系字串沒傳時用）：帶玩家進宿命轉蛋 */
export const SHOWCASE_LAST_BUTTON = '前往宿命轉蛋';
/** 標題預設字（語系字串沒傳時用） */
export const SHOWCASE_HEADING_DEFAULT = '六位宿命名將，已經在門口排隊等你點頭';

export interface InitialShowcaseFlowView {
    texts: Record<string, string>;
    actives: Record<string, boolean>;
    enabled: Record<string, boolean>;
}

export interface InitialShowcaseOptions {
    lineStyle?: ShowcaseLineStyle;
    /** 頁首標題（已查好語系）。 */
    heading?: string;
    /** 按鈕字（已查好語系）。 */
    buttonLabel?: string;
    /**
     * 六輪廓逐一點亮的間隔（毫秒，方案 B，PROG-2-10149）；沒給就一開始全部點亮（舊行為）。
     * 點亮只影響名字、稱號、台詞與立繪明暗，按鈕一直可按，不增加點擊。
     */
    lightStepMs?: number;
}

export class InitialShowcaseController {
    private _finished = false;
    private readonly _lineStyle: ShowcaseLineStyle;
    private readonly _heading: string;
    private readonly _buttonLabel: string;
    private readonly _lightStepMs: number;
    private _elapsedMs = 0;
    private readonly _tapped = new Set<number>();

    constructor(
        private readonly _entries: readonly InitialShowcaseEntry[] = INITIAL_SHOWCASE_ENTRIES,
        options: InitialShowcaseOptions = {},
    ) {
        this._lineStyle = options.lineStyle ?? SHOWCASE_LINE_STYLE_DEFAULT;
        this._heading = options.heading || SHOWCASE_HEADING_DEFAULT;
        this._buttonLabel = options.buttonLabel || SHOWCASE_LAST_BUTTON;
        this._lightStepMs = options.lightStepMs !== undefined && options.lightStepMs > 0 ? options.lightStepMs : 0;
    }

    /** 自動點亮的推進（毫秒）；沒設 lightStepMs 時無作用。 */
    public tick(deltaMs: number): void {
        if (this._lightStepMs > 0 && Number.isFinite(deltaMs) && deltaMs > 0) this._elapsedMs += deltaMs;
    }

    /** 第 index 位是否已點亮：自動點亮輪到了，或玩家點過。 */
    public isLit(index: number): boolean {
        if (this._lightStepMs <= 0) return true;
        return this._tapped.has(index) || this._elapsedMs >= index * this._lightStepMs;
    }

    /** 已點亮的人數。 */
    public get litCount(): number {
        return this._entries.reduce((count, _entry, i) => count + (this.isLit(i) ? 1 : 0), 0);
    }

    /** 玩家點某位的輪廓：立刻點亮；已亮或越界回傳 false。 */
    public lightNow(index: number): boolean {
        if (index < 0 || index >= this._entries.length || this.isLit(index)) return false;
        this._tapped.add(index);
        return true;
    }

    public get finished(): boolean { return this._finished; }
    /** 這一頁顯示的名將（依序橫排）；亮相結束後為空。 */
    public get entries(): readonly InitialShowcaseEntry[] { return this._finished ? [] : this._entries; }

    /** 結束亮相；第一次呼叫回傳 true，已結束後再呼叫回傳 false。 */
    public next(): boolean {
        if (this._finished) return false;
        this._finished = true;
        return true;
    }

    public getFlowView(): InitialShowcaseFlowView {
        const texts: Record<string, string> = {
            showcaseHeading: this._finished ? '' : this._heading,
            btnShowcaseNextLabel: this._finished ? '' : this._buttonLabel,
        };
        this._entries.forEach((entry, index) => {
            const shown = !this._finished && this.isLit(index);
            texts[`showcaseName${index}`] = shown ? entry.name : '';
            texts[`showcaseTitle${index}`] = shown ? entry.title : '';
            texts[`showcaseLine${index}`] = shown ? `「${showcaseLineOf(entry, this._lineStyle)}」` : '';
        });
        return {
            texts,
            actives: { showcaseCard: !this._finished },
            enabled: { btnShowcaseNext: !this._finished },
        };
    }
}
