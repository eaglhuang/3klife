// @spec-source → 武將系統.md §稱號系統（Template_ID + Title 辨識同名不同版本）（GEN-10，PROG-2-0551）
/**
 * GeneralTitle — 稱號顯示格式與同名辨識（純邏輯，不依賴 cc）
 *
 * - 顯示：有稱號時「名稱・稱號」，沒有時只顯示名稱。
 * - 同名武將（不同版本）靠 Template_ID 區分，稱號用來在畫面上分開。
 * - 檢查：Template_ID 不可重複；同名武將的稱號不可相同；稱號不可空白。
 *
 * Unity 對照：像一個 Name Formatter，Inspector 上填 Name 與 Title，顯示時拼成一行。
 */

export interface TitledGeneral {
    id: string;
    name: string;
    templateId: string;
    title?: string | null;
}

/** 有稱號時回傳「名稱・稱號」，沒有則只回傳名稱 */
export function formatGeneralDisplayName(name: string, title?: string | null): string {
    const trimmed = (title ?? '').trim();
    return trimmed.length > 0 ? `${name}・${trimmed}` : name;
}

/** 同名的武將超過一位時，顯示要帶稱號辨識 */
export function needsTitleToTell(general: TitledGeneral, all: readonly TitledGeneral[]): boolean {
    return all.some((other) => other.id !== general.id && other.name === general.name);
}

/**
 * 稱號資料檢查，回傳錯誤訊息；空陣列代表通過。
 * - 稱號不可空白
 * - Template_ID 不可重複
 * - 同名武將的稱號不可相同
 */
export function validateGeneralTitles(generals: readonly TitledGeneral[]): string[] {
    const errors: string[] = [];
    const seenTemplates = new Set<string>();
    for (const general of generals) {
        if ((general.title ?? '').trim().length === 0) errors.push(`${general.id}: 缺少稱號`);
        if (seenTemplates.has(general.templateId)) errors.push(`${general.id}: Template_ID「${general.templateId}」重複`);
        seenTemplates.add(general.templateId);
    }

    const byName = new Map<string, TitledGeneral[]>();
    for (const general of generals) {
        const list = byName.get(general.name) ?? [];
        list.push(general);
        byName.set(general.name, list);
    }
    for (const [name, list] of byName) {
        if (list.length < 2) continue;
        const titles = list.map((g) => (g.title ?? '').trim());
        if (new Set(titles).size !== titles.length) errors.push(`${name}: 同名武將的稱號有重複`);
    }
    return errors;
}
