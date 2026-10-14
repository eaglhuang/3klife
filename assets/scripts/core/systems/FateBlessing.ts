// @spec-source → 因子爆發系統.md §MCQ Q39（天命加護）；運氣系統.md（紫色 = 運氣天命）；FBR-10（PROG-2-0613）
/**
 * FateBlessing — 紫色因子戰場效果「天命加護」（純邏輯，不依賴 cc）
 *
 * 規則（Q39 選項 A）：紫色因子提升戰場隨機事件（火計、落石）的成功機率與傷害。
 * 數值為 PM 暫定：每級 +5%；落石基礎成功率 85%（PM 裁定，天命加成另計）。
 *
 * Unity 對照：像一個 Buff 的 StatModifier，等級越高 modifier 越大；
 * 這裡只算數字，由呼叫端決定套在火計傷害或落石判定上。
 */

/** 天命（紫色）基因 id；與 gene-dictionary.json 中 color 為 purple 的基因一致（測試守衛） */
export const FATE_BLESSING_GENE_IDS: readonly string[] = ['gene_destiny', 'gene_luck'];

/** 每級天命加成（PM 暫定 5%） */
export const FATE_BLESSING_PER_LEVEL = 0.05;

/** 落石基礎成功率（PM 暫定 85%，天命加成另計） */
export const ROCK_SLIDE_BASE_SUCCESS = 0.85;

/** 武將持有的基因（只需要 id / level / isLocked） */
export interface FateHeldGene {
    id?: string;
    level?: number;
    isLocked?: boolean;
}

/** 天命等級：持有且未鎖定的紫色基因中最高等級；沒有則 0 */
export function fateBlessingLevel(genes: readonly FateHeldGene[]): number {
    let best = 0;
    for (const gene of genes) {
        if (gene.isLocked) continue;
        if (!FATE_BLESSING_GENE_IDS.includes(gene.id ?? '')) continue;
        best = Math.max(best, gene.level ?? 0);
    }
    return best;
}

/** 事件成功率：基礎 + 天命加成，上限 100% */
export function fateSuccessChance(baseChance: number, level: number): number {
    return Math.min(1, baseChance + level * FATE_BLESSING_PER_LEVEL);
}

/** 火計傷害倍率：1 + 天命加成；等級 0 時為 1 */
export function fateDamageMultiplier(level: number): number {
    return 1 + level * FATE_BLESSING_PER_LEVEL;
}

/** 事件判定：roll 落在成功率之內即成功（roll 取 [0, 1)） */
export function rollEventSuccess(chance: number, roll: number): boolean {
    return roll < chance;
}
