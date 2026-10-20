// @spec-source → 大廳系統.md（Officer_Snapshot、HALL-11）；官職系統.md F-2 階位範例、F-3 天下大亂保留規則
/**
 * OfficerSnapshot — 大廳讀取官職快照後的權限解讀（純邏輯，不依賴 cc）
 *
 * 官職系統是權限真相來源，大廳只讀快照：階位決定任務難度上限、任務欄位數、世界沙盤階段與熱點。
 * 官職系統（OFC-01～03）尚未實作，所以快照目前由呼叫端傳入，缺欄位或壞值退回鄉里義士（階位 1）。
 *
 * 暫定：F-2 只給了「範例」階位與主要解鎖；任務欄位數與熱點數沒有規格數字，以下為暫定值。
 *
 * Unity 對照：像一個只讀的 ProgressionSnapshot，UI 只拿來決定顯示哪些按鈕、欄位數多少。
 */

export const OFFICER_TIER_MIN = 1;
export const OFFICER_TIER_MAX = 5;

export type QuestDifficultyCap = 'basic' | 'normal' | 'elite' | 'advanced' | 'hell';

export interface OfficerSnapshot {
    tier: number;
    /** 規格中的階位代碼（OFFICER_TIER_n）；讀檔用，不影響權限 */
    code: string;
}

export interface OfficerUnlocks {
    tier: number;
    questDifficultyCap: QuestDifficultyCap;
    /** 任務欄位數（暫定） */
    questColumns: number;
    /** 可進入的世界沙盤階段；未解鎖為 null */
    sandtableStage: 'S1' | 'S2' | 'S3' | null;
    /** 大廳熱點數（暫定） */
    hotspotCount: number;
}

const QUEST_CAP_BY_TIER: Readonly<Record<number, QuestDifficultyCap>> = {
    1: 'basic',
    2: 'normal',
    3: 'elite',
    4: 'advanced',
    5: 'hell',
};

/** 欄位數（暫定）：階位越高，可見任務欄越多 */
const QUEST_COLUMNS_BY_TIER: Readonly<Record<number, number>> = { 1: 1, 2: 2, 3: 2, 4: 3, 5: 4 };

/** 世界沙盤階段：F-2「郡守 S1、州牧 S2、霸府重臣 S3」 */
const SANDTABLE_BY_TIER: Readonly<Record<number, OfficerUnlocks['sandtableStage']>> = {
    1: null,
    2: null,
    3: 'S1',
    4: 'S2',
    5: 'S3',
};

/** 熱點數（暫定）：隨階位增加 */
const HOTSPOTS_BY_TIER: Readonly<Record<number, number>> = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 };

/** 讀入 Officer_Snapshot；Current_Tier 可以是代碼字串或數字，壞值退回階位 1 */
export function normalizeOfficerSnapshot(raw: unknown): OfficerSnapshot {
    const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
    const value = source.Current_Tier ?? source.tier;
    const match = typeof value === 'string' ? /^OFFICER_TIER_(\d)$/.exec(value) : null;
    const numeric = match ? Number(match[1]) : typeof value === 'number' ? value : NaN;
    const tier = Number.isInteger(numeric) && numeric >= OFFICER_TIER_MIN && numeric <= OFFICER_TIER_MAX ? numeric : OFFICER_TIER_MIN;
    return { tier, code: `OFFICER_TIER_${tier}` };
}

/** 依階位算出大廳該開放的權限；不倒退由官職系統保證，這裡只做查表 */
/**
 * 大廳任務牆的玩家狀態（PROG-2-0824）：階位即 rankTier；世界沙盤階段 S1/S2/S3 對應 worldStage 1/2/3。
 * 未解鎖沙盤時 worldStage 退回 1，與既有 HALL_DEFAULT_PLAYER 一致，避免舊的任務牆被隱藏。
 * 暫定：worldStage 退回值沿用既有預設。
 */
export function hallPlayerOf(unlocks: OfficerUnlocks): { rankTier: number; worldStage: number; intel: number } {
    const stage = unlocks.sandtableStage ? Number(unlocks.sandtableStage.slice(1)) : 1;
    return { rankTier: unlocks.tier, worldStage: stage, intel: 0 };
}

export function officerUnlocksOf(snapshot: OfficerSnapshot): OfficerUnlocks {
    const tier = normalizeOfficerSnapshot(snapshot).tier;
    return {
        tier,
        questDifficultyCap: QUEST_CAP_BY_TIER[tier],
        questColumns: QUEST_COLUMNS_BY_TIER[tier],
        sandtableStage: SANDTABLE_BY_TIER[tier],
        hotspotCount: HOTSPOTS_BY_TIER[tier],
    };
}
