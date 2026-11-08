-- @spec-source → 領地治理系統.md §I「Server 端」（GOV-13，PROG-2-2111）
-- 僅定義、未部署、未執行。
--
-- territory_level 的範圍與 season_output_json 的內容格式由
-- server/schema/gov13-governance-row.ts 驗證；本 DDL 只保留欄位型別、主鍵與基本檢查。

CREATE TABLE IF NOT EXISTS player_governance_state (
    player_id          VARCHAR(32) PRIMARY KEY,
    territory_level    INTEGER     NOT NULL DEFAULT 1 CHECK (territory_level >= 1),
    auto_mode          BOOLEAN     NOT NULL DEFAULT FALSE,
    season_output_json TEXT        NOT NULL DEFAULT '[]'
);
