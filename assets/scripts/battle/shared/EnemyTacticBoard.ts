// @spec-source → 戰法系統-shards/g5.md Step 6 AI 規則層（PROG-2-0919 數值來源）
/**
 * EnemyTacticBoard — 敵方選技的戰場數值來源（純邏輯，不依賴 cc）
 *
 * 給 EnemyTacticNumbers 的 metrics 用：
 * - denseArea：我方有 3 個以上單位聚在相鄰格（3x3 範圍內）。
 * - hasChokePoint：我方有一路只剩 1 個單位，同時別路有 2 個以上（薄處夾在厚線之間）。
 * - estimateHealValue：依回復類戰法的設定估算回復量。
 *
 * 規格只說 Tile / Scene 看 choke point 與密集區，沒給幾何定義；上面兩條是暫定的代理判斷，記在待辦檔。
 *
 * Unity 對照：像 Scene 裡的 Physics.OverlapBox 查一圈有幾個敵人，只回答「有沒有」，不改任何東西。
 */
export interface BoardCell {
    lane: number;
    depth: number;
}

/** 暫定：3x3 內聚集數達到此值即視為密集區 */
export const DENSE_AREA_MIN_UNITS = 3;

export function hasDenseArea(cells: readonly BoardCell[]): boolean {
    return cells.some(center => {
        const near = cells.filter(
            cell => Math.abs(cell.lane - center.lane) <= 1 && Math.abs(cell.depth - center.depth) <= 1,
        );
        return near.length >= DENSE_AREA_MIN_UNITS;
    });
}

export function hasChokePointLane(cells: readonly BoardCell[]): boolean {
    const perLane = new Map<number, number>();
    for (const cell of cells) {
        perLane.set(cell.lane, (perLane.get(cell.lane) ?? 0) + 1);
    }
    const counts = Array.from(perLane.values());
    return counts.includes(1) && counts.some(count => count >= 2);
}

export interface HealProfileLike {
    healRatio?: number;
    healFloor?: number;
    healMissingRatio?: number;
}

/**
 * 回復量估算：
 * - 有 healMissingRatio：以最低血量隊友的已損 HP 乘比例（醫療 25%）。
 * - 否則有 healRatio：以施放者最大 HP 乘比例，不低於 healFloor。
 * - 都沒有（增益類）：回 0，表示本卡不估增益量。
 */
export function estimateHealValue(
    profile: HealProfileLike | null,
    casterMaxHp: number,
    lowestAllyMissingHp: number,
): number {
    if (!profile) return 0;
    if (profile.healMissingRatio !== undefined) {
        return Math.max(0, Math.floor(lowestAllyMissingHp * profile.healMissingRatio));
    }
    if (profile.healRatio !== undefined) {
        return Math.max(profile.healFloor ?? 0, Math.floor(casterMaxHp * profile.healRatio));
    }
    return 0;
}
