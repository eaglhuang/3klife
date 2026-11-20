// @spec-source → 關卡設計系統 §C-3 裁決 86（一年六關按季開放 2／2／1／1）；PROG-2-9421
/**
 * StageSeasonSchedule — 一年六關按季開放（純邏輯，不依賴 cc）
 *
 * 規格：春 2 關、夏 2 關、秋 1 關、冬 1 關，依連環破主鏈的正式順序開放，不可跳關。
 * 這裡只回答「這一季開到第幾關」；連環破前置（上一關要先通關）仍由 StageChainProgress 判定，兩者都過才可進。
 * 開放是累計的：夏季時春季兩關仍可打，沒打完的不會關掉。
 * 不在排程裡的關卡（例如極限任務）不受季節限制。
 *
 * 數值放在 resources/data/stage-season-schedule.json，這裡不寫死。
 * Unity 對照：像一張 ScriptableObject 的季節解鎖表，Level Select 依目前季節查表決定哪些按鈕可按。
 */

export interface StageSeasonSchedule {
    /** 春夏秋冬各開放幾關，長度 4 */
    seasonQuota: readonly number[];
    /** 一年的關卡正式順序 */
    stageOrder: readonly string[];
}

export const SEASON_NAMES = ['春', '夏', '秋', '冬'] as const;

/** 資料不合法時回傳 null（呼叫端改成不設季節閘門，不能讓大廳整個卡住） */
export function parseStageSeasonSchedule(raw: unknown): StageSeasonSchedule | null {
    if (!raw || typeof raw !== 'object') return null;
    const data = raw as { seasonQuota?: unknown; stageOrder?: unknown };
    const quota = data.seasonQuota;
    const order = data.stageOrder;
    if (!Array.isArray(quota) || quota.length !== 4) return null;
    if (!quota.every((n) => Number.isInteger(n) && n >= 0)) return null;
    if (!Array.isArray(order) || !order.every((id) => typeof id === 'string' && id.length > 0)) return null;
    return { seasonQuota: quota as number[], stageOrder: order as string[] };
}

/** 到這一季（1~4）為止累計開放幾關；季節不合法時當作春季 */
export function openStageCount(schedule: StageSeasonSchedule, season: number): number {
    const s = Number.isInteger(season) && season >= 1 && season <= 4 ? season : 1;
    let total = 0;
    for (let i = 0; i < s; i++) total += schedule.seasonQuota[i] ?? 0;
    return Math.min(total, schedule.stageOrder.length);
}

/**
 * 某關在第幾季開放（1~4）；不在排程裡回傳 null（不受季節限制）。
 * 排在全年配額之外的關卡回傳 5，代表今年都不開。
 */
export function stageOpenSeason(schedule: StageSeasonSchedule, stageId: string): number | null {
    const index = schedule.stageOrder.indexOf(stageId);
    if (index < 0) return null;
    let total = 0;
    for (let s = 0; s < 4; s++) {
        total += schedule.seasonQuota[s] ?? 0;
        if (index < total) return s + 1;
    }
    return 5;
}

/** 這一季可不可以打這一關（只看季節；連環破前置另外判定）。schedule 為 null 時一律可打 */
export function isStageSeasonOpen(schedule: StageSeasonSchedule | null, stageId: string, season: number): boolean {
    if (!schedule) return true;
    const open = stageOpenSeason(schedule, stageId);
    if (open === null) return true;
    const s = Number.isInteger(season) && season >= 1 && season <= 4 ? season : 1;
    return open <= s;
}

/** 下一關被季節鎖住時的提示，例如「下一關「樊城水淹」夏季開放」 */
export function seasonLockedHint(stageName: string, openSeason: number): string {
    const name = SEASON_NAMES[openSeason - 1];
    return name ? `下一關「${stageName}」${name}季開放` : `下一關「${stageName}」今年尚未開放`;
}
