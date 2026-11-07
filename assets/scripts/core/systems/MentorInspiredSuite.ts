// @spec-source → 教官靈感戰法六招體系數值公式與TP消耗規格書.md（doc_spec_0364）§3、§4；PROG-2-2048
/**
 * MentorInspiredSuite — G-2 六招靈感戰法的 TP／再施放間隔表與教官解鎖門檻（純邏輯，不依賴 cc）
 *
 * - §3 六招各自的基礎 TP 與間隔回合；綠色因子折半保底 10 沿用 TacticCastTpCost。
 * - §4 解鎖：諸葛亮依好感階級＋智力；趙雲／關羽要力量 ≥80 且羈絆 100；荀彧／魯肅要魅力 ≥75。
 * 戰場效果已在 BattleSkillProfiles 的 tactic-insp-*；既有 SortieDeploy 學習 TP 表（八陣圖 80 等）與本表不同，並存待裁決。
 */
import { calculateTacticTpCost } from './TacticCastTpCost';

export type G2TacticId = 'TAC_LONE_RIDER' | 'TAC_EIGHT_ARRAY' | 'TAC_EMPTY_FORT' | 'TAC_HEAL' | 'TAC_INSPIRE' | 'TAC_SLOW';

export interface G2TacticCost {
    tier: 1 | 2 | 3 | 4;
    baseTp: number;
    /** 施放後須間隔的回合數 */
    recastTurns: number;
}

export const G2_TACTIC_COSTS: Readonly<Record<G2TacticId, G2TacticCost>> = {
    TAC_SLOW: { tier: 1, baseTp: 15, recastTurns: 1 },
    TAC_HEAL: { tier: 1, baseTp: 15, recastTurns: 2 },
    TAC_INSPIRE: { tier: 2, baseTp: 25, recastTurns: 3 },
    TAC_LONE_RIDER: { tier: 3, baseTp: 40, recastTurns: 3 },
    TAC_EMPTY_FORT: { tier: 3, baseTp: 40, recastTurns: 4 },
    TAC_EIGHT_ARRAY: { tier: 4, baseTp: 60, recastTurns: 5 },
};

export function g2CastTp(tacticId: G2TacticId, hasGreenGene: boolean): number {
    return calculateTacticTpCost({ tacticId, baseTp: G2_TACTIC_COSTS[tacticId].baseTp, hasGreenGene });
}

export interface G2UnlockRule {
    tacticId: G2TacticId;
    mentorIds: readonly string[];
    minAffinityLevel?: number;
    minInt?: number;
    minStr?: number;
    minCha?: number;
    /** 需羈絆滿值觸發七日頓悟 */
    requiresFullBond?: boolean;
}

export const G2_UNLOCK_RULES: readonly G2UnlockRule[] = [
    { tacticId: 'TAC_SLOW', mentorIds: ['zhuge-liang'], minAffinityLevel: 2 },
    { tacticId: 'TAC_EMPTY_FORT', mentorIds: ['zhuge-liang'], minAffinityLevel: 4, minInt: 80 },
    { tacticId: 'TAC_EIGHT_ARRAY', mentorIds: ['zhuge-liang'], minAffinityLevel: 5, minInt: 90 },
    { tacticId: 'TAC_LONE_RIDER', mentorIds: ['zhao-yun', 'guan-yu'], minStr: 80, requiresFullBond: true },
    { tacticId: 'TAC_INSPIRE', mentorIds: ['xun-yu', 'lu-su'], minCha: 75 },
    { tacticId: 'TAC_HEAL', mentorIds: ['xun-yu', 'lu-su'], minCha: 75 },
];

export const G2_FULL_BOND = 100;

export interface G2StudentState {
    mentorId: string;
    affinityLevel: number;
    bond: number;
    str: number;
    int: number;
    cha: number;
}

/** 回傳該教官此刻可傳授的靈感戰法（依規則表順序） */
export function unlockableG2Tactics(s: G2StudentState): G2TacticId[] {
    return G2_UNLOCK_RULES.filter((r) => r.mentorIds.indexOf(s.mentorId) >= 0
        && s.affinityLevel >= (r.minAffinityLevel ?? 0)
        && s.int >= (r.minInt ?? 0)
        && s.str >= (r.minStr ?? 0)
        && s.cha >= (r.minCha ?? 0)
        && (!r.requiresFullBond || s.bond >= G2_FULL_BOND))
        .map((r) => r.tacticId);
}
