// @spec-source → 官職系統.md（F-1 經驗來源、F-2 階位表、F-3 天下大亂保留）；WBS OFC-01、OFC-02、OFC-03、OFC-09
/**
 * OfficerState — 官職階位表、經驗計算、晉升判定（純邏輯，不依賴 cc）
 *
 * 官職是權限的真相來源：經驗累積到門檻就晉升，連升多階也照樣計算。
 * 每階第一次達到時寫進解鎖歷史，一次性，不重複領。
 * 天下大亂（EraShift）時階位、經驗與解鎖歷史全部保留。
 *
 * 暫定（規格沒寫，可逆）：
 * - 任務難度對照：規格 EASY/NORMAL/ELITE/HIGH/HELL 對應大廳的 basic/normal/elite/advanced/hell
 *
 * Unity 對照：像一個 ScriptableObject 階位表加上一個純 C# 的 PlayerRank 類別，
 * 升級時回傳「升了哪幾階」，UI 再依回傳值播放動畫。
 */

export const OFFICER_TIER_MIN = 1;
export const OFFICER_TIER_MAX = 5;

/**
 * 各階晉升所需累積經驗（F-2；階位 1 為初始，不需要經驗）。
 * 內建值只是備援；遊戲啟動時由 installOfficerTierTable 依 officer-tiers.json 覆寫（OFC-01）。
 */
export const OFFICER_TIER_EXP_THRESHOLDS: Record<number, number> = {
    2: 100,
    3: 260,
    4: 520,
    5: 920,
};

export type OfficerDifficulty = 'EASY' | 'NORMAL' | 'ELITE' | 'HIGH' | 'HELL';
export type OfficerBoardType = 'MILITARY' | 'DOMESTIC' | 'EXPEDITION';

export interface OfficerTaskResult {
    difficulty: OfficerDifficulty;
    boardType: OfficerBoardType;
    success: boolean;
}

const DIFFICULTY_BASE: Readonly<Record<OfficerDifficulty, number>> = {
    EASY: 10,
    NORMAL: 18,
    ELITE: 30,
    HIGH: 48,
    HELL: 72,
};

/** F-1：經驗 = floor(難度底數 × 領域加成 × 成敗加成) */
export function calcOfficerExpGain(task: OfficerTaskResult): number {
    const difficultyBase = DIFFICULTY_BASE[task.difficulty];
    const domainBonus = task.boardType === 'MILITARY' ? 1.1 : 1.0;
    const successBonus = task.success ? 1.0 : 0.4;
    return Math.floor(difficultyBase * domainBonus * successBonus);
}

export interface OfficerState {
    /** 目前階位（Current_Tier，1~5） */
    currentTier: number;
    /** 累積官職經驗（Officer_Exp） */
    officerExp: number;
    /** 已解鎖的階位（Unlock_History），每階最多一次 */
    unlockHistory: number[];
}

export function initialOfficerState(): OfficerState {
    return { currentTier: OFFICER_TIER_MIN, officerExp: 0, unlockHistory: [OFFICER_TIER_MIN] };
}

/** 經驗對應的階位（不超過上限） */
export function tierForExp(exp: number): number {
    let tier = OFFICER_TIER_MIN;
    for (let candidate = OFFICER_TIER_MIN + 1; candidate <= OFFICER_TIER_MAX; candidate++) {
        if (exp >= OFFICER_TIER_EXP_THRESHOLDS[candidate]) tier = candidate;
    }
    return tier;
}

export interface OfficerExpResult {
    state: OfficerState;
    /** 這次新解鎖的階位（由低到高；連升多階會有多筆）；沒有晉升時為空陣列 */
    promotedTiers: number[];
}

/** 加經驗並晉升；只升不降，已解鎖的階位不重複寫入解鎖歷史 */
export function addOfficerExp(state: OfficerState, gain: number): OfficerExpResult {
    const officerExp = state.officerExp + Math.max(0, Math.floor(gain));
    const reached = tierForExp(officerExp);
    const currentTier = Math.max(state.currentTier, reached);
    const promotedTiers: number[] = [];
    for (let tier = state.currentTier + 1; tier <= currentTier; tier++) {
        promotedTiers.push(tier);
    }
    const unlockHistory = Array.from(new Set([...state.unlockHistory, ...promotedTiers])).sort((a, b) => a - b);
    return { state: { currentTier, officerExp, unlockHistory }, promotedTiers };
}

/** 天下大亂（EraShift）：階位、經驗、解鎖歷史全部保留（F-3） */
export function applyEraShiftToOfficerState(state: OfficerState): OfficerState {
    return { currentTier: state.currentTier, officerExp: state.officerExp, unlockHistory: [...state.unlockHistory] };
}

/** 讀檔：缺欄位或壞值退回初始狀態；階位與解鎖歷史互相對齊 */
export function normalizeOfficerState(raw: unknown): OfficerState {
    const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
    const exp = typeof source.officerExp === 'number' && Number.isFinite(source.officerExp) && source.officerExp >= 0
        ? Math.floor(source.officerExp)
        : 0;
    const tierFromExp = tierForExp(exp);
    const savedTier = typeof source.currentTier === 'number' && Number.isInteger(source.currentTier)
        ? Math.min(OFFICER_TIER_MAX, Math.max(OFFICER_TIER_MIN, source.currentTier))
        : OFFICER_TIER_MIN;
    const currentTier = Math.max(savedTier, tierFromExp);
    const saved = Array.isArray(source.unlockHistory)
        ? source.unlockHistory.filter((t): t is number => Number.isInteger(t) && t >= OFFICER_TIER_MIN && t <= currentTier)
        : [];
    const unlockHistory = Array.from(new Set([OFFICER_TIER_MIN, ...saved, ...rangeOf(OFFICER_TIER_MIN + 1, currentTier)])).sort((a, b) => a - b);
    return { currentTier, officerExp: exp, unlockHistory };
}

function rangeOf(from: number, to: number): number[] {
    const out: number[] = [];
    for (let i = from; i <= to; i++) out.push(i);
    return out;
}

/** 轉成大廳快照格式（HALL-11 / GameSession.setOfficerSnapshot 讀的 Current_Tier 代碼） */
export function toOfficerSnapshot(state: OfficerState): { tier: number; code: string } {
    return { tier: state.currentTier, code: `OFFICER_TIER_${state.currentTier}` };
}
