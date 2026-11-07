// @spec-source → 特殊兵種與虎符UI多語系鍵值字典規格書.md (doc_spec_0342) §4.2 安全回退 TargetLang → zh-TW → zh-CN → KeyName（PROG-2-2027）
/**
 * LocaleFallback — 多語系查表回退鏈。純函式，不依賴 cc。
 */

/** §4.2：目標語系查不到時依序往下找 */
export const LOCALE_FALLBACK_CHAIN: readonly string[] = ['zh-TW', 'zh-CN'];

/** 目標語系在前、回退語系在後，去除重複 */
export function localeLookupOrder(locale: string): string[] {
    const order = [locale];
    for (const l of LOCALE_FALLBACK_CHAIN) if (!order.includes(l)) order.push(l);
    return order;
}

/**
 * 依回退鏈查字串；空字串視為缺條目。全部查不到時回傳 key 本身，永不回 undefined。
 * tableOf 回傳該語系目前已載入的字串表，未載入回 undefined。
 */
export function resolveLocalizedString(
    key: string,
    locale: string,
    tableOf: (locale: string) => Readonly<Record<string, string>> | undefined,
): string {
    for (const l of localeLookupOrder(locale)) {
        const value = tableOf(l)?.[key];
        if (typeof value === 'string' && value.length > 0) return value;
    }
    return key;
}
