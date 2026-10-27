/**
 * RelationEventLogText — 戰場關係事件的戰報文字（PROG-2-1421，純邏輯，不依賴 cc）
 *
 * - 劇本字串以 i18n 組字，{0}{1} 帶入兩位武將名字（名將契合用得到，義兄弟合攻沒有佔位符就不影響）。
 * - 名字查不到時退回模板 id，戰報至少不會空白。
 *
 * Unity 對照：像 LocalizedString.GetLocalizedString(args)，名字由呼叫端的名稱表提供。
 */
import type { RelationEventHit } from '../../core/systems/RelationEvents';

export type RelationLogTranslate = (key: string, ...args: string[]) => string;

/** 組出一行戰報；nameOf 回傳 null／undefined 時用模板 id */
export function relationEventLogLine(
    hit: Pick<RelationEventHit, 'loreKey' | 'templateA' | 'templateB'>,
    nameOf: (templateId: string) => string | null | undefined,
    t: RelationLogTranslate,
): string {
    return t(hit.loreKey, nameOf(hit.templateA) ?? hit.templateA, nameOf(hit.templateB) ?? hit.templateB);
}

/** generals-index.json（{ data: [{ uid, name }] } 或直接陣列）轉成 uid → 名字；格式不對回傳空表 */
export function generalNameMapOf(raw: unknown): Map<string, string> {
    const list = Array.isArray(raw) ? raw : (raw as { data?: unknown } | null)?.data;
    const names = new Map<string, string>();
    if (!Array.isArray(list)) return names;
    for (const item of list) {
        const row = item as { uid?: unknown; id?: unknown; name?: unknown } | null;
        const id = typeof row?.uid === 'string' ? row.uid : typeof row?.id === 'string' ? row.id : null;
        if (id && typeof row?.name === 'string' && row.name.length > 0) names.set(id, row.name);
    }
    return names;
}
