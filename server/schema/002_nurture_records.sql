-- 002_nurture_records.sql（NUR-15 / PROG-2-0855）
--
-- 狀態：僅定義，未部署。本檔不連任何資料庫，也不含雲端憑證。
-- 對照：培育系統規格書 shard-c「Server 端 — 培育紀錄表」。
-- 列驗證在 server/schema/nur15-row-validators.ts，修改時兩邊一起改。
-- 子嗣 Child_UID 目前沒有子嗣表（MVP 六表不含），因此不建外來鍵，待子嗣表定案後再補。

CREATE TABLE nurture_records (
    session_id                VARCHAR(16)  PRIMARY KEY,
    child_uid                 VARCHAR(16)  NOT NULL,
    start_season              INTEGER      NOT NULL CHECK (start_season >= 0),
    end_season                INTEGER      NOT NULL,
    mentor_id                 VARCHAR(16),
    revelation_level          SMALLINT     NOT NULL CHECK (revelation_level BETWEEN 0 AND 3),
    phase_block_history_json  TEXT         NOT NULL,
    mentoring_mode_log_json   TEXT         NOT NULL,
    reveal_log_json           TEXT         NOT NULL,
    final_stats_json          TEXT         NOT NULL,
    graduation_tags_json      TEXT         NOT NULL,
    rating                    CHAR(1)      NOT NULL CHECK (rating IN ('S', 'A', 'B', 'C')),
    tp_total                  INTEGER      NOT NULL CHECK (tp_total >= 0),
    CHECK (end_season >= start_season)
);
