// @spec-source → Data Schema文件（本機端與Server端）.md §二.2 子系統快照結構匯總（DS-04，PROG-2-0498）
/**
 * DataMounts — Root Save 的 `Data.*` 頂層掛載點骨架（純邏輯，不依賴 cc）
 *
 * 規格 §二.2 列出 25 個子系統掛載到 `Data` 底下的頂層路徑。本檔提供：
 *   1. 掛載路徑清單與容器形狀（object / array）
 *   2. 預設骨架：新存檔一次就有全部掛載點，子系統不必各自判斷「欄位不存在」
 *   3. 補齊函式：只補 `undefined` 的掛載點，絕不覆寫玩家已有的資料
 *   4. 遷移步驟：可接進 runSemverMigrations 的 SemverMigrationStep
 *
 * 形狀說明：規格只有部分路徑標註 `[*]` 或給出 JSON 範例，其餘路徑的形狀屬暫定，
 * 會在 `shape` 欄位註明依據。Generals 依規格範例為以 UID 為 key 的物件。
 *
 * Unity 對照：像 ScriptableObject 的預設值，新建存檔時 Inspector 欄位都已有初值；
 * 舊存檔載入時由 Migration 補上缺的欄位，已有的欄位保持不動。
 */
import type { SemverMigrationStep } from './SaveVersion';

export type DataMountShape = 'object' | 'array';

export interface DataMountSpec {
    /** `Data` 底下的頂層 key */
    key: string;
    /** 容器形狀 */
    shape: DataMountShape;
    /** 形狀依據：規格標註 `[*]`、JSON 範例，或「暫定」 */
    basis: string;
}

/** 規格 §二.2 的 25 個頂層掛載點（Generals 為 UID 為 key 的物件，依規格 §二.1 範例） */
export const DATA_MOUNT_SPECS: readonly DataMountSpec[] = [
    { key: 'Generals', shape: 'object', basis: '規格 §二.1 JSON 範例（UID 為 key）' },
    { key: 'Nurture_Sessions', shape: 'array', basis: '規格 §2-2 #22 Nurture_Sessions[*]' },
    { key: 'Bonding_Sessions', shape: 'array', basis: '規格 §2-2 #20 Bonding_Sessions[*]' },
    { key: 'Mentor_Pool', shape: 'array', basis: '規格 §2-2 #21 Mentor_Pool[*]' },
    { key: 'Inventory_Service', shape: 'object', basis: '暫定：統一物件庫投影' },
    { key: 'Talisman_Inventory', shape: 'array', basis: '暫定：虎符清單（Tally_ID 逐筆）' },
    { key: 'Spirit_Card_Collection', shape: 'array', basis: '規格 Data.Spirit_Card_Collection[*]' },
    { key: 'Spirit_Archive_Snapshot', shape: 'array', basis: '暫定：英靈死亡快照逐筆' },
    { key: 'Spirit_Family_State', shape: 'object', basis: '暫定：家族級 read model（以 Spirit_Family_Key 索引）' },
    { key: 'Sortie_Loadout', shape: 'object', basis: '規格 §2-2 #33 單一出征編制' },
    { key: 'Battle_State', shape: 'object', basis: '規格 §2-2 #11–13 單場狀態' },
    { key: 'Scene_Gambit_State', shape: 'object', basis: '規格 §2-2 #14–15 場景戰法狀態' },
    { key: 'Stage_Chain_Progress', shape: 'array', basis: '規格 §2-2 #24–25 Stage_Chain_Progress[*]' },
    { key: 'Player_Economy', shape: 'object', basis: '規格 §2-2 #16–17 單一經濟區塊' },
    { key: 'Tournament_Data', shape: 'object', basis: '規格 §2-2 #18–19 含 Season_History[*]' },
    { key: 'Oracle_History', shape: 'array', basis: '暫定：預言紀錄逐筆' },
    { key: 'Gacha_State', shape: 'object', basis: '規格 §2-2 #26 Gacha_State.*' },
    { key: 'Family_Relations', shape: 'array', basis: '暫定：家族關係逐筆' },
    { key: 'Game_Time', shape: 'object', basis: '規格 Root 範例（Current_Season 等）' },
    { key: 'Governance', shape: 'object', basis: '規格 Root 範例（Territory / Tax_Rate）' },
    { key: 'Lobby_Hub', shape: 'object', basis: '規格 §2-2 #3–4 Lobby_Hub 區塊' },
    { key: 'General_Journal', shape: 'object', basis: '規格 §2-2 #7–10 General_Journal 區塊' },
    { key: 'Rival_Nations', shape: 'object', basis: '規格 Root 範例；§2-2 #5 Rival_Nations[*]（暫定物件）' },
    { key: 'Officer_System', shape: 'object', basis: '規格 Root 範例（Current_Tier 等）' },
    { key: 'NPC_Memory', shape: 'array', basis: '暫定：智慧 NPC 記憶逐筆（General_UID）' },
];

export const DATA_MOUNT_KEYS: readonly string[] = DATA_MOUNT_SPECS.map((spec) => spec.key);

/** 產生一份全新的 Data 骨架：每個掛載點都有對應形狀的空容器 */
export function createDefaultDataMounts(): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    for (const spec of DATA_MOUNT_SPECS) {
        data[spec.key] = spec.shape === 'array' ? [] : {};
    }
    return data;
}

/**
 * 補齊缺少的掛載點，回傳新物件（不修改傳入值）。
 * 只補 `undefined` 的 key：已存在的值（包含 null、空陣列、有資料的物件）一律保留。
 */
export function fillMissingDataMounts(data: Record<string, unknown>): Record<string, unknown> {
    const defaults = createDefaultDataMounts();
    const result: Record<string, unknown> = { ...data };
    for (const key of DATA_MOUNT_KEYS) {
        if (result[key] === undefined) {
            result[key] = defaults[key];
        }
    }
    return result;
}

/** 缺少的掛載點 key 清單，供除錯與測試；已齊全時回傳空陣列 */
export function listMissingDataMounts(data: Record<string, unknown>): string[] {
    return DATA_MOUNT_KEYS.filter((key) => data[key] === undefined);
}

/** Data 區塊缺失時視為空物件，避免 Migration 因舊檔格式不同而拋錯 */
function readDataBlock(record: Record<string, unknown>): Record<string, unknown> {
    const block = record.Data;
    return typeof block === 'object' && block !== null && !Array.isArray(block)
        ? (block as Record<string, unknown>)
        : {};
}

/**
 * 掛載點遷移步驟（1.0.0 → 1.0.1），作用於整份存檔的 `Data` 區塊，其他欄位原樣保留。
 * 注意：此步驟尚未接入 SAVE_VERSION_LATEST；是否提升版號需 PM 裁定（規格要求 Data 欄位增刪即升版）。
 */
export const DATA_MOUNT_MIGRATION_STEP: SemverMigrationStep<Record<string, unknown>> = {
    from: '1.0.0',
    to: '1.0.1',
    migrate: (record) => ({ ...record, Data: fillMissingDataMounts(readDataBlock(record)) }),
};
