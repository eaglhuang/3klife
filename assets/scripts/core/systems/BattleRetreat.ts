// @spec-source → 武將壽命系統.md §精力區間（撤退風險提高）；撤退規則與數值為 PM 暫定（協調者 2026-10-14 19:20Z 轉達）
/**
 * BattleRetreat — 部隊撤退的擲骰結算（純邏輯，不依賴 cc）
 *
 * PM 暫定規則：
 * - 撤退時擲骰；roll 小於風險值即失敗，否則成功。
 * - 成功：部隊脫離戰場，保留現有 HP，不算陣亡，也不給戰功。
 * - 失敗：不設被俘機制；部隊受最大 HP 20% 傷害並留在場上，當回合不能再行動。
 *
 * roll 由呼叫端傳入（0 以上、未滿 1），本模組不擲骰，方便測試與重播。
 * Unity 對照：像一個純計算的 Utility，輸入狀態與亂數，輸出結果，不改場景。
 */

/** 撤退基礎風險（PM 暫定 0.2）；精力耗盡段另由 retreatRiskOf 加成 */
export const RETREAT_BASE_RISK = 0.2;

/** 撤退失敗時受到的最大 HP 比例（PM 暫定 20%） */
export const RETREAT_FAIL_DAMAGE_PCT = 0.2;

export interface RetreatResolution {
    readonly escaped: boolean;
    readonly damage: number;
    readonly hpAfter: number;
}

/** 撤退結果在戰場的後續步驟：脫離、陣亡（失敗且血量歸 0），或留場並鎖當回合 */
export type RetreatNextStep = 'escape' | 'dead' | 'blocked';

export function retreatNextStep(resolution: RetreatResolution): RetreatNextStep {
    if (resolution.escaped) return 'escape';
    return resolution.hpAfter <= 0 ? 'dead' : 'blocked';
}

/**
 * 結算一次撤退。
 * risk 夾在 0~1；roll 無效（非有限數）時視為 0，負數也視為 0。
 * 失敗傷害 = floor(maxHp × 20%)，扣到 0 為止；maxHp 無效時傷害為 0。
 */
export function resolveRetreat(maxHp: number, currentHp: number, risk: number, roll: number): RetreatResolution {
    const clampedRisk = Math.min(1, Math.max(0, Number.isFinite(risk) ? risk : 0));
    const safeRoll = Number.isFinite(roll) ? Math.max(0, roll) : 0;
    const hp = Number.isFinite(currentHp) ? Math.max(0, currentHp) : 0;
    if (safeRoll >= clampedRisk) {
        return { escaped: true, damage: 0, hpAfter: hp };
    }
    const damage = Number.isFinite(maxHp) && maxHp > 0 ? Math.floor(maxHp * RETREAT_FAIL_DAMAGE_PCT) : 0;
    return { escaped: false, damage, hpAfter: Math.max(0, hp - damage) };
}
