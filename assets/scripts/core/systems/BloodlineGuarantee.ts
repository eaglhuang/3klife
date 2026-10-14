// @spec-source → 培育系統.md (doc_spec_0026) §F-3、§N-1；MCQ Q32 裁決（選項 D）
/**
 * BloodlineGuarantee — 世家血脈保底（純邏輯，不依賴 cc）
 *
 * 規則：子嗣姓氏 == 支援卡教官家族名（例：關姓子弟用 SSR 關羽卡）時，
 *   1. 靈感事件保底觸發（不擲骰，直接必中）；
 *   2. 家傳戰法的 TP 需求減 20%。
 * 異姓子弟（或沒有家族資料）不配對，回歸原本的機率擲骰。
 *
 * 暫定：
 *   - TP 折扣：Q32 文字寫「PT-20%」，§F-3 寫「50% 折扣再減 20%」，§N-1 寫「8 折」。
 *     本檔取 Q32 的 ×0.8，三者衝突待 PM 裁定（已記入待辦檔）。
 *   - 保底只在 36 回合內有效（實作回合數，見 MENT-05 換算）。
 *
 * Unity 對照：像一個 Rule 元件，只在姓氏欄位相同時把機率 Slider 拉到 1，其餘不動。
 */
import { surnameOf } from './VirtualAncestorGenerator';
import { NURTURE_TOTAL_ROUNDS } from './NurtureSystem';

/** 配對家族的 TP 需求折扣（0.2 = 減 20%） */
export const BLOODLINE_TP_DISCOUNT = 0.2;

/** 「某」是 surnameOf 對空白名字的佔位，不能拿來配對 */
const UNKNOWN_SURNAME = '某';

/** 姓氏是否與家族名相同；沒有名字、沒有家族、或無名佔位都不配對 */
export function isBloodlineMatch(childName: string | undefined, familyName: string | undefined): boolean {
    if (!childName || !familyName || familyName === UNKNOWN_SURNAME) return false;
    const surname = surnameOf(childName);
    return surname !== UNKNOWN_SURNAME && surname === familyName;
}

/** 家傳戰法的 TP 需求倍率：配對 ×0.8，不配對 ×1 */
export function bloodlineTpMultiplier(match: boolean): number {
    return match ? 1 - BLOODLINE_TP_DISCOUNT : 1;
}

/** 規格的培育回合數（保底「60 回合前」的基準） */
export const SPEC_TOTAL_ROUNDS = 60;

/**
 * 把規格的回合期限換算成實作回合：spec × NURTURE_TOTAL_ROUNDS / SPEC_TOTAL_ROUNDS，無條件進位。
 * PM 裁定（2026-10-14，暫定）：60 回合換算後為 36，等於整個培育期間。
 */
export function scaleSpecRoundToImpl(specRound: number): number {
    return Math.ceil((specRound * NURTURE_TOTAL_ROUNDS) / SPEC_TOTAL_ROUNDS);
}

/** 保底期限（實作回合）：規格「60 回合前保證」換算後的回合 */
export const SPEC_BLOODLINE_DEADLINE_ROUND = 60;
export const BLOODLINE_DEADLINE_ROUND = scaleSpecRoundToImpl(SPEC_BLOODLINE_DEADLINE_ROUND);

/** 保底只給期限以內的回合 */
export function isBloodlineGuaranteedRound(round: number): boolean {
    return round >= 1 && round <= BLOODLINE_DEADLINE_ROUND;
}
