/**
 * BattleLeaderboard — 武將戰績排行榜：依傷害、擊殺或守護力排序（純邏輯，不依賴 cc）
 *
 * 規格來源：武將戰績系統.md §功能清單 #10「戰績排行榜」（傷害／擊殺／守護力）。
 * 本模組只處理本機已有的名冊資料；好友與全服範圍需要伺服器，尚未接。
 *
 * 排序規則（暫定）：指定指標由大到小；同分時依其餘兩項由大到小，再依武將 id 由小到大，確保結果穩定。
 *
 * Unity 對照：像一個 ScrollView 的資料來源，先把每列資料算好、排序，畫面只負責顯示前 N 列。
 */

export type LeaderboardMetric = 'damage' | 'kills' | 'guardian';

export interface LeaderboardEntry {
    generalId: string;
    damage: number;
    kills: number;
    guardian: number;
}

/** 名冊武將上與戰績有關的欄位（舊存檔可能沒有，缺的當 0） */
export interface LeaderboardSource {
    id: string;
    battleRecord?: {
        totalDamage?: number;
        kills?: number;
        guardianPower?: number;
    };
}

function nonNeg(value: number | undefined): number {
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

export function leaderboardEntryOf(source: LeaderboardSource): LeaderboardEntry {
    return {
        generalId: source.id,
        damage: nonNeg(source.battleRecord?.totalDamage),
        kills: nonNeg(source.battleRecord?.kills),
        guardian: nonNeg(source.battleRecord?.guardianPower),
    };
}

const METRIC_ORDER: Record<LeaderboardMetric, readonly (keyof Omit<LeaderboardEntry, 'generalId'>)[]> = {
    damage: ['damage', 'kills', 'guardian'],
    kills: ['kills', 'damage', 'guardian'],
    guardian: ['guardian', 'damage', 'kills'],
};

/** 依指標排序並取前 N 名；limit 小於 1 時回傳空陣列，不修改傳入陣列 */
export function rankLeaderboard(
    entries: readonly LeaderboardEntry[],
    metric: LeaderboardMetric,
    limit: number,
): LeaderboardEntry[] {
    if (!(limit >= 1)) return [];
    const [primary, secondary, tertiary] = METRIC_ORDER[metric];
    return [...entries]
        .sort((a, b) =>
            (b[primary] - a[primary])
            || (b[secondary] - a[secondary])
            || (b[tertiary] - a[tertiary])
            || (a.generalId < b.generalId ? -1 : a.generalId > b.generalId ? 1 : 0))
        .slice(0, Math.floor(limit));
}
