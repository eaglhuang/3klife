// @spec-source → 新手開場規格書.md §4 第一幕（分鏡 1–4）；PROG-2-0646
/**
 * OpeningIntroController — 第一幕「情懷定錨」的逐頁流程（純邏輯，不依賴 cc）。
 *
 * 職責：記住目前第幾頁，按鈕呼叫 next() 翻頁；翻完最後一頁回傳 true，由呼叫端送出 intro-done。
 * 輸出扁平 FlowView，key 與 opening-intro-main.json 的節點 id 一一對應。
 *
 * Unity 對照：Presenter。畫面只讀 getFlowView()，按鈕只呼叫 next()。
 */
import { INTRO_PANELS, type IntroPanel } from '../../core/systems/NewPlayerOpening';

export interface OpeningIntroFlowView {
    texts: Record<string, string>;
    actives: Record<string, boolean>;
    enabled: Record<string, boolean>;
}

export class OpeningIntroController {
    private _index = 0;

    constructor(private readonly _panels: readonly IntroPanel[] = INTRO_PANELS) {}

    public get index(): number { return this._index; }
    public get finished(): boolean { return this._index >= this._panels.length; }

    /** 翻到下一頁；翻完最後一頁時回傳 true（第一幕結束）。已結束後再呼叫回傳 false。 */
    public next(): boolean {
        if (this.finished) return false;
        this._index += 1;
        return this.finished;
    }

    public getFlowView(): OpeningIntroFlowView {
        const panel = this._panels[Math.min(this._index, this._panels.length - 1)];
        const done = this.finished;
        return {
            texts: {
                introText: done ? '' : panel.text,
                introStep: done ? '' : `${this._index + 1} / ${this._panels.length}`,
                btnIntroNextLabel: done ? '' : panel.button,
            },
            actives: { introCard: !done },
            enabled: { btnIntroNext: !done },
        };
    }
}
