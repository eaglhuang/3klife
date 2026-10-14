// @spec-source → 結緣系統（配種）.md (doc_spec_0028) §E #1 血統樹、UI 規格補遺_2026-04-11_培育戰場轉蛋pending.md (doc_ui_0031) BondingSetup
/**
 * BloodlineTreeSlots — 結緣畫面 14 人血統樹的格位排列（純邏輯，不依賴 cc）
 *
 * 排列與 BloodlineTreePanel 一致：祖先鏈依 BFS 順序，前 2 位放第 3 代、接著 4 位放第 2 代、最後 8 位放第 1 代。
 * 不足的格位以 null 補上，畫面顯示空白；祖先找不到名字時退回 uid。
 *
 * Unity 對照：像一個 Presenter，只把資料填進三排固定格數的 Slot 陣列，Label 文字交給畫面層套用。
 */

export const BLOODLINE_TREE_SLOT_COUNTS = { gen3: 2, gen2: 4, gen1: 8 } as const;

export interface BloodlineTreeSlot {
    /** 祖先 uid；空格為 null */
    uid: string | null;
    /** 畫面文字：空格為「—」，有資料時為名字（找不到名字則為 uid） */
    label: string;
}

export interface BloodlineTreeSlots {
    gen3: BloodlineTreeSlot[];
    gen2: BloodlineTreeSlot[];
    gen1: BloodlineTreeSlot[];
}

const EMPTY_LABEL = '—';

function fill(ancestors: readonly string[], count: number, nameOf: (uid: string) => string | undefined): BloodlineTreeSlot[] {
    return Array.from({ length: count }, (_, i) => {
        const uid = ancestors[i] ?? null;
        return { uid, label: uid === null ? EMPTY_LABEL : nameOf(uid) ?? uid };
    });
}

/**
 * 把祖先 uid 鏈排進三排格位；ancestors 不改。
 * 超過 14 位的部分直接忽略（血統樹只畫到第 3 代）。
 */
export function buildBloodlineTreeSlots(
    ancestors: readonly string[],
    nameOf: (uid: string) => string | undefined = () => undefined,
): BloodlineTreeSlots {
    const { gen3, gen2, gen1 } = BLOODLINE_TREE_SLOT_COUNTS;
    return {
        gen3: fill(ancestors.slice(0, gen3), gen3, nameOf),
        gen2: fill(ancestors.slice(gen3, gen3 + gen2), gen2, nameOf),
        gen1: fill(ancestors.slice(gen3 + gen2, gen3 + gen2 + gen1), gen1, nameOf),
    };
}
