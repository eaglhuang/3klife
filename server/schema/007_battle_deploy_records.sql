-- @spec-source → 戰場部署系統.md §I「Server 端」（DEP-13，PROG-2-0977）
-- 僅定義、未部署、未執行。
--
-- 每場戰鬥寫入一列；欄位與戰場部署系統 §I 表一致。
-- 數值上下限與主將／參謀官／後勤官不得重覆等規則由 server/schema/dep13-row-validators.ts 驗證，
-- DDL 只保留主鍵與型別。player_id 的外鍵待玩家主表定義後再補（repo 內尚無 player 表）。

CREATE TABLE IF NOT EXISTS battle_deploy_record (
    battle_id            VARCHAR(32) PRIMARY KEY,
    player_id            VARCHAR(32) NOT NULL,
    commander_uid        VARCHAR(32) NOT NULL,
    strategist_uid       VARCHAR(32) NULL,
    deputy_uid           VARCHAR(32) NULL,
    food_spent           INTEGER     NOT NULL,
    sortie_troops_max    INTEGER     NOT NULL,
    troops_lost          INTEGER     NOT NULL,
    troops_returned      INTEGER     NOT NULL,
    food_cap_bonus       INTEGER     NOT NULL,
    tactic_cap_bonus     INTEGER     NOT NULL,
    tactic_start_bonus   INTEGER     NOT NULL,
    elite_cap            SMALLINT    NOT NULL,
    militia_count        INTEGER     NOT NULL,
    elite_count          INTEGER     NOT NULL,
    scene_preset_id      VARCHAR(32) NOT NULL,
    delegate_used        BOOLEAN     NOT NULL DEFAULT FALSE
);
