// @spec-source → 同步API規格書.md §3 /sync/delta、§5 錯誤碼 E002、§7 步驟 5（JSON Pointer 路徑白名單）；SYNC-06（PROG-2-1396）
/**
 * sync06-patch-whitelist — /sync/delta 的 JSON Patch 路徑白名單（純 TS，不連資料庫）
 *
 * 規則：
 *   - op 只接受 add／remove／replace（非 RFC 6902 或其他 op 回 E002）。
 *   - path 必須是 JSON Pointer 且指向存檔的頂層欄位（不接受空字串的整份覆寫）。
 *   - 頂層欄位必須在 SYNC_PATCH_ROOT_KEYS 內；其餘一律拒絕。
 *   - 任何一段路徑是 __proto__／constructor／prototype 一律拒絕（防原型污染）。
 *
 * 暫定（規格沒寫白名單內容，可逆）：
 *   - 白名單取自客戶端存檔快照 PlayerSaveSnapshot 的頂層欄位，由 tests/ServerSchemaSync06.test.ts
 *     對照 assets/scripts/core/services/PlayerSaveService.ts 的實際定義，欄位增減時測試會失敗提醒。
 *
 * Unity 對照：像伺服器端的 Save 欄位白名單，客戶端只能改 Schema 允許的欄位，其他欄位就算送來也不寫入。
 */

/** PlayerSaveSnapshot 的 79 個頂層欄位（與客戶端存檔定義同步）。 */
export const SYNC_PATCH_ROOT_KEYS: readonly string[] = [
    'schemaVersion',
    'saveVersion',
    'randomState',
    'savedAt',
    'gameTime',
    'roster',
    'nurture',
    'deck',
    'leadGeneralId',
    'discoveryLevel',
    'discoveryExp',
    'inventory',
    'oracleCount',
    'military',
    'prison',
    'clearedStageIds',
    'favoriteGeneralIds',
    'hallAssignments',
    'dynamicRelations',
    'relationEventKeys',
    'npcPlayerId',
    'npcMemory',
    'legacyCount',
    'legendaryMentoringUsedIds',
    'officerState',
    'sandtableMarkersPlaced',
    'sandtableMarkerTerritories',
    'governanceAssignments',
    'autoGovernance',
    'magistrateUid',
    'territories',
    'journalEntries',
    'territoryLevel',
    'territoryUpgradePending',
    'farewellLetters',
    'loginStreak',
    'sevenDayJourney',
    'dailySubsidy',
    'monthlyCard',
    'playerLogs',
    'dailyNews',
    'morningReport',
    'generalDispatch',
    'offlineBattleSnapshots',
    'tournament',
    'wishPool',
    'offlineInteractionLog',
    'sandtableUnlockHistory',
    'startingTalisman',
    'familySystemUnlocked',
    'openingPhase',
    'enrollGrantDay',
    'itemAcquisitionLog',
    'aiAdaptiveStreak',
    'gachaMentorJournal',
    'hallAssignLog',
    'tallyLoyalty',
    'tallyHoldings',
    'tallyCards',
    'inventoryRecords',
    'femaleSources',
    'pendingLifespanDeaths',
    'yearAgingEvents',
    'gachaPity',
    'gachaWallet',
    'resources',
    'domestic',
    'rivals',
    'mercenaries',
    'femaleSystem',
    'onboarding',
    'openingLetter',
    'bondPoints',
    'friendBorrowLedger',
    'soulFragments',
    'travelCountdown',
    'countdown',
    'sortiePresets',
    'breedingBirthRecords',
];

const ROOT_KEY_SET = new Set(SYNC_PATCH_ROOT_KEYS);
const FORBIDDEN_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);
const PATCH_OPS = new Set(['add', 'remove', 'replace']);

/** 解碼 JSON Pointer 的段（先 ~1 再 ~0，符合 RFC 6901）。 */
export function decodeSyncPointerSegments(path: string): string[] {
    return path.slice(1).split('/').map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'));
}

/** 回傳第一個不合規 patch 的說明；全部合規回傳 null。 */
export function validateSyncPatchPaths(patches: readonly unknown[]): string | null {
    for (let index = 0; index < patches.length; index++) {
        const patch = patches[index] as { op?: unknown; path?: unknown } | null;
        if (patch === null || typeof patch !== 'object') return `Patch #${index} is not an object.`;
        if (typeof patch.op !== 'string' || !PATCH_OPS.has(patch.op)) return `Patch #${index} has unsupported op.`;
        if (typeof patch.path !== 'string' || !patch.path.startsWith('/')) {
            return `Patch #${index} path must be a JSON Pointer to a save field.`;
        }
        const segments = decodeSyncPointerSegments(patch.path);
        if (!ROOT_KEY_SET.has(segments[0])) return `Patch #${index} path is outside the save whitelist.`;
        if (segments.some((segment) => FORBIDDEN_SEGMENTS.has(segment))) {
            return `Patch #${index} path contains a forbidden segment.`;
        }
    }
    return null;
}
