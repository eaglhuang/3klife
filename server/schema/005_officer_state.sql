-- @spec-source → 官職系統規格書 §I「Server 端」（OFC-10，PROG-2-0808）
-- 僅定義、未部署、未執行。
--
-- 階位代碼（OFFICER_TIER_1~5）與經驗門檻由 server/schema/ofc10-officer-row.ts 驗證，
-- 門檻可由設計 config 調整，不寫死在 DDL 的 CHECK 裡。
-- persist_across_era_shift 依 F-3 天下大亂保留規則固定為 TRUE，由驗證函式把關。

CREATE TABLE IF NOT EXISTS player_officer_state (
    player_id                VARCHAR(32) PRIMARY KEY,
    officer_tier             VARCHAR(32) NOT NULL,
    officer_exp              INTEGER     NOT NULL CHECK (officer_exp >= 0),
    unlock_history_json      JSON        NOT NULL,
    persist_across_era_shift BOOLEAN     NOT NULL DEFAULT TRUE
);
