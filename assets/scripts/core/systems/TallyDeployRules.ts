// @spec-source → 三國特殊兵種三十四營編制與專屬戰法規格書 (doc_spec_0317) §2（TRP-04、TERM-07，PROG-2-1943）
/**
 * TallyDeployRules — 特殊兵種虎符的出陣編制與專屬營效率（純邏輯，不依賴 cc）。
 *
 * 規格定案：
 * - 一人限裝一符，固定投入 1,500 兵力（星級不增人數），無冷卻。
 * - 名將專屬營（編號 18~34）：本人或其一階直系 100% 發揮，其他武將僅 60%。
 * - 死亡傳承通用營（編號 01~17）：適性相符即 100%。
 *
 * 34 條戰法對照沿用 TigerTallySpecTactics，剋制倍率沿用 Constants。
 * 暫定：規格 §1 的剋制循環與現行 TROOP_COUNTER_MAP 不同，待裁決後另卡調整。
 * Unity 對照：像裝備時的 static 驗證，回傳生效兵力與效率倍率。
 */

export const TALLY_FIXED_TROOPS = 1500;
export const NAMED_TALLY_FULL_EFFICIENCY = 1;
export const NAMED_TALLY_OUTSIDER_EFFICIENCY = 0.6;

export type TallyGroup = 'general' | 'named';

export interface TallyBearer {
    generalId: string;
    /** 父母的 generalId（一階直系判定用） */
    parentIds?: readonly string[];
    equippedTallyId?: string | null;
}

/** 專屬營效率：持有者為源武將本人或其子女 → 100%，否則 60%；通用營一律 100%。 */
export function tallyEfficiency(group: TallyGroup, sourceGeneralId: string, bearer: TallyBearer): number {
    if (group === 'general') return NAMED_TALLY_FULL_EFFICIENCY;
    const isLineage = bearer.generalId === sourceGeneralId || (bearer.parentIds ?? []).includes(sourceGeneralId);
    return isLineage ? NAMED_TALLY_FULL_EFFICIENCY : NAMED_TALLY_OUTSIDER_EFFICIENCY;
}

/** 一人限裝一符：已裝其他虎符時拒絕。 */
export function canEquipTally(bearer: TallyBearer, tallyId: string): boolean {
    return !bearer.equippedTallyId || bearer.equippedTallyId === tallyId;
}

/** 特殊兵種出陣兵力：固定 1,500，不隨星級增加；呼叫端兵源不足時取較小值。 */
export function tallyDeployTroops(availableTroops: number): number {
    return Math.max(0, Math.min(TALLY_FIXED_TROOPS, Math.floor(availableTroops)));
}
