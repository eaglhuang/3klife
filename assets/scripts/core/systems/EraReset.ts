// @spec-source → 遊戲時間系統.md（TIME-10 時代更迭 Era_Reset）；治理模式他國AI系統.md E-10
/**
 * EraReset — 時代更迭觸發與保留/重置清單（純邏輯，不依賴 cc）
 *
 * 每 60 個遊戲月（5 年）觸發一次地圖大重組：保留養成資產，重置領土、外交與 AI 勢力。
 * 1 季 = 3 個遊戲月，所以觸發季是 totalSeasonsElapsed 為 20、40、60…（第 0 月是開局，不算）。
 *
 * Unity 對照：像 Roguelike 的大循環重置，玩家 Meta 資料（ScriptableObject）留著，
 * 關卡狀態（Scene）整個重建。
 */

export const MONTHS_PER_SEASON = 3;
export const ERA_RESET_INTERVAL_MONTHS = 60;

/** 保留項目（養成資產）：只列名稱，實際資料仍由各自系統持有 */
export const ERA_RESET_KEEP: readonly string[] = [
    'descendantStats',
    'bloodlineFactors',
    'tigerTallyAndSpiritCards',
    'unlockedTech',
    'playerAchievements',
];

/** 重置項目（地圖狀態）：世界沙盤系統接入後由它執行 */
export const ERA_RESET_RESET: readonly string[] = [
    'territoryOwnership',
    'diplomacy',
    'aiNationScale',
];

export interface EraResetEvent {
    /** 第幾個時代（第一次更迭為 1） */
    eraIndex: number;
    /** 觸發時的 totalSeasonsElapsed */
    atSeason: number;
    keep: readonly string[];
    reset: readonly string[];
}

/** 是否為時代更迭季（季結算後的 totalSeasonsElapsed） */
export function isEraResetSeason(totalSeasonsElapsed: number): boolean {
    if (!Number.isInteger(totalSeasonsElapsed) || totalSeasonsElapsed <= 0) return false;
    return (totalSeasonsElapsed * MONTHS_PER_SEASON) % ERA_RESET_INTERVAL_MONTHS === 0;
}

/** 時代更迭事件資料；非更迭季回傳 null */
export function buildEraResetEvent(totalSeasonsElapsed: number): EraResetEvent | null {
    if (!isEraResetSeason(totalSeasonsElapsed)) return null;
    const months = totalSeasonsElapsed * MONTHS_PER_SEASON;
    return {
        eraIndex: months / ERA_RESET_INTERVAL_MONTHS,
        atSeason: totalSeasonsElapsed,
        keep: ERA_RESET_KEEP,
        reset: ERA_RESET_RESET,
    };
}
