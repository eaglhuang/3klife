// @spec-source → NPC人性化規格書 F-2（STATIC_TEMPLATE / FALLBACK_LINE）、G（點武將頭像 20~60 字短句）；PROG-2-0462
/**
 * OfflineTemplateEngine — 離線模板台詞產生（STATIC_TEMPLATE slot filling），純邏輯，不依賴 cc。
 *
 * - 依情境鍵（Context_Key）挑模板，用 {slot} 填入玩家資料或武將資料。
 * - 產出字數需落在 20~60 字（規格 G）；不合格或缺槽位時回退到武將的安全句（FALLBACK_LINE）。
 * - 不改輸入；挑選模板用呼叫端給的 pickIndex，確定性、可測試。
 *
 * Unity 對照：像一個 Localization 的字串插值（{0} 格式化），加上找不到就退回預設字串的 Fallback 規則。
 */

export const OFFLINE_LINE_MIN_CHARS = 20;
export const OFFLINE_LINE_MAX_CHARS = 60;

export interface OfflineTemplate {
    Context_Key: string;
    /** 含 {slot} 佔位的模板句 */
    Text: string;
}

/** 只需要安全句的最小形狀，讓引擎不必依賴完整的 Persona Card。 */
export interface OfflineFallbackSource {
    Safe_Fallback_Line: string;
}

export type OfflineLineSource = 'template' | 'fallback';

export interface OfflineLineResult {
    line: string;
    source: OfflineLineSource;
}

const SLOT_PATTERN = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g;

/** 字數以 Unicode 字元計（中文一字算一字）。 */
export function lineLength(line: string): number {
    return Array.from(line).length;
}

export function isAcceptableOfflineLine(line: string): boolean {
    const length = lineLength(line);
    return length >= OFFLINE_LINE_MIN_CHARS && length <= OFFLINE_LINE_MAX_CHARS;
}

/**
 * 把 {slot} 換成 slots 的值。任一槽位缺值時回傳 null，不留下未填的佔位。
 */
export function fillTemplate(text: string, slots: Readonly<Record<string, string>>): string | null {
    let missing = false;
    const filled = text.replace(SLOT_PATTERN, (_match, name: string) => {
        const value = slots[name];
        if (typeof value !== 'string') {
            missing = true;
            return '';
        }
        return value;
    });
    return missing ? null : filled;
}

/**
 * 產生一句離線台詞：挑出同情境的模板（pickIndex 取模），填槽位，過字數檢查；
 * 任何一步失敗都回退到武將的安全句。
 */
export function renderOfflineLine(
    persona: Readonly<OfflineFallbackSource>,
    contextKey: string,
    templates: readonly OfflineTemplate[],
    slots: Readonly<Record<string, string>>,
    pickIndex = 0,
): OfflineLineResult {
    const matched = templates.filter((template) => template.Context_Key === contextKey);
    if (matched.length === 0) {
        return { line: persona.Safe_Fallback_Line, source: 'fallback' };
    }
    const index = ((pickIndex % matched.length) + matched.length) % matched.length;
    const filled = fillTemplate(matched[index].Text, slots);
    if (filled === null || !isAcceptableOfflineLine(filled)) {
        return { line: persona.Safe_Fallback_Line, source: 'fallback' };
    }
    return { line: filled, source: 'template' };
}
