// @spec-source → 武將日誌與離線互動系統.md §F-3 離線互動事件觸發；WBS v16.2 JRN-04（PROG-2-0984）
/**
 * OfflineInteractionTrigger — 離線互動事件的觸發條件與每登入窗去重（純邏輯，不依賴 cc）。
 *
 * - 離線滿 4 小時、未讀晨報少於 3 則、有衝突標籤、且未被離線互動鎖定時才觸發。
 * - 同一對角色在同一登入窗內只保留 1 則主互動；紀錄以 key 表示，不改輸入。
 *
 * Unity 對照：像一個冷卻計時器加上「每個 Session 每組對象只能彈一次」的 HashSet 檢查。
 */

export const OFFLINE_INTERACTION_MIN_HOURS = 4;
export const OFFLINE_MORNING_REPORT_LIMIT = 3;
export const OFFLINE_INTERACTION_LOCK = 'OFFLINE_INTERACTION_LOCK';

export interface OfflineContext {
    offlineHours: number;
    unreadMorningReport: number;
    activeConflictTags: readonly string[];
    cooldowns: readonly string[];
}

/** 規格 F-3 的觸發條件；任一不符即不觸發。 */
export function shouldTriggerOfflineInteraction(context: OfflineContext): boolean {
    return context.offlineHours >= OFFLINE_INTERACTION_MIN_HOURS
        && context.unreadMorningReport < OFFLINE_MORNING_REPORT_LIMIT
        && context.activeConflictTags.length > 0
        && !context.cooldowns.includes(OFFLINE_INTERACTION_LOCK);
}

/** 同一登入窗、同一對角色的紀錄 key；兩位武將的順序不影響結果。 */
export function offlineInteractionKey(windowId: string, generalA: string, generalB: string): string {
    const [first, second] = generalA <= generalB ? [generalA, generalB] : [generalB, generalA];
    return `${windowId}|${first}|${second}`;
}

/** 這一組角色在此登入窗內是否還能再排一則主互動。 */
export function canStartOfflineInteraction(log: readonly string[], key: string): boolean {
    return !log.includes(key);
}

/** 記錄一則主互動；已存在時回傳副本、不重複加入。不改輸入。 */
export function recordOfflineInteraction(log: readonly string[], key: string): string[] {
    return canStartOfflineInteraction(log, key) ? [...log, key] : [...log];
}
