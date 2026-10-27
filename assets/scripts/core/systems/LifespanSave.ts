// @spec-source → 領地治理系統.md §I Governance.Assignments；武將日誌與離線互動系統.md §I General_Journal.Journal_Entries；PROG-2-0975（存檔接線）
/**
 * LifespanSave — 領地治理（指派、領地、日誌）的讀檔校正（純邏輯，不依賴 cc）。
 *
 * - 讀檔時不合法的條目直接丟棄，不讓壞資料進入遊戲；沒有這些欄位的舊檔回到預設值。
 * - 日誌條目用 appendJournalEntry 逐筆驗證，與寫入時的規則完全一致。
 *
 * Unity 對照：像 JsonUtility 讀檔後的 OnValidate，壞欄位丟掉、其餘照常載入。
 */
import { isDomesticTaskId } from './DomesticTasks';
import { GovernanceAssignment } from './GovernanceAssignment';
import { KeepTerritory } from './HereditaryKeep';
import { appendJournalEntry, createEmptyJournal, JournalEntry } from './JournalLog';
import { TERRITORY_MAX_LEVEL } from './TerritoryUpgrade';
import { appendFarewellLetter, FarewellLetter, FarewellTier } from './FarewellLetterInbox';

/** 告別信收件匣（PROG-2-0985）：逐筆檢查欄位，壞資料丟棄；同 ID 只留第一筆。 */
export function normalizeFarewellLetters(raw: unknown): FarewellLetter[] {
    if (!Array.isArray(raw)) return [];
    let inbox: FarewellLetter[] = [];
    for (const item of raw) {
        if (!isRecord(item)) continue;
        const { id, uid, generalName, affection, tier, body, day, read } = item;
        if (!isNonEmptyString(id) || !isNonEmptyString(uid) || typeof generalName !== 'string') continue;
        if (typeof affection !== 'number' || !Number.isInteger(affection) || affection < 0) continue;
        if (tier !== 'normal' && tier !== 'moving') continue;
        if (typeof body !== 'string' || !Number.isInteger(day) || (day as number) < 0 || typeof read !== 'boolean') continue;
        inbox = appendFarewellLetter(inbox, { id, uid, generalName, affection, tier: tier as FarewellTier, body, day: day as number, read });
    }
    return inbox;
}

/** 主城領地 id（暫定：規格未給固定 id，待領地資料定案後改由資料檔提供）。 */
export const HOME_TERRITORY_ID = 'home-city';

/** 預設領地清單：只有主城。 */
export function defaultKeepTerritories(): KeepTerritory[] {
    return [{ id: HOME_TERRITORY_ID, isHome: true }];
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0;
}

/** 太守府等級（PROG-2-0983）：只認 1 至上限的整數，其餘回到 Lv1。 */
export function normalizeTerritoryLevel(raw: unknown): number {
    return typeof raw === 'number' && Number.isInteger(raw) && raw >= 1 && raw <= TERRITORY_MAX_LEVEL ? raw : 1;
}

/** 待生效的升級目標（PROG-2-0983）：只認 2 至上限的整數，其餘視為沒有待生效升級。 */
export function normalizePendingTerritoryLevel(raw: unknown): number | undefined {
    return typeof raw === 'number' && Number.isInteger(raw) && raw >= 2 && raw <= TERRITORY_MAX_LEVEL ? raw : undefined;
}

/** 指派清單：任務必須是五大內政之一，武將 ID 非空；同一任務格或同一武將只留第一筆。 */
export function normalizeGovernanceAssignments(raw: unknown): GovernanceAssignment[] {
    if (!Array.isArray(raw)) return [];
    const tasks = new Set<string>();
    const generals = new Set<string>();
    const out: GovernanceAssignment[] = [];
    for (const item of raw) {
        if (!isRecord(item)) continue;
        const { task, generalUid } = item;
        if (typeof task !== 'string' || !isDomesticTaskId(task)) continue;
        if (!isNonEmptyString(generalUid)) continue;
        if (tasks.has(task) || generals.has(generalUid)) continue;
        tasks.add(task);
        generals.add(generalUid);
        out.push({ task, generalUid });
    }
    return out;
}

/** 領地清單：ID 非空且不重複；只保留第一個主城。沒有合法主城時回傳預設清單，保證玩家至少有主城。 */
export function normalizeKeepTerritories(raw: unknown): KeepTerritory[] {
    if (!Array.isArray(raw)) return defaultKeepTerritories();
    const ids = new Set<string>();
    let hasHome = false;
    const out: KeepTerritory[] = [];
    for (const item of raw) {
        if (!isRecord(item)) continue;
        const { id, isHome } = item;
        if (!isNonEmptyString(id) || typeof isHome !== 'boolean') continue;
        if (ids.has(id)) continue;
        if (isHome && hasHome) continue;
        ids.add(id);
        if (isHome) hasHome = true;
        out.push({ id, isHome });
    }
    return hasHome ? out : defaultKeepTerritories();
}

/** 日誌條目：逐筆套用寫入時的驗證規則，不合法或 ID 重複的條目丟棄。 */
export function normalizeJournalEntries(raw: unknown): JournalEntry[] {
    if (!Array.isArray(raw)) return [];
    let state = createEmptyJournal();
    for (const item of raw) {
        if (!isRecord(item)) continue;
        const result = appendJournalEntry(state, item as unknown as Parameters<typeof appendJournalEntry>[1]);
        if (result.ok) state = result.state;
    }
    return state.entries;
}
