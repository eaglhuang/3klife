// Cocos 3.8 只有逐字快取（CHAR）會套用字距，但 CHAR 全場共用一張 1024×1024 字元圖集，
// 滿了以後新字直接畫不出來（warnID 12100）。這裡估算圖集用量：超出預算的文字改走 TTF，只少字距、不會缺字。

const ATLAS_AREA = 1024 * 1024;
/** 只預約七成：其餘留給執行期才換字的短文字，以及排版留白 */
const BUDGET_RATIO = 0.35;
/** 過長多半是內文或資料綁定，字元不可預期，不走 CHAR */
const MAX_TEXT_LENGTH = 12;
const GLYPH_CELL_RATIO = 1.25;
const GLYPH_CELL_PADDING = 4;

export class LabelCharAtlasBudget {
    private readonly _glyphs = new Set<string>();
    private _usedArea = 0;

    /** 文字可用 CHAR 時預約其字元並回傳 true；styleKey 為字型＋顏色等會讓引擎另存一份字元的樣式。 */
    public reserve(text: string, fontSize: number, styleKey: string): boolean {
        const chars = [...text];
        if (chars.length === 0 || chars.length > MAX_TEXT_LENGTH) {
            return false;
        }

        const cell = Math.ceil(fontSize * GLYPH_CELL_RATIO) + GLYPH_CELL_PADDING;
        const fresh = [...new Set(chars)]
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

    /** 引擎在場景切換時清空圖集，預算跟著歸零。 */
    public reset(): void {
        this._glyphs.clear();
        this._usedArea = 0;
    }
}
