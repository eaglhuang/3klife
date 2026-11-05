// @spec-source → 血統傳承G3三代深淵_外戚純化與世交合譜規格書.md §E #3、§F-1、§H UI_G3_OUTCROSS_REJUV；PROG-2-1796
// @spec-source → 血統與家系漸進揭露里程碑總綱規格書.md M_stage 表、UI_KINSHIP_LAMP_0～3；PROG-2-1836
/**
 * BloodFatigue — 血脈疲勞 h 的轉移與當胎病弱風險（純邏輯，不依賴 cc）
 *
 * 規格沒寫「病弱」實際影響什麼；暫定精力上限 ×0.8。
 *
 * Unity 對照：像一個只有公式的靜態工具類，實際寫入由結緣流程做。
 */

/** 共祖掃描範圍：28 祖位 = 往上 4 代 */
export const BLOOD_FATIGUE_SCAN_GENERATIONS = 4;
export const OUTCROSS_FRAIL_RISK = 0.01;
/** 近婚依 h = 1、2、3、4 以上查表 */
const INBRED_FRAIL_RISK = [0.12, 0.2, 0.32, 0.48];
/** UI_KINSHIP_LAMP_0～3；暫定 h = 0、1、2、3 以上依序對應 */
const KINSHIP_LAMP_TEXT = [
    '🟢 血脈清朗（無近親累積疲勞）',
    '🟡 血脈微躁（曾有近親聯姻，若再近婚將提高抱恙風險；異姓外婚可復壯）',
    '🟠 血脈鬱結（累代近親，強烈建議本代選擇無共祖外婚以滌清血脈）',
    '🔴 血脈枯竭（極高病弱風險，請務必進行異姓外婚）',
];
/** 暫定：病弱兒精力上限折損 */
export const FRAIL_VITALITY_MULTIPLIER = 0.8;
export const FRAIL_BIRTH_FLAG = 'frail-birth';

export interface BloodFatigueOutcome {
    /** 雙親基底 h = max(父, 母) */
    before: number;
    /** 子嗣攜帶的 h */
    after: number;
    inbred: boolean;
    frail: boolean;
}

export function normalizeBloodFatigue(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

export function childBloodFatigue(fatherH: unknown, motherH: unknown, inbred: boolean): number {
    const base = Math.max(normalizeBloodFatigue(fatherH), normalizeBloodFatigue(motherH));
    return inbred ? base + 1 : Math.max(0, base - 1);
}

export function birthFrailRisk(childH: number, inbred: boolean): number {
    if (!inbred) return OUTCROSS_FRAIL_RISK;
    return INBRED_FRAIL_RISK[Math.min(Math.max(childH, 1), INBRED_FRAIL_RISK.length) - 1];
}

/** 每次異姓外婚 h 減 1，要幾代才回到清朗 */
export function outcrossRecoveryLine(fatherH: unknown, motherH: unknown): string {
    const before = Math.max(normalizeBloodFatigue(fatherH), normalizeBloodFatigue(motherH));
    return before > 0 ? `外婚復壯需 ${before} 代` : '';
}

export function kinshipLampLevel(h: unknown): number {
    return Math.min(normalizeBloodFatigue(h), KINSHIP_LAMP_TEXT.length - 1);
}

/** 結緣畫面的燈號行：燈號看雙親較高者；當胎 = 這胎的病弱風險，殘留 = 子嗣帶走的 h */
export function kinshipLampLine(fatherH: unknown, motherH: unknown, inbred: boolean): string {
    const before = Math.max(normalizeBloodFatigue(fatherH), normalizeBloodFatigue(motherH));
    const after = childBloodFatigue(fatherH, motherH, inbred);
    const risk = Math.round(birthFrailRisk(after, inbred) * 100);
    return `${KINSHIP_LAMP_TEXT[kinshipLampLevel(before)]}｜當胎病弱 ${risk}%｜子嗣殘留 ${after} 階`;
}

/** §H UI_G3_OUTCROSS_REJUV；出生時的提示。雙親乾淨的外婚沒有可復壯的，不提 */
export function bloodFatigueBirthLines(outcome: BloodFatigueOutcome): string[] {
    const lines: string[] = [];
    if (outcome.inbred) lines.push(`近親成婚，子嗣血脈疲勞升至 ${outcome.after} 階。`);
    else if (outcome.before > 0) lines.push(`【異姓復壯】雙親 28 席無共祖！本胎出生抱恙風險直接回歸安全值（1%），且子代血脈疲勞將由 ${outcome.before} 降為 ${outcome.after}。`);
    if (outcome.frail) lines.push('此胎先天不足，生來體弱，精力上限折損。');
    return lines;
}
