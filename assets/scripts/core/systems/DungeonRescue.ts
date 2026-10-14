// @spec-source → 養成系統與教官來源定義：地下城救美（8 小時刷新）；FEM-07（PROG-2-0561）
/**
 * DungeonRescue — 地下城救美任務結果（純邏輯，不依賴 cc）
 *
 * 機率（PM 指示）：民女 60%、千金 30%、貴族 10%。
 * 刷新間隔與傭兵池相同（8 小時）；本檔獨立定義，避免依賴尚未合併的 FemalePoolRefresh。
 *
 * Unity 對照：像一張加權掉落表（Loot Table），用一個隨機數落在哪個區間決定結果。
 */

/** 救美任務的刷新間隔（小時），與傭兵池女武將相同 */
export const RESCUE_REFRESH_HOURS = 8;
const MS_PER_HOUR = 60 * 60 * 1000;

export type RescueOutcome = 'commoner' | 'noble-lady' | 'noble';

/** 結果機率的累積上限：[0, 0.6) 民女、[0.6, 0.9) 千金、[0.9, 1) 貴族 */
export const RESCUE_OUTCOME_WEIGHTS: ReadonlyArray<{ outcome: RescueOutcome; weight: number }> = Object.freeze([
    { outcome: 'commoner', weight: 0.6 },
    { outcome: 'noble-lady', weight: 0.3 },
    { outcome: 'noble', weight: 0.1 },
]);

/** 依隨機數（0~1）決定救美結果 */
export function rollDungeonRescue(random: () => number): RescueOutcome {
    const roll = random();
    let cumulative = 0;
    for (const entry of RESCUE_OUTCOME_WEIGHTS) {
        cumulative += entry.weight;
        if (roll < cumulative) return entry.outcome;
    }
    return RESCUE_OUTCOME_WEIGHTS[RESCUE_OUTCOME_WEIGHTS.length - 1].outcome;
}

/** 救美任務是否可刷新（8 小時） */
export function isRescueRefreshDue(lastRefreshMs: number, nowMs: number): boolean {
    return nowMs - lastRefreshMs >= RESCUE_REFRESH_HOURS * MS_PER_HOUR;
}
