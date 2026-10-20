-- @spec-source → 可結緣女性來源系統.md §I Server 端（source_log）；FEM-10（PROG-2-0542）
--
-- 狀態：僅定義，未部署。本檔不連任何資料庫，也不含雲端憑證。
-- 列驗證在 server/schema/fem10-row-validators.ts，修改時兩邊一起改。
-- player_id、general_uid 目前沒有對應的表（玩家表、武將 UID 表尚未定案），因此不建外來鍵，待表定案後再補。

CREATE TABLE female_source_log (
    source_log_id   VARCHAR(32)  PRIMARY KEY,
    player_id       VARCHAR(32)  NOT NULL,
    general_uid     VARCHAR(32)  NOT NULL,
    source_type     VARCHAR(16)  NOT NULL CHECK (source_type IN ('GACHA', 'MERCENARY', 'CAPTIVE', 'DUNGEON', 'OFFSPRING')),
    quality         VARCHAR(4)   NOT NULL CHECK (quality IN ('SSR', 'SR', 'R', 'N')),
    acquired_at     TIMESTAMP    NOT NULL,
    cost_item       VARCHAR(32)  NOT NULL,
    cost_amount     INTEGER      NOT NULL CHECK (cost_amount >= 0)
);
