/**
 * SkillEffectFormulas — 戰法效果純公式（WBS v8 TAC-10／TAC-11 前置，PROG-2-0751）
 *
 * 只放數學公式，不依賴 cc，也不改戰鬥狀態。結算接線留給後續 PR。
 */

export const CHARGE_MULTIPLIER = 2.0;
export const POISON_MAX_HP_RATIO = 0.1;
export const SOLO_ATTACK_BONUS = 0.3;
/** 火場每回合傷害，與 BattleTacticBehavior 的 FIRE_DAMAGE_PER_TURN 同值（PROG-2-0757） */
export const FIRE_HAZARD_DAMAGE_PER_TURN = 15;

/** 精銳突擊：衝鋒傷害 = 基礎傷害 × 2.0 */
export function chargeDamage(base: number): number {
    return base * CHARGE_MULTIPLIER;
}

/** 毒箭：每回合扣目標最大 HP 的 10% */
export function dotDamagePerTurn(maxHp: number): number {
    return maxHp * POISON_MAX_HP_RATIO;
}

/** 緩速：移動範圍 = max(0, 移動力 − 減少量) */
export function slowedMoveRange(move: number, amount: number): number {
    return Math.max(0, move - amount);
}

/** 鼓舞：士氣加成 */
export function applyMorale(morale: number, bonus: number): number {
    return morale + bonus;
}

/** 結姻連射：總攻擊次數 = 基礎次數 + 額外次數 */
export function totalHitCount(baseHits: number, extraHits: number): number {
    return baseHits + extraHits;
}

/** 單騎破陣：無相鄰友軍時攻擊 ×1.3，否則 ×1 */
export function soloAttackMultiplier(hasAdjacentAlly: boolean): number {
    return hasAdjacentAlly ? 1 : 1 + SOLO_ATTACK_BONUS;
}
