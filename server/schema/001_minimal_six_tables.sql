-- 001_minimal_six_tables.sql（MVP-12 / PROG-2-0854）
--
-- 狀態：僅定義，未部署。本檔不連任何資料庫，也不含雲端憑證。
-- 目標：MVP 最小六表 generals／gene_dictionary／nurture_sessions／mercenaries／player_resources／gacha_history。
-- 欄位型別以 PostgreSQL 為準。列舉值與客端 MercenaryBond／MercenaryUpkeep 同步。
-- 對照的列驗證在 server/schema/mvp12-row-validators.ts，兩者需一起修改。

CREATE TABLE generals (
    id            VARCHAR(16)  PRIMARY KEY,
    template_id   VARCHAR(64)  NOT NULL UNIQUE,
    bloodline_id  VARCHAR(64)  NOT NULL,
    vitality      INTEGER      NOT NULL CHECK (vitality >= 0),
    vitality_max  INTEGER      NOT NULL CHECK (vitality_max > 0),
    role          VARCHAR(32)  NOT NULL,
    status        VARCHAR(16)  NOT NULL CHECK (status IN ('Active', 'Training', 'Retired', 'Dead')),
    CHECK (vitality <= vitality_max)
);

CREATE TABLE gene_dictionary (
    id            VARCHAR(64)  PRIMARY KEY,
    display_name  VARCHAR(64)  NOT NULL,
    color         VARCHAR(16)  NOT NULL,
    category      VARCHAR(32),
    max_level     INTEGER      NOT NULL CHECK (max_level > 0)
);

CREATE TABLE nurture_sessions (
    id                VARCHAR(32)  PRIMARY KEY,
    general_id        VARCHAR(16)  NOT NULL REFERENCES generals (id),
    mentor_id         VARCHAR(32),
    current_round     INTEGER      NOT NULL CHECK (current_round BETWEEN 1 AND 36),
    tp_accumulated    INTEGER      NOT NULL DEFAULT 0 CHECK (tp_accumulated >= 0),
    status            VARCHAR(16)  NOT NULL
);

CREATE TABLE mercenaries (
    id              VARCHAR(32)  PRIMARY KEY,
    player_id       VARCHAR(32)  NOT NULL,
    bond_status     VARCHAR(16)  NOT NULL CHECK (bond_status IN ('Trial', 'Bonded', 'Expired')),
    days_left       INTEGER      NOT NULL CHECK (days_left >= 0),
    upkeep_status   VARCHAR(16)  NOT NULL CHECK (upkeep_status IN ('Active', 'Frozen', 'Departed'))
);

CREATE TABLE player_resources (
    player_id      VARCHAR(32)  PRIMARY KEY,
    food           INTEGER      NOT NULL DEFAULT 0 CHECK (food >= 0),
    gold           INTEGER      NOT NULL DEFAULT 0 CHECK (gold >= 0),
    troop_source   INTEGER      NOT NULL DEFAULT 0 CHECK (troop_source >= 0),
    fame           INTEGER      NOT NULL DEFAULT 0 CHECK (fame >= 0),
    essence        INTEGER      NOT NULL DEFAULT 0 CHECK (essence >= 0),
    bond_points    INTEGER      NOT NULL DEFAULT 0 CHECK (bond_points >= 0)
);

CREATE TABLE gacha_history (
    id          BIGSERIAL    PRIMARY KEY,
    player_id   VARCHAR(32)  NOT NULL,
    pull_seq    INTEGER      NOT NULL CHECK (pull_seq >= 1),
    pool        VARCHAR(32)  NOT NULL,
    result      VARCHAR(64)  NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (player_id, pull_seq)
);
