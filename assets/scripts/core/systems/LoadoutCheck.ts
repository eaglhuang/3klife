/**
 * LoadoutCheck — 推薦戰法三態檢核（WBS v7 LVL-04，PROG-2-0598）
 *
 * 規格（關卡設計系統 D-2／D-3）：
 * - 關卡指定「必備」與「高建議」戰法。
 * - 三態：已具備 / 缺少 / 高風險；不得只用二元鎖定。
 * - 任何一態都可挑戰，不鎖死進場。
 *
 * 本檔的三態解讀：
 * - 已具備：必備與高建議都涵蓋。
 * - 缺少：必備都涵蓋，只缺高建議。
 * - 高風險：缺任一必備。
 */

export type LoadoutCheckState = 'ready' | 'missing' | 'high-risk';

export interface LoadoutCheckResult {
    state: LoadoutCheckState;
    /** 缺口 key（只列名稱，不給最佳答案） */
    gaps: string[];
    /** 規格要求：任何一態都可挑戰 */
    canChallenge: true;
}

export function checkRecommendedLoadout(
    loadout: readonly string[],
    required: readonly string[],
    highlyRecommended: readonly string[],
): LoadoutCheckResult {
    const owned = new Set(loadout);
    const missingRequired = required.filter((key) => !owned.has(key));
    const missingRecommended = highlyRecommended.filter((key) => !owned.has(key));

    if (missingRequired.length > 0) {
        return { state: 'high-risk', gaps: [...missingRequired, ...missingRecommended], canChallenge: true };
    }
    if (missingRecommended.length > 0) {
        return { state: 'missing', gaps: missingRecommended, canChallenge: true };
    }
    return { state: 'ready', gaps: [], canChallenge: true };
}
