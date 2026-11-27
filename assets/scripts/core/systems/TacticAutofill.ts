// @spec-source → 戰前情報偵查面板與戰法對策槽位容量規格書.md（doc_spec_0347）；PROG-2-10135
/**
 * TacticAutofill — 偵察面板「幫我換上」：依本關缺口對策標籤，從主將已持有的戰法挑出最合適的換上方案（純邏輯，不依賴 cc）
 *
 * 規則（規則稿 tactic-autofill-rule-1126；排序權重走 data/tactic-autofill-rules.json，不寫死）：
 * 1. 缺口 ＝ 本關必備＋高建議標籤中，目前已裝備戰法沒涵蓋的；必備排在高建議前面。
 * 2. 候選只來自主將「已持有、尚未裝備」的戰法，經 tactic-counter-tags 轉標籤，含缺口標籤者才入選；背包沒有就不補。
 * 3. 排序依 rules.scoreOrder 逐項比較（預設：補到的必備數、補到的缺口總數、敵軍兵種加權、戰法等級），全同分取 id 排序確保結果固定。
 * 4. 有空槽先填空槽；槽滿只換「不含任何本關必備或高建議標籤」且等級最低的一格，絕不換掉已涵蓋缺口的戰法；仍不足就停，不超過槽位上限。
 * 5. 本檔只算方案不改資料；寫入與復原由呼叫端負責。
 */
import { toLibraryTacticId } from './InspiredTacticMap';
import { loadoutTagsOf, type TacticCounterTagTable } from './LoadoutCheck';

export type AutofillScoreKey = 'requiredCovered' | 'totalCovered' | 'troopBonus' | 'level';

export interface TacticAutofillRules {
    scoreOrder: readonly AutofillScoreKey[];
    /** 敵軍兵種（TroopType 字串）→ 較適合的對策標籤 */
    troopTypeTags: Readonly<Record<string, readonly string[]>>;
}

export const DEFAULT_AUTOFILL_RULES: TacticAutofillRules = {
    scoreOrder: ['requiredCovered', 'totalCovered', 'troopBonus', 'level'],
    troopTypeTags: {},
};

const SCORE_KEYS: readonly AutofillScoreKey[] = ['requiredCovered', 'totalCovered', 'troopBonus', 'level'];

/** 讀資料檔（缺欄位、未知排序鍵都退回預設，不丟錯） */
export function parseAutofillRules(raw: unknown): TacticAutofillRules {
    const data = (raw && typeof raw === 'object' ? raw : {}) as { scoreOrder?: unknown; troopTypeTags?: unknown };
    const order = Array.isArray(data.scoreOrder)
        ? data.scoreOrder.filter((key): key is AutofillScoreKey => SCORE_KEYS.includes(key as AutofillScoreKey))
        : [];
    const troopTypeTags: Record<string, readonly string[]> = {};
    if (data.troopTypeTags && typeof data.troopTypeTags === 'object') {
        for (const [troop, tags] of Object.entries(data.troopTypeTags as Record<string, unknown>)) {
            if (Array.isArray(tags)) troopTypeTags[troop] = tags.filter((tag): tag is string => typeof tag === 'string');
        }
    }
    return { scoreOrder: order.length > 0 ? order : DEFAULT_AUTOFILL_RULES.scoreOrder, troopTypeTags };
}

export interface AutofillSlot {
    slotId: string;
    tacticId: string;
}

export interface TacticAutofillInput {
    required: readonly string[];
    recommended: readonly string[];
    /** 目前已裝備的智力槽（不含通用計謀） */
    equipped: readonly AutofillSlot[];
    /** 主將已持有的戰法 id（規格 id 或戰法庫 id 皆可） */
    owned: readonly string[];
    /** 不佔智力槽、但戰場一定會帶的戰法（通用計謀）：算涵蓋、不可換下也不重複補 */
    alwaysOn?: readonly string[];
    /** 智力槽位上限 */
    capacity: number;
    tagTable: TacticCounterTagTable;
    levelOf: (tacticId: string) => number;
    /** 敵軍出現的兵種（TroopType 字串） */
    enemyTroops: readonly string[];
    rules: TacticAutofillRules;
}

export interface AutofillChange {
    slotId: string;
    /** 換上的戰法（戰法庫 id） */
    tacticId: string;
    /** 被換下的戰法；補空槽時為 null */
    replaces: string | null;
    /** 這一招補到的缺口標籤 */
    covers: string[];
}

export interface TacticAutofillPlan {
    changes: AutofillChange[];
    /** 換完後仍沒補到的缺口標籤 */
    remainingGaps: string[];
    /** 有缺口但背包沒有任何可補的戰法（面板顯示「尚未持有，先照常出征」） */
    nothingOwned: boolean;
    /** 有可補的戰法，但槽位全被本關用得到的戰法佔滿、沒有可換下的 */
    slotsBlocked: boolean;
    /** 換完後的智力槽 */
    nextSlots: AutofillSlot[];
}

function uniq<T>(items: readonly T[]): T[] {
    return Array.from(new Set(items));
}

export function planTacticAutofill(input: TacticAutofillInput): TacticAutofillPlan {
    const needed = uniq([...input.required, ...input.recommended]);
    const required = new Set(input.required);
    const alwaysOn = input.alwaysOn ?? [];
    const slots: AutofillSlot[] = input.equipped.map((slot) => ({ ...slot }));
    const changes: AutofillChange[] = [];
    const tagsOf = (id: string): string[] => loadoutTagsOf([id], input.tagTable);
    const gapsNow = (): string[] => {
        const covered = new Set(loadoutTagsOf([...alwaysOn, ...slots.map((slot) => slot.tacticId)], input.tagTable));
        // 必備排前面（needed 已先放必備）
        return needed.filter((tag) => !covered.has(tag));
    };
    const troopTags = new Set(input.enemyTroops.flatMap((troop) => input.rules.troopTypeTags[troop] ?? []));
    const capacity = Math.max(0, Math.floor(input.capacity));
    let hadCandidate = false;
    let slotsBlocked = false;

    for (let guard = 0; guard < capacity + needed.length + 1; guard += 1) {
        const gaps = gapsNow();
        if (gaps.length === 0) break;
        const gapSet = new Set(gaps);
        const taken = new Set([...alwaysOn, ...slots.map((slot) => slot.tacticId)].map(toLibraryTacticId));
        const pool = uniq(input.owned.map(toLibraryTacticId)).filter((id) => !taken.has(id));
        const scored = pool
            .map((id) => {
                const covers = tagsOf(id).filter((tag) => gapSet.has(tag));
                return {
                    id,
                    covers,
                    score: {
                        requiredCovered: covers.filter((tag) => required.has(tag)).length,
                        totalCovered: covers.length,
                        troopBonus: tagsOf(id).filter((tag) => troopTags.has(tag)).length,
                        level: input.levelOf(id),
                    } as Record<AutofillScoreKey, number>,
                };
            })
            .filter((entry) => entry.covers.length > 0);
        if (scored.length === 0) break;
        hadCandidate = true;
        scored.sort((a, b) => {
            for (const key of input.rules.scoreOrder) {
                if (a.score[key] !== b.score[key]) return b.score[key] - a.score[key];
            }
            return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
        });
        const best = scored[0];

        let slotIndex = -1;
        let replaces: string | null = null;
        if (slots.length < capacity) {
            const used = new Set(slots.map((slot) => slot.slotId));
            let n = 1;
            while (used.has(`slot-${n}`)) n += 1;
            slots.push({ slotId: `slot-${n}`, tacticId: best.id });
            slotIndex = slots.length - 1;
        } else {
            // 槽滿：只換不含任何本關必備／高建議標籤的一格，取等級最低（同級取後面的槽）
            const keep = new Set(needed);
            let victim = -1;
            slots.forEach((slot, index) => {
                if (tagsOf(slot.tacticId).some((tag) => keep.has(tag))) return;
                if (victim < 0 || input.levelOf(slot.tacticId) <= input.levelOf(slots[victim].tacticId)) victim = index;
            });
            if (victim < 0) { slotsBlocked = true; break; }
            replaces = slots[victim].tacticId;
            slots[victim] = { slotId: slots[victim].slotId, tacticId: best.id };
            slotIndex = victim;
        }
        changes.push({ slotId: slots[slotIndex].slotId, tacticId: best.id, replaces, covers: best.covers });
    }

    const remainingGaps = gapsNow();
    return { changes, remainingGaps, nothingOwned: changes.length === 0 && remainingGaps.length > 0 && !hadCandidate, slotsBlocked: slotsBlocked && changes.length === 0, nextSlots: slots };
}
