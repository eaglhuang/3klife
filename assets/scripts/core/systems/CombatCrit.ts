// @spec-source → 戰法場景規格書.md §夜襲作戰（全局命中 -25%、暴擊 +20%）；SCN-06（PROG-2-0614）
/**
 * CombatCrit — 暴擊判定與暴擊傷害（純邏輯，不依賴 cc）
 *
 * 數值為 PM 暫定：基礎暴擊率 5%，暴擊傷害 ×1.5；場景加成以「個百分點」疊加。
 * 擲骰比照命中：暴擊率 0 或 100% 時不消耗亂數，保持確定性。
 *
 * Unity 對照：像 Animator 的 Crit Chance 參數，場景 Buff 只改參數，
 * 真正擲骰與乘算由同一個函式負責。
 */

/** 基礎暴擊率（PM 暫定 5%） */
export const CRIT_BASE_RATE = 0.05;

/** 暴擊傷害倍率（PM 暫定 ×1.5） */
export const CRIT_DAMAGE_MULTIPLIER = 1.5;

/** 暴擊率 = 基礎 + 場景加成，夾在 [0, 1] */
export function critRateOf(bonus = 0): number {
    const raw = CRIT_BASE_RATE + (Number.isFinite(bonus) ? bonus : 0);
    return Math.max(0, Math.min(1, raw));
}

/** 擲骰判定暴擊；暴擊率為 0 或 100% 時不擲骰 */
export function rollCrit(rate: number, random: () => number): boolean {
    if (rate <= 0) return false;
    if (rate >= 1) return true;
    return random() < rate;
}

/** 暴擊後的傷害：×1.5，無條件捨去，至少 1 */
export function critDamageOf(damage: number): number {
    return Math.max(1, Math.floor(damage * CRIT_DAMAGE_MULTIPLIER));
}
