-- @spec-source → AI武將強度系統.md §I「Server 端」battle_ai_log（WBS AIS-14）
-- 僅定義、未部署、未執行。
--
-- 每場 AI 戰鬥寫入一列；欄位與 AI 武將強度系統 §I 表一致。
-- 數值範圍與列舉檢查由 server/schema/ai14-row-validators.ts 驗證，DDL 只保留主鍵與型別。
-- player_id 的外鍵待玩家主表定義後再補（repo 內尚無 player 表）。

CREATE TABLE IF NOT EXISTS battle_ai_log (
    battle_ai_log_id     VARCHAR(32)   PRIMARY KEY,
    player_id            VARCHAR(32)   NOT NULL,
    chapter_id           INTEGER       NOT NULL,
    difficulty           VARCHAR(16)   NOT NULL,
    ai_template_id       VARCHAR(32)   NOT NULL,
    ai_power_score       INTEGER       NOT NULL,
    player_power_score   INTEGER       NOT NULL,
    result               VARCHAR(8)    NOT NULL,
    adaptive_scale       DECIMAL(4,2)  NOT NULL,
    turns                INTEGER       NOT NULL,
    created_at           TIMESTAMP     NOT NULL
);
