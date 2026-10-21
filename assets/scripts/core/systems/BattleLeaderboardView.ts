// @spec-source → 武將戰績系統.md (doc_spec_0019) §功能清單 #10「戰績排行榜」
/**
 * BattleLeaderboardView — 戰績排行榜的列資料與文字（純邏輯，不依賴 cc）（PROG-2-0957）
 *
 * 排序與取前 N 名由 BattleLeaderboard.rankLeaderboard 負責；本模組只把排好的結果轉成畫面要顯示的列。
 * 畫面（大廳入口、指標切換按鈕、ScrollView）之後由 cc 層接線，只讀這裡的輸出。
 *
 * Unity 對照：Presenter 把排好序的資料轉成每一列的 ViewModel，ScrollView 的 Item 只做 label.text = ...
 */
import { leaderboardEntryOf, rankLeaderboard, type LeaderboardMetric, type LeaderboardSource } from './BattleLeaderboard';

export const LEADERBOARD_METRICS: readonly LeaderboardMetric[] = ['damage', 'kills', 'guardian'];

/** 指標按鈕的文字（zh-TW 預設；語系 key 接線時再換成 i18n） */
export const LEADERBOARD_METRIC_LABEL: Readonly<Record<LeaderboardMetric, string>> = {
    damage: '傷害總量',
    kills: '擊殺數',
    guardian: '守護力',
};

export interface LeaderboardRow {
    rank: number;
    generalId: string;
    name: string;
    valueText: string;
}

/** 數字加千分位，傷害、守護力動輒上萬 */
function groupDigits(value: number): string {
    return String(Math.floor(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** 依指標取出該列要顯示的數值（與 rankLeaderboard 的 metric 對應） */
function metricValueOf(entry: { damage: number; kills: number; guardian: number }, metric: LeaderboardMetric): number {
    if (metric === 'damage') return entry.damage;
    if (metric === 'kills') return entry.kills;
    return entry.guardian;
}

/**
 * 排行榜前 N 列。名冊武將的戰績為 0 也會列出（排在後段），不過濾。
 * 名冊中沒有名稱的武將以 id 代替，避免空白列。
 */
export function buildLeaderboardRows(
    roster: readonly (LeaderboardSource & { name?: string })[],
    metric: LeaderboardMetric,
    limit: number,
): LeaderboardRow[] {
    const nameById = new Map(roster.map((general) => [general.id, general.name && general.name.length > 0 ? general.name : general.id]));
    const ranked = rankLeaderboard(roster.map((general) => leaderboardEntryOf(general)), metric, limit);
    return ranked.map((entry, index) => ({
        rank: index + 1,
        generalId: entry.generalId,
        name: nameById.get(entry.generalId) ?? entry.generalId,
        valueText: groupDigits(metricValueOf(entry, metric)),
    }));
}

/** 指標切換後的下一個指標（循環），畫面的切換按鈕用 */
export function nextLeaderboardMetric(current: LeaderboardMetric): LeaderboardMetric {
    const index = LEADERBOARD_METRICS.indexOf(current);
    return LEADERBOARD_METRICS[(index + 1) % LEADERBOARD_METRICS.length];
}
