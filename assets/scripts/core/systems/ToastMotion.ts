// @spec-source → 主戰場UI規格書.md §4.1 Toast 提示（doc_ui_0001，PROG-2-1894）
/**
 * ToastMotion — Toast 停留與上浮消失的參數（純邏輯，不依賴 cc）
 *
 * 規格 §4.1：出現 2 秒後自動上浮消失。
 * 呼叫端沒指定時長時用 TOAST_DEFAULT_HOLD_SEC；停留不少於 TOAST_MIN_HOLD_SEC，避免一閃即逝。
 * 消失時同時淡出並向上移 TOAST_RISE_PX。
 *
 * Unity 對照：像 DOTween 序列的參數表（Delay → Join(DOFade, DOLocalMoveY)）。
 */

export const TOAST_DEFAULT_HOLD_SEC = 2;
export const TOAST_MIN_HOLD_SEC = 0.2;
export const TOAST_FADE_SEC = 0.3;
export const TOAST_RISE_PX = 40;

/** 停留秒數：未指定或無效時用預設 2 秒，且不少於下限 */
export function toastHoldSec(duration?: number): number {
    if (duration === undefined || !Number.isFinite(duration)) return TOAST_DEFAULT_HOLD_SEC;
    return Math.max(TOAST_MIN_HOLD_SEC, duration);
}

/**
 * 彈窗開著時，提示條貼著畫面底緣放，距底緣的留白（像素）。
 * 結緣卡（1200×880 置中於 1080 高）下緣只剩 100px 空地，提示條 112px 高，留白必須為 0，
 * 才不會蓋住卡片底部的「譜牒密考」等按鈕列。
 */
export const TOAST_MODAL_BOTTOM_MARGIN_PX = 0;

/**
 * 提示條中心的 y（相對全螢幕容器中心，向上為正）。
 * 平常放在設計稿位置（畫面上方）；有彈窗開著就改貼底緣，避免蓋住彈窗標題（PROG-2-9994）。
 * 容器高度無效時退回設計稿位置。
 */
export function toastCenterY(designY: number, modalOpen: boolean, containerHeight: number, toastHeight: number): number {
    if (!modalOpen || !Number.isFinite(containerHeight) || containerHeight <= 0) return designY;
    return -containerHeight / 2 + toastHeight / 2 + TOAST_MODAL_BOTTOM_MARGIN_PX;
}

// ─── 括號詞不斷行（PROG-2-10127）：「【才思出眾】」這類詞不可被換行拆成兩半 ───

const BRACKET_PAIRS: Readonly<Record<string, string>> = { '【': '】', '「': '」', '『': '』', '（': '）', '《': '》' };

/** 近似字寬：半形字元算半格，其餘算一格（Label 的 CJK 字寬 = 字級） */
function glyphUnits(ch: string): number {
    return ch.charCodeAt(0) < 0x80 ? 0.5 : 1;
}

/**
 * 在「會被換行拆開」的括號詞前面補換行，讓整個括號詞落在下一行行首。
 * 逐字模擬 Label 的貪婪換行；其餘字元不動（照舊由 Label 自己換行）。
 * 括號詞本身比一行還長時不處理（再怎麼換都會斷）。
 */
export function keepBracketsTogether(text: string, unitsPerLine: number): string {
    if (!Number.isFinite(unitsPerLine) || unitsPerLine <= 0 || text.length === 0) return text;
    const chars = Array.from(text);
    let out = '';
    let col = 0;
    for (let i = 0; i < chars.length;) {
        const ch = chars[i];
        if (ch === '\n') { out += ch; col = 0; i += 1; continue; }
        const close = BRACKET_PAIRS[ch];
        const end = close === undefined ? -1 : chars.indexOf(close, i + 1);
        const group = end > i ? chars.slice(i, end + 1) : [ch];
        const width = group.reduce((sum, g) => sum + glyphUnits(g), 0);
        if (group.length > 1 && !group.includes('\n') && width <= unitsPerLine) {
            if (col > 0 && col + width > unitsPerLine) { out += '\n'; col = 0; }
            out += group.join('');
            col = (col + width) % unitsPerLine;
            i += group.length;
            continue;
        }
        col += glyphUnits(ch);
        if (col > unitsPerLine) col = glyphUnits(ch);
        out += ch;
        i += 1;
    }
    return out;
}
