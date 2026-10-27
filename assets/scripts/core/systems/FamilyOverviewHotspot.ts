// @spec-source → WBS v16.3 HALL-12（世家總覽熱點與世家入口捷徑）；系統規格書：大廳系統 §E-10、英靈世家系統 Data Schema Spirit_Family_State
/**
 * FamilyOverviewHotspot — 世家總覽熱點與分支捷徑的顯示規則與分組（純邏輯，不依賴 cc）。
 *
 * - 世家系統未解鎖時熱點隱藏（規格 §E-10 第 5 點）。
 * - 世家總覽以家族為主分組，每組至少有家族名、主卡、家族深度與名聲（規格 §E-10 第 2 點）。
 * - 武將的「世家入口」捷徑只在該武將已形成分支時顯示（規格 §E-10 第 3 點）。
 *
 * Unity 對照：像 Scroll View 的資料源。先在這裡排好每一列，View 只負責實例化格子，不自己排序。
 */

/** Data.Spirit_Family_State 的家族級 read model 欄位（與 Data Schema 一致）。 */
export interface SpiritFamilyStateRow {
    Spirit_Family_Key: string;
    Family_Fame: number;
    Family_Depth: number;
    Active_Main_Spirit_UID: string | null;
}

/** 世家總覽的一列：家族名由呼叫端提供（read model 只存 key）。 */
export interface FamilyOverviewGroup {
    familyKey: string;
    familyName: string;
    mainSpiritUid: string | null;
    depth: number;
    fame: number;
}

/** 世家系統未解鎖時整個熱點隱藏；解鎖後顯示，即使沒有家族也顯示空狀態。 */
export function familyOverviewHotspotVisible(familySystemUnlocked: boolean): boolean {
    return familySystemUnlocked;
}

/** 武將的世家入口捷徑：只在該武將已形成世家分支時顯示。 */
export function branchShortcutVisible(branchFormed: boolean): boolean {
    return branchFormed;
}

/**
 * 依家族深度（高到低）、名聲（高到低）排序，同分時依 key 排序保證穩定。
 * 不改輸入；家族名由 nameOf 提供，查不到時退回 key。
 */
export function buildFamilyOverviewGroups(
    rows: readonly SpiritFamilyStateRow[],
    nameOf: (familyKey: string) => string | undefined,
): FamilyOverviewGroup[] {
    return rows
        .map((row) => ({
            familyKey: row.Spirit_Family_Key,
            familyName: nameOf(row.Spirit_Family_Key) ?? row.Spirit_Family_Key,
            mainSpiritUid: row.Active_Main_Spirit_UID,
            depth: row.Family_Depth,
            fame: row.Family_Fame,
        }))
        .sort((a, b) => b.depth - a.depth || b.fame - a.fame || (a.familyKey < b.familyKey ? -1 : a.familyKey > b.familyKey ? 1 : 0));
}
