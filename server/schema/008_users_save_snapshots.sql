-- @spec-source → Data Schema文件（本機端與Server端）§一「users」「save_snapshots」（DS-13，PROG-2-1030）
-- 僅定義、未部署、未執行。
--
-- 欄位與規格表一致；列驗證由 server/schema/save-snapshot-row-validators.ts 負責，
-- DDL 只保留主鍵、外鍵與型別。
-- 暫定（規格未寫明，可逆）：save_snapshots 以 Player_ID 為主鍵，每位玩家只保留最新一份快照。

CREATE TABLE IF NOT EXISTS users (
    Player_ID    VARCHAR(32) PRIMARY KEY,
    Account      VARCHAR(64) NOT NULL,
    Created_At   TIMESTAMP   NOT NULL
);

CREATE TABLE IF NOT EXISTS save_snapshots (
    Player_ID        VARCHAR(32) PRIMARY KEY REFERENCES users (Player_ID),
    Save_Version     VARCHAR(16) NOT NULL,
    Save_Data_JSON   LONGTEXT    NOT NULL,
    Last_Sync_Hash   VARCHAR(64) NOT NULL,
    Session_Secret   VARCHAR(64) NOT NULL,
    Updated_At       TIMESTAMP   NOT NULL
);
