// @spec-source → 武將戰績系統.md §里程碑（不敗神話、守護之壁、修羅 → 隱藏白／紅因子）；REC-06（PROG-2-0711）
/**
 * HiddenFactorAwakening — 里程碑達成時把隱藏因子寫進武將基因（純邏輯，不依賴 cc）
 *
 * 規格：達成「不敗神話」「守護之壁」「修羅」時，解鎖對應的白／紅色隱藏因子。
 * 因子 id 來自 MilestoneRewards 的獎勵表（gene_hidden_*）；同一因子只寫一次，重複達成不會重複加入。
 * 顏色（白／紅）在字典標為 provisional，這裡不決定顏色，只寫入 id。
 *
 * Unity 對照：像 Achievement 的 OnUnlock，把獎勵表裡的因子加進角色的 Gene 陣列，已有的不重複加。
 */
import type { GeneralGeneConfig } from '../models/GeneralUnit';
import { MILESTONE_REWARDS } from './MilestoneRewards';

/** 這些里程碑 id 對應的隱藏因子 id（依輸入順序，去除重複） */
export function hiddenFactorIdsForMilestones(milestoneIds: readonly string[]): string[] {
    const ids = milestoneIds.flatMap((id) => (MILESTONE_REWARDS[id] ?? []).flatMap((item) => (item.kind === 'hiddenFactor' ? [item.factorId] : [])));
    return ids.filter((id, index) => ids.indexOf(id) === index);
}

/** 依里程碑把隱藏因子加進武將基因；已擁有的因子不重複加，回傳新物件，不改傳入的武將 */
export function awakenHiddenFactors<G extends { genes?: GeneralGeneConfig[] }>(general: G, milestoneIds: readonly string[]): G {
    const owned = new Set((general.genes ?? []).map((gene) => gene.id));
    const additions = hiddenFactorIdsForMilestones(milestoneIds).filter((id) => !owned.has(id));
    if (additions.length === 0) return general;
    return { ...general, genes: [...(general.genes ?? []), ...additions.map((id): GeneralGeneConfig => ({ id, level: 1 }))] };
}
