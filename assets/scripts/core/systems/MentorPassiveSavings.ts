// @spec-source → 教官支援卡被動 VITALITY_SAVE、TP_Bonus（mentor-support-cards.json、MentorSupportSchema）；育成與戰鬥公式基準手冊 6.1；PROG-2-1999
/**
 * MentorPassiveSavings — 教官卡被動「體力消耗減免」與「戰法 TP 消耗減免」的合算（純邏輯，不依賴 cc）。
 *
 * - VITALITY_SAVE：帶著該卡培育時，每次訓練的體力（精力）消耗減免這個比例。
 * - TP_Bonus：帶著該卡培育時，畢業兌換戰法的 TP 消耗減免這個比例（MentorArchetype 已把它當「戰法 TP 折扣」分流）。
 * - 被動依教官星等解鎖（Min_Star <= 星等），沒帶卡或卡沒有該被動時為 0，行為與舊版完全相同。
 *
 * 暫定（裁決未寫，回報主 session）：
 * - 乘算：消耗 ×（1 − 減免）。
 * - 多張卡：減免相加，總減免封頂 0.6（規格 6.1 範例「TP 折扣 60%」）。
 * - 體力消耗減免後仍四捨五入，可降到 0；TP 消耗減免後無條件進位（沿用 learnTactic 的 ceil）。
 *
 * Unity 對照：像把多個 Modifier 的百分比加總、夾上限，最後乘在基礎消耗上。
 */
// 只 import 型別：MentorSupportSchema 會反向引用 NurtureSystem，避免產生執行期循環
import type { PassiveEffectKind, SupportCardDef } from '../models/MentorSupportSchema';

/** 暫定：單一類型被動的總減免上限 */
export const MENTOR_PASSIVE_SAVE_CAP = 0.6;

/** 教官身上帶的被動減免（由 mentorFromCard 依星等解鎖後寫入） */
export interface MentorPassiveSavings {
    /** 體力消耗減免（VITALITY_SAVE），0~1 */
    vitalitySave?: number;
    /** 戰法 TP 消耗減免（TP_Bonus），0~1 */
    tacticTpDiscount?: number;
    /** 陪伴效果提升（Training_Rate）：站在同一格訓練時進 M_Training，0.05 = +5% */
    trainingRate?: number;
}

function sumPassive(def: SupportCardDef, star: number, effect: PassiveEffectKind): number {
    const s = Number.isFinite(star) ? Math.max(0, Math.min(5, Math.floor(star))) : 0; // 與 activePassiveEffects 同樣夾 ★0~★5
    return (def.passiveEffects ?? [])
        .filter((p) => p.minStar <= s && p.effect === effect)
        .reduce((sum, p) => sum + (Number.isFinite(p.value) && p.value > 0 ? p.value : 0), 0);
}

/** 從支援卡依星等取出兩項減免；沒有被動時回空物件（不寫欄位） */
export function passiveSavingsOfSupport(def: SupportCardDef | undefined, star: number): MentorPassiveSavings {
    if (!def) return {};
    const vitalitySave = sumPassive(def, star, 'VITALITY_SAVE');
    const tacticTpDiscount = sumPassive(def, star, 'TP_Bonus');
    const trainingRate = sumPassive(def, star, 'Training_Rate');
    return {
        ...(vitalitySave > 0 ? { vitalitySave } : {}),
        ...(tacticTpDiscount > 0 ? { tacticTpDiscount } : {}),
        ...(trainingRate > 0 ? { trainingRate } : {}),
    };
}

function totalOf(values: readonly (number | undefined)[]): number {
    const sum = values.reduce<number>((acc, v) => acc + (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0), 0);
    return Math.min(MENTOR_PASSIVE_SAVE_CAP, sum);
}

/** 所有帶著的教官的體力消耗總減免（相加、封頂） */
export function totalVitalitySave(mentors: readonly MentorPassiveSavings[]): number {
    return totalOf(mentors.map((m) => m.vitalitySave));
}

/** 所有帶著的教官的戰法 TP 消耗總減免（相加、封頂） */
export function totalTacticTpDiscount(mentors: readonly MentorPassiveSavings[]): number {
    return totalOf(mentors.map((m) => m.tacticTpDiscount));
}

/** 套用減免：消耗 ×（1 − 減免）；不改動減免為 0 時的數值 */
export function applyPassiveSave(cost: number, save: number): number {
    return save > 0 ? cost * (1 - save) : cost;
}
