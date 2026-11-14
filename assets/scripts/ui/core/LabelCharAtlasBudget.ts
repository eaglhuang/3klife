// Cocos 3.8 只有逐字快取（CHAR）會套用字距，但 CHAR 全場共用一張 1024×1024 字元圖集，
// 滿了以後新字直接畫不出來（warnID 12100）。這裡估算圖集用量：超出預算的文字改走 TTF，只少字距、不會缺字。

const ATLAS_AREA = 1024 * 1024;
/** 套樣式與執行期換字都從這裡預約；引擎按列擺放字元、列高取最高字，實測列內空隙可達用量兩倍以上 */
const BUDGET_RATIO = 0.25;
/** 大字一格就佔一大塊、還把整列撐高；超過這個字級（含螢幕縮放）改走 TTF，字距由原稿空白呈現 */
const MAX_CHAR_FONT_SIZE = 40;
/** 過長多半是內文或資料綁定，字元不可預期，不走 CHAR */
const MAX_TEXT_LENGTH = 12;
const GLYPH_CELL_RATIO = 1.25;
const GLYPH_CELL_PADDING = 4;
/** 字距低於字級的這個比例時肉眼看不出差異，不值得佔圖集（換膚每換一色就要另存一份字元） */
const MIN_VISIBLE_SPACING_EM = 0.05;

/** 字距是否大到值得改走 CHAR（只有 CHAR 會套用字距） */
export function isLetterSpacingVisible(letterSpacing: number, fontSize: number): boolean {
    return letterSpacing > 0 && letterSpacing >= fontSize * MIN_VISIBLE_SPACING_EM;
}

export class LabelCharAtlasBudget {
    private readonly _glyphs = new Set<string>();
    private _usedArea = 0;

    /** 文字可用 CHAR 時預約其字元並回傳 true；styleKey 為字型＋顏色等會讓引擎另存一份字元的樣式。 */
    public reserve(text: string, fontSize: number, styleKey: string, outlineWidth = 0): boolean {
        const chars = [...text];
        if (chars.length === 0 || chars.length > MAX_TEXT_LENGTH || fontSize > MAX_CHAR_FONT_SIZE) {
            return false;
        }

        // 描邊會把每格字元往四周撐大
        const cell = Math.ceil(fontSize * GLYPH_CELL_RATIO) + GLYPH_CELL_PADDING + Math.max(0, outlineWidth) * 2;
        const fresh = Array.from(new Set(chars))
            .map((char) => `${char}|${fontSize}|${styleKey}`)
            .filter((key) => !this._glyphs.has(key));
        const nextArea = this._usedArea + fresh.length * cell * cell;
        if (nextArea > ATLAS_AREA * BUDGET_RATIO) {
            return false;
        }

        fresh.forEach((key) => this._glyphs.add(key));
        this._usedArea = nextArea;
        return true;
    }

    /** 引擎實際擺不下（估算比真實擺放樂觀）時呼叫：之後一律拒絕，直到換場景清空圖集。 */
    public exhaust(): void {
        this._usedArea = Number.POSITIVE_INFINITY;
    }

    /** 引擎在場景切換時清空圖集，預算跟著歸零。 */
    public reset(): void {
        this._glyphs.clear();
        this._usedArea = 0;
    }
}
