-- @spec-source → 留存系統.md §I「Server 端」（RET-13，PROG-2-2110）
-- 僅定義、未部署、未執行。
--
-- 欄位範圍與列規則（非負整數、時間格式）由 server/schema/ret13-retention-stats-row.ts 驗證；
-- 本 DDL 只保留欄位型別、主鍵與非負檢查。

CREATE TABLE IF NOT EXISTS player_retention_stats (
    player_id           VARCHAR(32) PRIMARY KEY,
    total_illustrations INTEGER     NOT NULL DEFAULT 0 CHECK (total_illustrations >= 0),
    legacy_count        INTEGER     NOT NULL DEFAULT 0 CHECK (legacy_count >= 0),
    last_login          TIMESTAMP   NOT NULL,
    consecutive_days    INTEGER     NOT NULL DEFAULT 0 CHECK (consecutive_days >= 0),
    daily_news_count    INTEGER     NOT NULL DEFAULT 0 CHECK (daily_news_count >= 0)
);
