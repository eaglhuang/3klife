-- 006_aptitude_records.sql（APT-15 / PROG-2-0929）
--
-- 狀態：僅定義，未部署。本檔不連任何資料庫，也不含雲端憑證。
-- 對照：戰場適性系統規格書 §I「Server 端」aptitude 表。
-- 列驗證在 server/schema/apt15-row-validators.ts，修改時兩邊一起改。
-- general_uid 目前沒有武將表（MVP 六表不含），因此不建外來鍵，待武將表定案後再補。

CREATE TABLE aptitude_records (
    aptitude_id     VARCHAR(32) PRIMARY KEY,
    player_id       VARCHAR(32) NOT NULL,
    general_uid     VARCHAR(32) NOT NULL,
    dimension       VARCHAR(8)  NOT NULL CHECK (dimension IN ('TROOP', 'TERRAIN', 'WEATHER')),
    sub_type        VARCHAR(16) NOT NULL,
    grade           CHAR(1)     NOT NULL CHECK (grade IN ('S', 'A', 'B', 'C', 'D')),
    source_gene_id  VARCHAR(32),
    CHECK (
        (dimension = 'TROOP'   AND sub_type IN ('CAVALRY', 'INFANTRY', 'ARCHER', 'SIEGE'))
     OR (dimension = 'TERRAIN' AND sub_type IN ('PLAIN', 'MOUNTAIN', 'WATER', 'FOREST', 'DESERT'))
     OR (dimension = 'WEATHER' AND sub_type IN ('SUNNY', 'RAINY', 'FOG', 'WINDY', 'NIGHT', 'THUNDER'))
    ),
    UNIQUE (general_uid, dimension, sub_type)
);
