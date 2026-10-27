// @spec-source → 新手開場規格書.md §4 分鏡 6（名將逐一登場）、§5.2 登場台詞、§6 名將清單；WBS OPEN-06（PROG-2-1365）
/**
 * InitialShowcaseController — 六位初始名將逐一登場的翻頁流程（純邏輯，不依賴 cc）。
 *
 * 職責：依 INITIAL_SHOWCASE_ENTRIES 順序逐位顯示名將、稱號、台詞與因子標籤；
 * 翻完最後一位回傳 true，由呼叫端送出 showcase-done。
 * 輸出扁平 FlowView，key 與 initial-showcase-main.json 的節點 id 一一對應。
 *
 * 暫定：幕位置放在宿命鎖定之後、第三幕之前（規格只寫第二幕分鏡 6，未寫先後）。
 *
 * Unity 對照：Presenter。畫面只讀 getFlowView()，按鈕只呼叫 next()，像一份 Showcase 清單逐筆播放。
 */
import { INITIAL_SHOWCASE_ENTRIES, type InitialShowcaseEntry } from '../../core/systems/InitialGeneralShowcase';

export interface InitialShowcaseFlowView {
    texts: Record<string, string>;
    actives: Record<string, boolean>;
    enabled: Record<string, boolean>;
}

export class InitialShowcaseController {
    private _index = 0;

    constructor(private readonly _entries: readonly InitialShowcaseEntry[] = INITIAL_SHOWCASE_ENTRIES) {}

    public get index(): number { return this._index; }
    public get finished(): boolean { return this._index >= this._entries.length; }

    /** 目前這一位名將；全部看完後為 null。 */
    public get current(): InitialShowcaseEntry | null {
        return this.finished ? null : this._entries[this._index];
    }

    /** 翻到下一位；翻完最後一位時回傳 true（登場結束）。已結束後再呼叫回傳 false。 */
    public next(): boolean {
        if (this.finished) return false;
        this._index += 1;
        return this.finished;
    }

    public getFlowView(): InitialShowcaseFlowView {
        const entry = this.current;
        const isLast = this._index >= this._entries.length - 1;
        return {
            texts: {
                showcaseName: entry?.name ?? '',
                showcaseTitle: entry?.title ?? '',
                showcaseLine: entry ? `「${entry.line}」` : '',
                showcaseFactors: entry ? entry.factorTags.join('・') : '',
                showcaseStep: entry ? `${this._index + 1} / ${this._entries.length}` : '',
                btnShowcaseNextLabel: isLast ? '開始冒險' : '下一位',
            },
            actives: { showcaseCard: !this.finished },
            enabled: { btnShowcaseNext: !this.finished },
        };
    }
}
