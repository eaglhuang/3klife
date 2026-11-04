// @spec-source → 熱更新與版本控制規格書.md (doc_tech_0012) §二.1 版本比對與本機遷移流程（PROG-2-1720）
/**
 * PlayerSaveMigrations — 玩家存檔的遷移步驟登錄表與讀檔遷移入口（純邏輯，不依賴 cc）
 *
 * 規格 §二.1：讀檔發現 Save_Version 過舊時，依序往上執行各版的 Migration，
 * 全部完成後把 Save_Version 標成最新。之後新增欄位或改結構時，在 PLAYER_SAVE_MIGRATIONS
 * 加一步並提升 SAVE_VERSION_LATEST，讀檔就會自動升級舊存檔。
 *
 * Unity 對照：像 FormerlySerializedAs + 自訂 ISerializationCallbackReceiver，
 * 舊資料在反序列化前先整理成新結構。
 */
import { runSemverMigrations, SAVE_VERSION_LATEST, SaveVersionString, SemverMigrationStep } from './SaveVersion';

/** 依版號由舊到新排列的遷移步驟；目前最新版為 1.0.0，尚無步驟 */
export const PLAYER_SAVE_MIGRATIONS: readonly SemverMigrationStep<Record<string, unknown>>[] = [];

/**
 * 讀檔前把原始存檔升級到 latest，回傳已蓋上新版號的資料。
 * 版號等於或新於 latest 時原樣回傳（不降版）；缺少可接的步驟時拋錯，交給讀檔的備份回復流程處理。
 */
export function migratePlayerSaveRaw(
    raw: Record<string, unknown>,
    steps: readonly SemverMigrationStep<Record<string, unknown>>[] = PLAYER_SAVE_MIGRATIONS,
    latest: SaveVersionString = SAVE_VERSION_LATEST,
): Record<string, unknown> {
    return runSemverMigrations(raw, steps, latest).data;
}
