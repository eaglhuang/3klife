// @spec-source → WBS v3 HALL-07（武將點位刷新池：rollHallCharacters 加權抽樣 favorite 2.0 / assigned 1.2，每 60 秒刷新，6~8 點位、3~5 人）
/**
 * HallCharacterRoll — 大廳武將點位的加權抽樣與刷新間隔判斷，純 TS，不依賴 cc。
 *
 * 權重：基礎 1.0；收藏武將 ×2.0（favorite）；已派任務武將 ×1.2（assigned）。兩者可同時成立，權重相乘（暫定）。
 * 抽樣不放回；亂數由呼叫端注入，回傳 [0,1) 的值，方便 headless 測試。
 * 點位與人數區間依 WBS 驗收，超出時夾回區間。
 *
 * Unity 對照：像從 WeightedRandomBag 抽 N 個不重複項目，每 60 秒呼叫一次 Roll。
 */

export const HALL_FAVORITE_WEIGHT = 2.0;
export const HALL_ASSIGNED_WEIGHT = 1.2;
export const HALL_REFRESH_SECONDS = 60;
export const HALL_SPOT_RANGE = Object.freeze({ min: 6, max: 8 });
export const HALL_OCCUPANT_RANGE = Object.freeze({ min: 3, max: 5 });

export interface HallCandidate {
    id: string;
    favorite: boolean;
    assigned: boolean;
}

export function hallWeight(candidate: Readonly<HallCandidate>): number {
    const favorite = candidate.favorite ? HALL_FAVORITE_WEIGHT : 1;
    const assigned = candidate.assigned ? HALL_ASSIGNED_WEIGHT : 1;
    return favorite * assigned;
}

function clampInt(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) return min;
    return Math.min(max, Math.max(min, Math.floor(value)));
}

export function clampSpotCount(value: number): number {
    return clampInt(value, HALL_SPOT_RANGE.min, HALL_SPOT_RANGE.max);
}

export function clampOccupantCount(value: number): number {
    return clampInt(value, HALL_OCCUPANT_RANGE.min, HALL_OCCUPANT_RANGE.max);
}

/** 距上次刷新是否已滿 60 秒（含）；時間單位為秒。 */
export function isHallRefreshDue(lastRefreshSec: number, nowSec: number): boolean {
    return nowSec - lastRefreshSec >= HALL_REFRESH_SECONDS;
}

/**
 * 加權不放回抽樣，回傳被抽中的 id（依抽出順序）。count 超過池大小時只回傳全部。
 * 不改輸入；亂數每抽一次呼叫一次 random。
 */
export function rollHallCharacters(
    pool: readonly HallCandidate[],
    count: number,
    random: () => number,
): string[] {
    const remaining = pool.slice();
    const picked: string[] = [];
    const target = Math.min(Math.max(0, Math.floor(count)), pool.length);
    while (picked.length < target && remaining.length > 0) {
        const weights = remaining.map(hallWeight);
        const total = weights.reduce((sum, w) => sum + w, 0);
        const roll = random() * total;
        let cumulative = 0;
        let index = remaining.length - 1;
        for (let i = 0; i < remaining.length; i++) {
            cumulative += weights[i];
            if (roll < cumulative) {
                index = i;
                break;
            }
        }
        picked.push(remaining[index].id);
        remaining.splice(index, 1);
    }
    return picked;
}
