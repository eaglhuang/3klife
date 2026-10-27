// @spec-source → Data Schema文件（本機端與Server端）§2-3、§2-3a NPC_Memory 最小 read model；PROG-2-1027
/**
 * NpcMemoryReadModel — 本機 NPC_Memory 最小 read model（純邏輯，不依賴 cc）。
 *
 * - MVP 只保存 Recall_Context 與 Template_Slot_Values；Recent_Context、Pending_Unknown_Events 留到第二階段。
 * - Player_ID 綁定：讀入時 Player_ID 必須與目前玩家一致，否則視為他人記憶，回傳 null。
 * - Recall_Context 有上限，超過時丟掉最舊的一筆；陣列尾端為最新。
 *
 * Unity 對照：像 PlayerPrefs 的 key 前綴綁定玩家帳號，換人登入就讀不到上一位的資料，
 * 而且快取有固定大小，塞滿就淘汰最舊的。
 */

export const NPC_MEMORY_DB_PATH = 'save/npc_memory.db';
export const NPC_MEMORY_BRAIN_PROFILE = 'offline-template';
export const NPC_MEMORY_PERSONA_VERSION = 'npc-persona-v1';
export const RECALL_CONTEXT_LIMIT = 20;
export const RECALL_SNIPPET_MAX_LENGTH = 180;

export interface RecallEntry {
    General_UID: string;
    Vector_ID: string;
    Snippet: string;
    Last_Met: string;
}

export interface NpcMemoryRecord {
    Player_ID: string;
    SQLite_Vec_DB_Path: string;
    Brain_Service_Profile: string;
    Persona_Card_Version: string;
    Recall_Context: RecallEntry[];
    Template_Slot_Values: Record<string, string>;
}

/** 建立空的 NPC 記憶；Player_ID 為空時回傳 null。 */
export function createNpcMemory(playerId: string): NpcMemoryRecord | null {
    const id = playerId.trim();
    if (id.length === 0) return null;
    return {
        Player_ID: id,
        SQLite_Vec_DB_Path: NPC_MEMORY_DB_PATH,
        Brain_Service_Profile: NPC_MEMORY_BRAIN_PROFILE,
        Persona_Card_Version: NPC_MEMORY_PERSONA_VERSION,
        Recall_Context: [],
        Template_Slot_Values: {},
    };
}

/** 寫入一筆回憶：同一 Vector_ID 會先移除舊的再放到尾端；超過上限丟最舊。回傳新物件，不改原值。 */
export function appendRecallContext(record: NpcMemoryRecord, entry: RecallEntry): NpcMemoryRecord {
    const clean = sanitizeRecallEntry(entry);
    if (clean === null) return copyRecord(record);
    const kept = record.Recall_Context.filter((item) => item.Vector_ID !== clean.Vector_ID);
    const next = [...kept, clean].slice(-RECALL_CONTEXT_LIMIT);
    return { ...copyRecord(record), Recall_Context: next };
}

/** 讀取某位武將的回憶，最新的在前，供離線模板選句使用。 */
export function recallForGeneral(record: NpcMemoryRecord, generalUid: string): RecallEntry[] {
    return record.Recall_Context
        .filter((item) => item.General_UID === generalUid)
        .reverse()
        .map((item) => ({ ...item }));
}

/**
 * 從存檔原始資料還原 NPC 記憶。
 * 形狀不合或 Player_ID 與目前玩家不符回傳 null；單筆壞掉的回憶與非字串的槽位值會被丟棄。
 */
export function normalizeNpcMemory(raw: unknown, playerId: string): NpcMemoryRecord | null {
    if (!isRecord(raw)) return null;
    const owner = typeof raw.Player_ID === 'string' ? raw.Player_ID.trim() : '';
    if (owner.length === 0 || owner !== playerId.trim()) return null;

    const rawRecall = Array.isArray(raw.Recall_Context) ? raw.Recall_Context : [];
    const recall: RecallEntry[] = [];
    for (const item of rawRecall) {
        const clean = sanitizeRecallEntry(item);
        if (clean !== null) recall.push(clean);
    }

    const slots: Record<string, string> = {};
    if (isRecord(raw.Template_Slot_Values)) {
        for (const [key, value] of Object.entries(raw.Template_Slot_Values)) {
            if (typeof value === 'string') slots[key] = value;
        }
    }

    return {
        Player_ID: owner,
        SQLite_Vec_DB_Path: stringOr(raw.SQLite_Vec_DB_Path, NPC_MEMORY_DB_PATH),
        Brain_Service_Profile: stringOr(raw.Brain_Service_Profile, NPC_MEMORY_BRAIN_PROFILE),
        Persona_Card_Version: stringOr(raw.Persona_Card_Version, NPC_MEMORY_PERSONA_VERSION),
        Recall_Context: recall.slice(-RECALL_CONTEXT_LIMIT),
        Template_Slot_Values: slots,
    };
}

function sanitizeRecallEntry(raw: unknown): RecallEntry | null {
    if (!isRecord(raw)) return null;
    const generalUid = nonEmptyString(raw.General_UID);
    const vectorId = nonEmptyString(raw.Vector_ID);
    const snippet = nonEmptyString(raw.Snippet);
    const lastMet = nonEmptyString(raw.Last_Met);
    if (generalUid === null || vectorId === null || snippet === null || lastMet === null) return null;
    return {
        General_UID: generalUid,
        Vector_ID: vectorId,
        Snippet: snippet.slice(0, RECALL_SNIPPET_MAX_LENGTH),
        Last_Met: lastMet,
    };
}

function copyRecord(record: NpcMemoryRecord): NpcMemoryRecord {
    return {
        ...record,
        Recall_Context: record.Recall_Context.map((item) => ({ ...item })),
        Template_Slot_Values: { ...record.Template_Slot_Values },
    };
}

function nonEmptyString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function stringOr(value: unknown, fallback: string): string {
    return nonEmptyString(value) ?? fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
