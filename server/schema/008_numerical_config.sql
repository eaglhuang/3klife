-- @spec-source → 數值系統.md §I「Server 端」（NUM-17，PROG-2-0935）
-- 僅定義、未部署、未執行。
--
-- 每列是一個數值配置鍵；version 用於客戶端熱更新比對（版本較新才套用）。
-- 數值範圍、鍵名格式與版本規則由 server/schema/num17-config-row.ts 驗證，DDL 只保留型別與主鍵。

CREATE TABLE IF NOT EXISTS numerical_config (
    config_id     VARCHAR(32)   PRIMARY KEY,
    config_key    VARCHAR(64)   NOT NULL,
    config_value  DECIMAL(10,4) NOT NULL,
    category      VARCHAR(16)   NOT NULL,
    description   TEXT          NOT NULL,
    updated_at    DATETIME      NOT NULL,
    version       INTEGER       NOT NULL
);
