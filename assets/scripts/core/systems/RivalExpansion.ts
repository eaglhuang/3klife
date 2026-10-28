// @spec-source → 治理模式他國AI系統.md (doc_spec_0020) E-4 擴張決策、F-2 擴張效用函數、E-11／F-6 軍事任務品質（PROG-2-1473）
/**
 * RivalExpansion — 他國 AI 是否出征、打誰，以及軍師智力對軍事任務品質的分段（純邏輯，不依賴 cc）
 *
 * 規格：
 * - 兵力 < 1500 或糧草 < 3000 不出征；依勢力性格的出征意願擲骰。
 * - 目標效用 = 0.30×min(2, 兵力比) + 0.20×min(1, 資源價值) + 0.20×min(1, 仇恨)
 *            + 0.15×邦交落差 + 0.15×min(1, 情報)；最高分 ≥ 0.6 才出征。
 * - 軍事任務品質：智力 ≥ 90 MASTER、≥ 70 ADVANCED；情報分段 ≥90→3、≥70→2、≥50→1。
 *
 * 暫定（可逆）：
 * - 邦交落差採 F-2 公式 (100 − 邦交) / 200（E-4 註解寫法不同，以公式節為準）。
 * - RAIDER 規格寫 special，暫定意願 0.5。
 * - 同分目標取先出現者。
 *
 * Unity 對照：像 Campaign AI 的 UtilityAI，先過門檻、再擲意願骰、最後對候選目標打分取最高。
 */
import type { NationProfile } from './RivalNations';

export const MIN_TROOPS_FOR_ATTACK = 1500;
export const FOOD_FOR_CAMPAIGN = 3000;
/**
 * 出征分數門檻。規格寫 0.6，但 PROG-2-1505 模擬（20 seed × 60 季、全國交戰）下 0.6 約 44 次出征、
 * 0.77 以上為 0，與「約每 8–12 季出征一次」不符。暫定取 0.75（約 28 次／60 季），可逆，待企劃裁定。
 */
export const EXPANSION_ATTACK_SCORE = 0.75;

/** 規格 E-4 出征意願；RAIDER 為暫定值 */
export const EXPANSION_WILLINGNESS: Readonly<Record<NationProfile, number>> = Object.freeze({
    WARLORD: 0.9,
    MILITARIST: 0.7,
    EXPANSIONIST: 0.7,
    CAVALRY_LORD: 0.5,
    GUARDIAN: 0.3,
    DIPLOMAT: 0.2,
    PASSIVE: 0.05,
    RAIDER: 0.5,
});

export const EXPANSION_TARGET_WEIGHT = Object.freeze({
    military: 0.3,
    resource: 0.2,
    hatred: 0.2,
    diplomacy: 0.15,
    intel: 0.15,
});

export interface ExpansionAttacker {
    readonly troops: number;
    readonly food: number;
    /** 情報值 0~100 */
    readonly intel: number;
    readonly profile: NationProfile;
}

export interface ExpansionTarget {
    readonly id: string;
    readonly troops: number;
    readonly food: number;
    readonly gold: number;
    /** 對此目標的歷史仇恨 0~100 */
    readonly hatred: number;
    /** 與此目標的邦交值 -100~100 */
    readonly relation: number;
}

export type ExpansionDecision =
    | { readonly kind: 'HOLD'; readonly reason: 'troops' | 'food' | 'willingness' | 'no-target' | 'low-score' }
    | { readonly kind: 'ATTACK'; readonly targetId: string; readonly score: number };

/** F-2 目標效用分數 */
export function evaluateExpansionTarget(attacker: ExpansionAttacker, target: ExpansionTarget): number {
    const w = EXPANSION_TARGET_WEIGHT;
    const militaryRatio = attacker.troops / Math.max(1, target.troops);
    const resourceValue = (target.food + target.gold * 2) / 10000;
    const hatred = target.hatred / 100;
    const diplomaticGap = (100 - target.relation) / 200;
    const intelConfidence = attacker.intel / 100;
    return w.military * Math.min(2, militaryRatio)
        + w.resource * Math.min(1, resourceValue)
        + w.hatred * Math.min(1, hatred)
        + w.diplomacy * diplomaticGap
        + w.intel * Math.min(1, intelConfidence);
}

/** E-4 每季出征判定；random 回傳 0~1，由呼叫端注入 */
export function evaluateExpansion(
    attacker: ExpansionAttacker,
    targets: readonly ExpansionTarget[],
    random: () => number,
): ExpansionDecision {
    if (attacker.troops < MIN_TROOPS_FOR_ATTACK) return { kind: 'HOLD', reason: 'troops' };
    if (attacker.food < FOOD_FOR_CAMPAIGN) return { kind: 'HOLD', reason: 'food' };
    if (random() > EXPANSION_WILLINGNESS[attacker.profile]) return { kind: 'HOLD', reason: 'willingness' };
    if (targets.length === 0) return { kind: 'HOLD', reason: 'no-target' };

    let best = targets[0];
    let bestScore = evaluateExpansionTarget(attacker, best);
    for (const target of targets.slice(1)) {
        const score = evaluateExpansionTarget(attacker, target);
        if (score > bestScore) {
            best = target;
            bestScore = score;
        }
    }
    if (bestScore < EXPANSION_ATTACK_SCORE) return { kind: 'HOLD', reason: 'low-score' };
    return { kind: 'ATTACK', targetId: best.id, score: bestScore };
}

export type MilitaryMissionTier = 'BASIC' | 'ADVANCED' | 'MASTER';

/** E-11：軍師或主導武將智力決定軍事任務品質 */
export function militaryMissionTierOf(intValue: number): MilitaryMissionTier {
    if (intValue >= 90) return 'MASTER';
    if (intValue >= 70) return 'ADVANCED';
    return 'BASIC';
}

/** F-6：軍事任務情報分段 0~3 */
export function missionIntelBandOf(intValue: number): number {
    if (intValue >= 90) return 3;
    if (intValue >= 70) return 2;
    if (intValue >= 50) return 1;
    return 0;
}
