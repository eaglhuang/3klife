// @spec-source → 留存系統.md §I「Server 端」；RET-13（PROG-2-2110）
/**
 * ret13-retention-stats-row — 伺服端留存統計列的欄位、驗證與「只增不減」合併（純 TS，不連資料庫）
 *
 * 欄位對應 player_retention_stats（011_retention_stats.sql）：
 * Player_ID / Total_Illustrations / Legacy_Count / Last_Login / Consecutive_Days / Daily_News_Count。
 *
 * 暫定（規格只列欄位，沒寫更新規則，可逆）：
 * - 三個累計欄位（插畫數、世代成就次數、日報累計數）只增不減：同步合併時取較大值，避免舊裝置的舊存檔蓋掉進度。
 * - Last_Login 與 Consecutive_Days 取較新那筆的值（一起取，不拆開）。
 * - Last_Login 超前伺服端時間 5 分鐘以上視為時鐘異常，驗證不過。
 *
 * Unity 對照：像 ScriptableObject 的 OnValidate，加上雲端存檔「取較新／較大」的合併。
 */

export interface RetentionStatsRow {
    player_id: string;
    total_illustrations: number;
    legacy_count: number;
    last_login: string;
    consecutive_days: number;
    daily_news_count: number;
}

export type RetentionStatsRowIssue = { path: string; message: string };

const ID_MAX = 32;
const INT_MAX = 2147483647;
/** Last_Login 可超前伺服端時間的容差（防時鐘回撥） */
export const RETENTION_LOGIN_FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

const COUNTER_KEYS = ['total_illustrations', 'legacy_count', 'consecutive_days', 'daily_news_count'] as const;

function isNonNegativeInt(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= INT_MAX;
}

/** 列驗證：ID 長度、四個計數為非負整數、Last_Login 可解析；給 serverNowMs 時另擋超前容差。 */
export function validateRetentionStatsRow(row: RetentionStatsRow, serverNowMs?: number): RetentionStatsRowIssue[] {
    const issues: RetentionStatsRowIssue[] = [];

    if (typeof row.player_id !== 'string' || row.player_id.length === 0 || row.player_id.length > ID_MAX) {
        issues.push({ path: 'player_id', message: `必須為 1~${ID_MAX} 字元` });
    }

    for (const key of COUNTER_KEYS) {
        if (!isNonNegativeInt(row[key])) issues.push({ path: key, message: '必須為 0 以上的整數' });
    }

    if (typeof row.last_login !== 'string' || Number.isNaN(Date.parse(row.last_login))) {
        issues.push({ path: 'last_login', message: '必須為可解析的時間字串' });
    } else if (serverNowMs !== undefined && Date.parse(row.last_login) > serverNowMs + RETENTION_LOGIN_FUTURE_TOLERANCE_MS) {
        issues.push({ path: 'last_login', message: '不可超前伺服端時間 5 分鐘以上' });
    }

    return issues;
}

/** 客端存檔來的統計值；壞值（負數、非整數、NaN）一律視為 0 */
export interface RetentionStatsInput {
    playerId: string;
    totalIllustrations?: number;
    legacyCount?: number;
    lastLogin: string;
    consecutiveDays?: number;
    dailyNewsCount?: number;
}

function clean(value: number | undefined): number {
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.min(INT_MAX, Math.floor(value)) : 0;
}

/** 由客端統計值組成一列（壞值歸 0，不丟錯；是否合法交給 validateRetentionStatsRow） */
export function buildRetentionStatsRow(input: RetentionStatsInput): RetentionStatsRow {
    return {
        player_id: input.playerId,
        total_illustrations: clean(input.totalIllustrations),
        legacy_count: clean(input.legacyCount),
        last_login: input.lastLogin,
        consecutive_days: clean(input.consecutiveDays),
        daily_news_count: clean(input.dailyNewsCount),
    };
}

/**
 * 合併伺服端既有列與新送來的列（同一玩家）：累計欄位取較大值；Last_Login 與 Consecutive_Days 取較新那筆。
 * 時間相同時以新列為準。兩列玩家不同時丟錯。
 */
export function mergeRetentionStatsRows(existing: RetentionStatsRow, incoming: RetentionStatsRow): RetentionStatsRow {
    if (existing.player_id !== incoming.player_id) {
        throw new Error(`[retention-stats] 不能合併不同玩家：${existing.player_id} / ${incoming.player_id}`);
    }
    const incomingNewer = Date.parse(incoming.last_login) >= Date.parse(existing.last_login);
    const latest = incomingNewer ? incoming : existing;
    return {
        player_id: existing.player_id,
        total_illustrations: Math.max(existing.total_illustrations, incoming.total_illustrations),
        legacy_count: Math.max(existing.legacy_count, incoming.legacy_count),
        last_login: latest.last_login,
        consecutive_days: latest.consecutive_days,
        daily_news_count: Math.max(existing.daily_news_count, incoming.daily_news_count),
    };
}

/** 給記憶體表用的驗證器：支援 Partial（更新時合併後再驗證），只回傳訊息字串 */
export function retentionStatsValidator(row: Partial<RetentionStatsRow>): string[] {
    return validateRetentionStatsRow(row as RetentionStatsRow).map((issue) => `${issue.path}：${issue.message}`);
}
