// @spec-source → 武將系統.md §B 功能 #5（生命週期狀態機：出生→開獎→成年→巔峰→衰老→退役）；武將壽命系統.md §年齡階段能力修正；WBS v3 GEN-07
/**
 * GeneralStage — 武將生命週期狀態機（出生→開獎→成年→巔峰→衰老→退役）純邏輯，不依賴 cc。
 *
 * 狀態由年齡推導，階段門檻取自武將壽命系統的年齡階段表：
 *   出生 0~5（幼兒）、開獎 5~20（少年；5 歲揭曉）、成年 20~40（青年；20 歲可轉職）、
 *   巔峰 40~55（壯年）、衰老 55~65（老年）、退役 65+（超齡，退役候選）。
 *
 * 不改 GeneralAging 的增齡與死亡率，也不接存檔；只提供判定與轉換事件。
 *
 * Unity 對照：像 Animator 的 state machine，但狀態只由 age 參數驅動，沒有自由轉移。
 */

export const GENERAL_STAGES = ['birth', 'unveiling', 'adult', 'peak', 'decline', 'retired'] as const;
export type GeneralStage = typeof GENERAL_STAGES[number];

/** 各階段的起始年齡（含）；退役為終態。 */
export const GENERAL_STAGE_START_AGE: Readonly<Record<GeneralStage, number>> = Object.freeze({
    birth: 0,
    unveiling: 5,
    adult: 20,
    peak: 40,
    decline: 55,
    retired: 65,
});

export interface GeneralStageState {
    stage: GeneralStage;
}

export type GeneralStageEvent = { type: 'stage-changed'; from: GeneralStage; to: GeneralStage; age: number };

export interface GeneralStageResult {
    state: GeneralStageState;
    changed: boolean;
    events: GeneralStageEvent[];
}

export function isGeneralStage(value: unknown): value is GeneralStage {
    return typeof value === 'string' && (GENERAL_STAGES as readonly string[]).indexOf(value) >= 0;
}

/** 由年齡推導階段。負數或非有限值拋出 RangeError。 */
export function deriveGeneralStage(age: number): GeneralStage {
    if (!Number.isFinite(age) || age < 0) throw new RangeError('年齡必須為有限非負數');
    let stage: GeneralStage = 'birth';
    for (const candidate of GENERAL_STAGES) {
        if (age >= GENERAL_STAGE_START_AGE[candidate]) stage = candidate;
    }
    return stage;
}

/**
 * 依新年齡推進狀態。退役為終態：一旦退役不會回到較早階段。
 * 年齡倒退（例如資料錯誤）時保留原階段，不發事件。
 * 回傳新狀態，不改輸入、不用亂數、不寫存檔。
 */
export function advanceGeneralStage(source: GeneralStageState, age: number): GeneralStageResult {
    const next = deriveGeneralStage(age);
    const state = { ...source };
    const result: GeneralStageResult = { state, changed: false, events: [] };
    if (source.stage === 'retired') return result;
    if (GENERAL_STAGES.indexOf(next) <= GENERAL_STAGES.indexOf(source.stage)) return result;
    state.stage = next;
    result.changed = true;
    result.events.push({ type: 'stage-changed', from: source.stage, to: next, age });
    return result;
}

/**
 * 讀取存檔時的防呆：階段名稱不合法時改由年齡重新推導，避免武將卡在未知階段。
 */
export function restoreGeneralStage(raw: unknown, age: number): GeneralStageState {
    if (typeof raw === 'object' && raw !== null && isGeneralStage((raw as { stage?: unknown }).stage)) {
        return { stage: (raw as { stage: GeneralStage }).stage };
    }
    return { stage: deriveGeneralStage(age) };
}
