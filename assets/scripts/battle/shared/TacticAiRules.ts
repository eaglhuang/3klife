// @spec-source → 戰法系統-shards/g5.md Step 6 AI 規則層；AI武將強度系統.md AI_UseTactic（PROG-2-0907）
/**
 * TacticAiRules — 戰法 AI 選技規則（純邏輯，不依賴 cc）
 *
 * 依戰法類別打分：單體傷害看斬殺線、Buff / Heal 看我方危險值、Tile / Scene 看 choke point 與天氣相容。
 * 只回傳「該選哪一招」，不執行施放，也不接 EnemyAI / BattleController 流程。
 *
 * Unity 對照：AI 的 Utility Scorer，每個 Action 依情境算分，取最高分執行。
 */

export type TacticAiCategory = 'single-damage' | 'buff-heal' | 'tile-scene';

export interface TacticAiCandidate {
    tacticId: string;
    category: TacticAiCategory;
    /** single-damage：預估傷害 */
    estimatedDamage?: number;
    /** buff-heal：預估效果值（回血量或增益量） */
    effectValue?: number;
    /** tile-scene：是否有 choke point */
    hasChokePoint?: boolean;
    /** tile-scene：是否落在密集區 */
    denseArea?: boolean;
    /** tile-scene：天氣是否相容；不相容直接不選 */
    weatherCompatible?: boolean;
}

export interface TacticAiSituation {
    /** 敵方各單位目前 HP（斬殺線判斷用） */
    enemyHp: readonly number[];
    /** 我方最低 HP 比例（0~1） */
    allyLowestHpRate: number;
}

/** 暫定：斬殺線加分（規格未給數字） */
export const TACTIC_AI_KILL_BONUS = 1000;
/** 暫定：我方危險線（最低 HP 比例） */
export const TACTIC_AI_DANGER_HP_RATE = 0.35;
/** 暫定：危險時 Buff / Heal 加分 */
export const TACTIC_AI_DANGER_BONUS = 1000;
/** 暫定：非危險時 Buff / Heal 降權係數 */
export const TACTIC_AI_IDLE_DEMOTE = 0.5;
/** 暫定：choke point / 密集區各自的加分 */
export const TACTIC_AI_SCENE_POINT = 10;

/** 單一戰法的分數；0 或負數代表不選 */
export function scoreTacticCandidate(candidate: TacticAiCandidate, situation: TacticAiSituation): number {
    switch (candidate.category) {
        case 'single-damage': {
            const damage = candidate.estimatedDamage ?? 0;
            if (damage <= 0) return 0;
            const killable = situation.enemyHp.some(hp => hp > 0 && hp <= damage);
            return damage + (killable ? TACTIC_AI_KILL_BONUS : 0);
        }
        case 'buff-heal': {
            const value = candidate.effectValue ?? 0;
            if (value <= 0) return 0;
            const danger = situation.allyLowestHpRate <= TACTIC_AI_DANGER_HP_RATE;
            return danger ? value + TACTIC_AI_DANGER_BONUS : value * TACTIC_AI_IDLE_DEMOTE;
        }
        case 'tile-scene': {
            if (candidate.weatherCompatible === false) return 0;
            return (candidate.hasChokePoint ? TACTIC_AI_SCENE_POINT : 0)
                + (candidate.denseArea ? TACTIC_AI_SCENE_POINT : 0);
        }
    }
}

/** 取分數最高的戰法 id；同分取先出現者，全部 0 分或沒有候選時回 null */
export function pickTacticByAiRule(
    candidates: readonly TacticAiCandidate[],
    situation: TacticAiSituation,
): string | null {
    let best: string | null = null;
    let bestScore = 0;
    for (const candidate of candidates) {
        const score = scoreTacticCandidate(candidate, situation);
        if (score > bestScore) {
            best = candidate.tacticId;
            bestScore = score;
        }
    }
    return best;
}
