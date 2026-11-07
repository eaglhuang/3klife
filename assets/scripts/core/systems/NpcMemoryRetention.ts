// @spec-source → NPC記憶模型與離線情境回溯規格書.md (doc_spec_0333) §2 離線模板填槽、§3 單將 50 條容量與里程碑保護（PROG-2-2019）
/**
 * NpcMemoryRetention — 離線台詞填槽與武將日誌容量淘汰。純函式，不改輸入。
 */
import type { JournalEntry, JournalState } from './JournalLog';

/** §3：單一武將最多保留的記憶條目數。 */
export const NPC_MEMORY_PER_GENERAL_CAP = 50;

/** §2 槽位缺值時的保底文字；只有 PlayerName 有通用稱呼，其他槽缺值時保留原樣交給呼叫端換句。 */
export const DEFAULT_TEMPLATE_SLOTS: Readonly<Record<string, string>> = { PlayerName: '主公' };

const SLOT_PATTERN = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g;

/**
 * §2：把模板裡的 {Key} 換成槽位值；空字串視為缺值，改用 defaults。
 * 仍缺值的槽保留原字樣並列在 missing，呼叫端可據此改選不含該槽的句子。
 */
export function fillTemplateSlots(
    template: string,
    slots: Readonly<Record<string, string>>,
    defaults: Readonly<Record<string, string>> = DEFAULT_TEMPLATE_SLOTS,
): { text: string; missing: string[] } {
    const missing: string[] = [];
    const text = template.replace(SLOT_PATTERN, (whole, key: string) => {
        const value = slots[key] || defaults[key];
        if (value) return value;
        if (!missing.includes(key)) missing.push(key);
        return whole;
    });
    return { text, missing };
}

/**
 * §3：某武將相關條目超過上限時，從最舊的非里程碑條目開始剔除，直到回到上限。
 * 里程碑永久保留；全是里程碑時允許超過上限。evicted 依剔除順序列出 entryId。
 */
export function pruneGeneralMemories(
    state: Readonly<JournalState>,
    generalUid: string,
    isMilestone: (entry: Readonly<JournalEntry>) => boolean,
    cap: number = NPC_MEMORY_PER_GENERAL_CAP,
): { state: JournalState; evicted: string[] } {
    const related = state.entries
        .filter((e) => e.relatedGeneralUids.includes(generalUid))
        .sort((a, b) => (a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0));
    let excess = related.length - Math.max(0, cap);
    const evicted: string[] = [];
    for (const entry of related) {
        if (excess <= 0) break;
        if (isMilestone(entry)) continue;
        evicted.push(entry.entryId);
        excess--;
    }
    const drop = new Set(evicted);
    return {
        state: { entries: state.entries.filter((e) => !drop.has(e.entryId)).map((e) => ({ ...e, relatedGeneralUids: [...e.relatedGeneralUids] })) },
        evicted,
    };
}
