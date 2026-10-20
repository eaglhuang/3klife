// @spec-source → 武將人物介面規格書.md §6.6（五階血脈傳承奧義）、§6.7（升星、覺醒、名聲的分工）；GDUI-07（PROG-2-0714）
/**
 * BloodlineTransmissionUltimate — 五階血脈傳承奧義的階段邏輯（純邏輯，不依賴 cc）
 *
 * 規格口訣：升星開上限，名聲與事蹟點亮內容。
 *   - 升星只提高 Stage_Cap（上限，最高 5）。
 *   - 覺醒只提高 Stage_Current（已點亮階數）。階 n 需要 Stage_Cap ≥ n、已點亮 n-1 階、名聲與事蹟達標。
 *   - 第 1 階初始開放；第 5 階需要一次史詩事蹟。
 *
 * 暫定選擇（可逆）：
 *   - 「符合靈獸傾向的額外進度」規格沒有數值，這版不加進度，留待辦。
 *   - 事蹟以呼叫端傳入的計數為準，不在這裡累計。
 *
 * Unity 對照：像一條技能樹的 Presenter，Stage_Cap 是解鎖上限，Stage_Current 是已點亮的節點，
 * 點亮規則寫成表格，不寫在 UI 裡。
 */

export const ULTIMATE_MAX_STAGE = 5;

export interface UltimateStageRule {
    stage: number;
    /** 名聲門檻（1 階為 0，初始開放） */
    fame: number;
    /** 所需事蹟次數（一般事蹟） */
    incidents: number;
    /** 需要的史詩事蹟次數（只有第 5 階為 1） */
    epicIncidents: number;
}

export const ULTIMATE_STAGE_RULES: readonly UltimateStageRule[] = [
    { stage: 1, fame: 0, incidents: 0, epicIncidents: 0 },
    { stage: 2, fame: 100, incidents: 1, epicIncidents: 0 },
    { stage: 3, fame: 300, incidents: 2, epicIncidents: 0 },
    { stage: 4, fame: 700, incidents: 3, epicIncidents: 0 },
    { stage: 5, fame: 1500, incidents: 0, epicIncidents: 1 },
];

export interface UltimateState {
    /** Stage_Cap：由升星決定，1..5 */
    stageCap: number;
    /** Stage_Current：已點亮階數，1..Stage_Cap */
    stageCurrent: number;
}

export interface UltimateProgressInput {
    fame: number;
    /** 一般事蹟次數 */
    incidents: number;
    /** 史詩事蹟次數 */
    epicIncidents: number;
}

export type UltimateAwakenReason = 'CAP_LOCKED' | 'ALREADY_MAX' | 'FAME_SHORT' | 'INCIDENT_SHORT' | 'EPIC_REQUIRED';

export type UltimateAwakenResult =
    | { ok: true; state: UltimateState; awakenedStage: number }
    | { ok: false; reason: UltimateAwakenReason };

function clampStage(value: number): number {
    if (!Number.isFinite(value)) return 1;
    return Math.max(1, Math.min(ULTIMATE_MAX_STAGE, Math.floor(value)));
}

/** 初始狀態：上限 1、已點亮 1（初始開放）。 */
export function initialUltimateState(): UltimateState {
    return { stageCap: 1, stageCurrent: 1 };
}

/** 升星：星數對應階段上限（1 星 → 1 階，5 星 → 5 階），只會提高、不會降低。 */
export function raiseStageCap(state: UltimateState, stars: number): UltimateState {
    const cap = clampStage(stars);
    return { ...state, stageCap: Math.max(state.stageCap, cap) };
}

/** 檢查能否覺醒下一階，回傳第一個擋下的原因（與 UI 提示一對一）。 */
export function checkNextStage(state: UltimateState, progress: UltimateProgressInput): { ok: true; stage: number } | { ok: false; reason: UltimateAwakenReason } {
    if (state.stageCurrent >= ULTIMATE_MAX_STAGE) return { ok: false, reason: 'ALREADY_MAX' };
    const stage = state.stageCurrent + 1;
    if (stage > state.stageCap) return { ok: false, reason: 'CAP_LOCKED' };
    const rule = ULTIMATE_STAGE_RULES[stage - 1];
    if (progress.fame < rule.fame) return { ok: false, reason: 'FAME_SHORT' };
    if (progress.incidents < rule.incidents) return { ok: false, reason: 'INCIDENT_SHORT' };
    if (progress.epicIncidents < rule.epicIncidents) return { ok: false, reason: 'EPIC_REQUIRED' };
    return { ok: true, stage };
}

/** 覺醒下一階；條件不足時回傳原因，狀態不變。 */
export function awakenNextStage(state: UltimateState, progress: UltimateProgressInput): UltimateAwakenResult {
    const check = checkNextStage(state, progress);
    if (!check.ok) return check;
    return { ok: true, state: { ...state, stageCurrent: check.stage }, awakenedStage: check.stage };
}

/** 讀存檔時的防呆：缺欄位或超出範圍的值夾回合法範圍，且 Stage_Current 不超過 Stage_Cap。 */
export function normalizeUltimateState(raw: { stageCap?: number; stageCurrent?: number } | undefined): UltimateState {
    const cap = clampStage(raw?.stageCap ?? 1);
    const current = Math.min(clampStage(raw?.stageCurrent ?? 1), cap);
    return { stageCap: cap, stageCurrent: current };
}
