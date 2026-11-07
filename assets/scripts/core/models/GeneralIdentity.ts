// @spec-source → 武將稱號系統與同名辨識規格書.md (doc_spec_0337) §2 複合身分鍵、§2.1 同隊單一存在、§4 稱號 i18n 鍵（PROG-2-2022）
/**
 * GeneralIdentity — 同名武將的複合身分鍵 `{Template_ID}#{Title_Tag}`、稱號字典鍵與出陣同源檢查。純函式。
 * 顯示格式沿用 GeneralTitle.formatGeneralDisplayName。
 */

export const COMPOSITE_KEY_SEPARATOR = '#';
export const TITLE_I18N_PREFIX = 'TITLE_';

/** §2.1：有稱號時 `templateId#titleTag`，沒有時只回 templateId。 */
export function getGeneralCompositeKey(templateId: string, titleTag?: string | null): string {
    const tag = (titleTag ?? '').trim();
    return tag ? `${templateId}${COMPOSITE_KEY_SEPARATOR}${tag}` : templateId;
}

/** 拆回 templateId 與 titleTag；沒有 # 時 titleTag 為 undefined。 */
export function parseGeneralCompositeKey(key: string): { templateId: string; titleTag?: string } {
    const at = key.indexOf(COMPOSITE_KEY_SEPARATOR);
    if (at < 0) return { templateId: key };
    const titleTag = key.slice(at + 1);
    return titleTag ? { templateId: key.slice(0, at), titleTag } : { templateId: key.slice(0, at) };
}

function upperToken(value: string): string {
    return value.trim().replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').toUpperCase();
}

/** §4.1：`TITLE_{TEMPLATE_ID_UPPER}_{TITLE_TAG_UPPER}`；連字號等符號一律轉底線。 */
export function getTitleI18nKey(templateId: string, titleTag: string): string {
    return `${TITLE_I18N_PREFIX}${upperToken(templateId)}_${upperToken(titleTag)}`;
}

/**
 * §2.1：同一 Template_ID 不論稱號，同隊只能一人。回傳重複出現的 templateId（依首次重複順序）。
 */
export function findDuplicateTemplatesInLineup(compositeKeys: readonly string[]): string[] {
    const seen = new Set<string>();
    const dup: string[] = [];
    for (const key of compositeKeys) {
        const { templateId } = parseGeneralCompositeKey(key);
        if (seen.has(templateId)) {
            if (!dup.includes(templateId)) dup.push(templateId);
        } else {
            seen.add(templateId);
        }
    }
    return dup;
}
