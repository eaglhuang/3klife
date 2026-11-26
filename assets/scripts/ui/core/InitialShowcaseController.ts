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
}

export class InitialShowcaseController {
    private _finished = false;
    private readonly _lineStyle: ShowcaseLineStyle;
    private readonly _heading: string;
    private readonly _buttonLabel: string;

    constructor(
        private readonly _entries: readonly InitialShowcaseEntry[] = INITIAL_SHOWCASE_ENTRIES,
        options: InitialShowcaseOptions = {},
    ) {
        this._lineStyle = options.lineStyle ?? SHOWCASE_LINE_STYLE_DEFAULT;
        this._heading = options.heading || SHOWCASE_HEADING_DEFAULT;
        this._buttonLabel = options.buttonLabel || SHOWCASE_LAST_BUTTON;
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
            texts[`showcaseName${index}`] = this._finished ? '' : entry.name;
            texts[`showcaseTitle${index}`] = this._finished ? '' : entry.title;
            texts[`showcaseLine${index}`] = this._finished ? '' : `「${showcaseLineOf(entry, this._lineStyle)}」`;
        });
        return {
            texts,
            actives: { showcaseCard: !this._finished },
            enabled: { btnShowcaseNext: !this._finished },
        };
    }
}
