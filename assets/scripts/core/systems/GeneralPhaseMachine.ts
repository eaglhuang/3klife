// @spec-source → 名將本體資料結構與多型轉型規格書 (doc_spec_0320) §2~§3（GEN-07、DS-02，PROG-2-1946）
/**
 * GeneralPhaseMachine — 武將生命週期七階段、Talent/Prowess 取值與職能不可逆（純邏輯，不依賴 cc）。
 *
 * 規格定案：
 * - BABY 0~4 歲 → CHILD 5~11 → YOUTH 12~19 → PEAK 20~49 → DECLINE 50+ → RETIRED（60+ 自主退役）→ SPIRIT（壽終／戰死）。
 * - 階段只能往後走；SPIRIT 為終態。RETIRED 需 60 歲以上主動申請，不由年齡自動進入。
 * - DECLINE 精力回復率減半。
 * - FinalStat = min(Prowess, TalentCap)。
 * - Role 轉為 Mentor 後不可逆，且 Role_Boundary 固定 TeachingOnly。
 *
 * 既有 GeneralMainSchema 負責欄位驗證；本檔只放狀態轉換規則。
 * 暫定：季更推進、事件觸發與存檔接線另卡。
 * Unity 對照：像一個無副作用的 enum 狀態機，由 Controller 每季呼叫。
 */

export const GENERAL_PHASES = ['BABY', 'CHILD', 'YOUTH', 'PEAK', 'DECLINE', 'RETIRED', 'SPIRIT'] as const;
export type GeneralPhase = typeof GENERAL_PHASES[number];

export const CHILD_AGE = 5;
export const YOUTH_AGE = 12;
export const PEAK_AGE = 20;
export const DECLINE_AGE = 50;
export const RETIRE_ELIGIBLE_AGE = 60;
export const DECLINE_VITALITY_REGEN_MULTIPLIER = 0.5;

/** 依年齡推得的自然階段（不含 RETIRED／SPIRIT 這類事件階段）。 */
export function naturalPhaseForAge(age: number): GeneralPhase {
    if (age < CHILD_AGE) return 'BABY';
    if (age < YOUTH_AGE) return 'CHILD';
    if (age < PEAK_AGE) return 'YOUTH';
    if (age < DECLINE_AGE) return 'PEAK';
    return 'DECLINE';
}

function rank(phase: GeneralPhase): number {
    return GENERAL_PHASES.indexOf(phase);
}

/** 季更推進：事件階段（RETIRED／SPIRIT）不被年齡覆寫，其餘只會往後走。 */
export function advancePhaseByAge(current: GeneralPhase, age: number): GeneralPhase {
    if (current === 'RETIRED' || current === 'SPIRIT') return current;
    const natural = naturalPhaseForAge(age);
    return rank(natural) > rank(current) ? natural : current;
}

export type PhaseEvent = 'retire' | 'death';

export type PhaseTransition = { ok: true; phase: GeneralPhase } | { ok: false; reason: 'too-young' | 'terminal' | 'already' };

/** 事件轉換：榮退需 60 歲以上且尚未退役；壽終／戰死一律進 SPIRIT。 */
export function applyPhaseEvent(current: GeneralPhase, age: number, event: PhaseEvent): PhaseTransition {
    if (current === 'SPIRIT') return { ok: false, reason: 'terminal' };
    if (event === 'death') return { ok: true, phase: 'SPIRIT' };
    if (current === 'RETIRED') return { ok: false, reason: 'already' };
    if (age < RETIRE_ELIGIBLE_AGE) return { ok: false, reason: 'too-young' };
    return { ok: true, phase: 'RETIRED' };
}

/** 精力回復倍率：DECLINE 減半，其餘 1。 */
export function vitalityRegenMultiplier(phase: GeneralPhase): number {
    return phase === 'DECLINE' ? DECLINE_VITALITY_REGEN_MULTIPLIER : 1;
}

/** 出征／評分用的生效屬性：實績不得超過天賦上限。 */
export function finalStat(prowess: number, talentCap: number): number {
    return Math.min(prowess, talentCap);
}

export type GeneralRole = 'Combat' | 'Mentor';

/** 職能變更：Mentor 不可轉回 Combat；轉 Mentor 時邊界固定 TeachingOnly。 */
export function changeRole(current: GeneralRole, next: GeneralRole):
    { ok: true; role: GeneralRole; roleBoundary: 'Normal' | 'TeachingOnly' } | { ok: false } {
    if (current === 'Mentor' && next === 'Combat') return { ok: false };
    return { ok: true, role: next, roleBoundary: next === 'Mentor' ? 'TeachingOnly' : 'Normal' };
}
