/**
 * 運氣特殊門檻判定（LUK-06）。
 *
 * 規格：docs/遊戲規格文件/系統規格書/運氣系統.md「LUK 特殊門檻效果」
 * Unity 對照：像一個純函式的 Threshold Table，輸入 LUK 數值，輸出該門檻解鎖哪些旗標。
 *
 * 本檔只判定旗標，不套用效果。戰法複製、因子突破、曾祖因子繼承的實際接線另卡處理。
 */

/** LUK 上限（暫定；正式上限依紫因子計算，見 LUK-03） */
export const LUK_MAX = 100;
/** ≥ 80：戰法強制複製（父親最強戰法 100% 繼承） */
export const LUK_FORCE_TACTIC_COPY_MIN = 80;
/** ≥ 95：血統變異（隨機一個因子突破 ★，上限 ★4） */
export const LUK_BLOODLINE_MUTATION_MIN = 95;

export interface LuckThresholdEffects {
    /** 戰法強制複製 */
    forceTacticCopy: boolean;
    /** 血統變異 */
    bloodlineMutation: boolean;
    /** 天命傳承：額外繼承一個曾祖代因子（LUK 達上限） */
    fateInheritance: boolean;
}

/**
 * 依父母平均 LUK 回傳各門檻旗標。
 * LUK 缺省、負數或非有限值視為 0，三個旗標皆為 false。
 * 高於上限的值以 LUK_MAX 計（LUK 不會超過上限）。
 */
export function luckThresholdEffects(parentAvgLuk: number): LuckThresholdEffects {
    const luk = Number.isFinite(parentAvgLuk) && parentAvgLuk > 0 ? Math.min(parentAvgLuk, LUK_MAX) : 0;
    return {
        forceTacticCopy: luk >= LUK_FORCE_TACTIC_COPY_MIN,
        bloodlineMutation: luk >= LUK_BLOODLINE_MUTATION_MIN,
        fateInheritance: luk >= LUK_MAX,
    };
}
