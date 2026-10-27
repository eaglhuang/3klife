// @spec-source → 領地治理系統.md §E「領地升級：升級太守府→解鎖更多任務格」；PM 暫定數值（待辦檔，2026-10-21）；WBS v16.2 GOV-08（PROG-2-0979）
/**
 * TerritoryUpgrade — 太守府（領地）升級的等級、格數與費用（純邏輯，不依賴 cc）。
 *
 * - 等級 1–5；每級的內政任務格數由 SLOTS_BY_LEVEL 決定，改表即可調整。
 * - 升到第 n 級的費用：金錢 1000×n²、糧草 500×n（PM 暫定）。
 * - 本模組只規劃結果，不扣任何資源；扣款與生效時機由 GameSession 決定。
 *
 * Unity 對照：像 ScriptableObject 表加一個純函式的計算器，UI 只讀結果、不自己算費用。
 */

export const TERRITORY_MAX_LEVEL = 5;

/** 各等級的內政任務格數（暫定，PM 2026-10-21）。 */
const SLOTS_BY_LEVEL: Readonly<Record<number, number>> = Object.freeze({ 1: 2, 2: 3, 3: 4, 4: 5, 5: 6 });

export function clampTerritoryLevel(level: number): number {
    if (!Number.isFinite(level)) return 1;
    return Math.min(TERRITORY_MAX_LEVEL, Math.max(1, Math.floor(level)));
}

export function maxTaskSlotsForLevel(level: number): number {
    return SLOTS_BY_LEVEL[clampTerritoryLevel(level)];
}

export interface TerritoryUpgradeCost {
    gold: number;
    food: number;
}

/** 升到第 targetLevel 級的費用（暫定：金錢 1000×n²、糧草 500×n）。 */
export function territoryUpgradeCost(targetLevel: number): TerritoryUpgradeCost {
    const n = clampTerritoryLevel(targetLevel);
    return { gold: 1000 * n * n, food: 500 * n };
}

export type TerritoryUpgradeRejectReason = 'max-level' | 'upgrade-pending' | 'insufficient-food' | 'insufficient-gold';

export interface TerritoryUpgradePlan {
    ok: boolean;
    reason?: TerritoryUpgradeRejectReason;
    /** 升級後的等級；被拒絕時仍回傳本來會升到的等級，方便畫面顯示。 */
    targetLevel: number;
    cost: TerritoryUpgradeCost;
}

/**
 * 規劃一次升級：等級已滿、已有待生效的升級、或糧草不足時拒絕。
 * 金錢由呼叫端錢包判斷，不在這裡檢查。
 */
export function planTerritoryUpgrade(level: number, pendingLevel: number | null, food: number): TerritoryUpgradePlan {
    const current = clampTerritoryLevel(level);
    const targetLevel = current + 1;
    const cost = territoryUpgradeCost(targetLevel);
    const reject = (reason: TerritoryUpgradeRejectReason): TerritoryUpgradePlan => ({ ok: false, reason, targetLevel, cost });
    if (current >= TERRITORY_MAX_LEVEL) return reject('max-level');
    if (pendingLevel !== null) return reject('upgrade-pending');
    if (food < cost.food) return reject('insufficient-food');
    return { ok: true, targetLevel, cost };
}
