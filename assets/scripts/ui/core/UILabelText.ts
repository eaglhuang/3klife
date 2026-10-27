// @spec-source → 見 docs/cross-reference-index.md
/**
 * UILabelText — layout label 的顯示文字解析（純邏輯，不依賴 cc）
 *
 * 優先順序：textKey 的翻譯 > 節點原文 text > textKey 本身 > bind 佔位 > 空字串。
 * HTML 稿轉成的畫面帶有 auto.* textKey 但字典尚未收錄；查不到翻譯時退回原文，
 * 避免畫面直接露出 "auto.lobby-main-screen..." 之類的鍵名。
 */
export interface LabelTextSpec {
    textKey?: string;
    text?: unknown;
    bind?: string;
}

export function resolveLabelText(spec: LabelTextSpec, i18nStrings: Record<string, string>): string {
    if (spec.textKey) {
        const translated = i18nStrings[spec.textKey];
        if (translated !== undefined) return translated;
        if (spec.text !== undefined) return String(spec.text);
        return spec.textKey;
    }
    if (spec.text !== undefined) return String(spec.text);
    if (spec.bind) return `{${spec.bind}}`;
    return '';
}
