-- @spec-source → 因子解鎖系統規格書 §I「Server 端」（FUL-06，PROG-2-0856）
-- 僅定義、未部署、未執行。
--
-- 階段與等級的對應（Phase 1: Lv1~20、Phase 2: Lv21~45、Phase 3: Lv46+）
-- 由 server/schema/ful06-unlock-phase.ts 的 phaseForLevel 負責，
-- 因為門檻可由設計 config 調整，不寫死在 DDL 的 CHECK 裡；
-- 寫入前須以該驗證函式確認 unlock_phase 與 player_level 一致。

CREATE TABLE IF NOT EXISTS player_unlock_state (
    player_id     VARCHAR(32) PRIMARY KEY,
    player_level  INTEGER     NOT NULL CHECK (player_level >= 1),
    unlock_phase  SMALLINT    NOT NULL CHECK (unlock_phase BETWEEN 1 AND 3)
);
