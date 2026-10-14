// @spec-source → 傭兵系統規格書：人才經營進化（宴客令／徵人令、每 8 小時刷新）；FEM-04（PROG-2-0560）
/**
 * FemalePoolRefresh — 傭兵池女武將 8 小時刷新與抽取（純邏輯，不依賴 cc）
 *
 * - 每 8 小時刷新一次，時間以毫秒計，呼叫端自行提供現在時間。
 * - 只從女性候選中抽取，數量限制 3~5（與宴客令一致）。
 * - 6 日結義沿用 MercenaryBond 的 TRIAL_DAYS，本檔不重複定義。
 *
 * Unity 對照：像 Timer 加上隨機抽籤，時間到了就重新抽一批候選。
 */

export const FEMALE_POOL_REFRESH_HOURS = 8;
export const FEMALE_POOL_MIN = 3;
export const FEMALE_POOL_MAX = 5;
const MS_PER_HOUR = 60 * 60 * 1000;

export interface PoolCandidate {
    id: string;
    gender?: string;
}

/** 是否已到刷新時間（滿 8 小時即刷新） */
export function isFemalePoolRefreshDue(lastRefreshMs: number, nowMs: number): boolean {
    // 現在時間比上次還早（裝置時鐘被調回、存檔帶著未來時間戳）視為到期，避免池子被鎖到時鐘追上為止
    if (nowMs < lastRefreshMs) return true;
    return nowMs - lastRefreshMs >= FEMALE_POOL_REFRESH_HOURS * MS_PER_HOUR;
}

/** 下一次刷新的時間點 */
export function nextFemalePoolRefreshMs(lastRefreshMs: number): number {
    return lastRefreshMs + FEMALE_POOL_REFRESH_HOURS * MS_PER_HOUR;
}

/**
 * 從候選中抽出女性武將，不重複；數量夾在 3~5。
 * 女性候選不足時回傳全部女性候選。
 */
export function drawFemalePool(candidates: readonly PoolCandidate[], size: number, random: () => number): string[] {
    const females = candidates.filter((candidate) => candidate.gender === '女').map((candidate) => candidate.id);
    const target = Math.min(FEMALE_POOL_MAX, Math.max(FEMALE_POOL_MIN, Math.floor(size)));
    const pool = [...females];
    const picked: string[] = [];
    while (pool.length > 0 && picked.length < target) {
        const index = Math.min(pool.length - 1, Math.floor(random() * pool.length));
        picked.push(pool.splice(index, 1)[0]);
    }
    return picked;
}
