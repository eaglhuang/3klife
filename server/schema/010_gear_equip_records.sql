-- @spec-source → 武將背包（倉庫）系統.md §「Server 端」（BAG-11，PROG-2-1395）
-- 僅定義、未部署、未執行。
--
-- slot_type 的合法代碼與「general_uid NULL 必為 WAREHOUSE」等列規則由
-- server/schema/bag11-equip-row.ts 驗證；本 DDL 只保留欄位型別與主鍵／外鍵。

CREATE TABLE IF NOT EXISTS player_gear_equip_records (
    equip_id     VARCHAR(32)  PRIMARY KEY,
    player_id    VARCHAR(32)  NOT NULL,
    general_uid  VARCHAR(32)  NULL,
    item_id      VARCHAR(32)  NOT NULL,
    slot_type    VARCHAR(16)  NOT NULL,
    count        INTEGER      NOT NULL CHECK (count >= 1),
    is_locked    BOOLEAN      NOT NULL DEFAULT FALSE,
    acquired_at  TIMESTAMP    NOT NULL
);
