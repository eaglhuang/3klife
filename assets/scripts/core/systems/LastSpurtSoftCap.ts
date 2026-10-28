// @spec-source → 育成與戰鬥公式基準手冊 §4.2 殘局爆發（破釜沉舟）與 Soft-Cap；WBS FORM-06（PROG-2-1296）
/**
 * LastSpurtSoftCap — 破釜沉舟殘局切換與 STR 軟上限（純邏輯，不依賴 cc）。
 *
 * - 殘局切換：第 5 回合起為 Last_Spurt_Mode（暫定：以回合數判斷，不含「存活人數 < 50%」條件，該條件屬殘局判斷器卡）。
 * - 爆發力係數：sqrt(STR / 500)；STR 超過 1200 的溢出部分，其平方根係數額外乘 0.5（暫定解讀，見下方說明）。
 *
 * 暫定解讀：規格只寫「溢出部分的平方根係數乘 0.5」。這裡取 1200 以下為 sqrt(STR/500)，
 * 1200 以上為 sqrt(1200/500) + 0.5 × (sqrt(STR/500) − sqrt(1200/500))，因此在 1200 處連續。
 *
 * Unity 對照：像 AnimationCurve 在某個點之後把斜率減半，而不是直接截斷數值。
 */

/** 進入殘局模式的回合（規格示例：第 5 回合） */
export const LAST_SPURT_TURN = 5;
/** STR 軟上限（規格：超過 1200 屬性收益折半） */
export const STR_SOFT_CAP = 1200;
/** 爆發力平方根的分母（規格：sqrt(STR / 500)） */
export const STR_POWER_DIVISOR = 500;
/** 溢出部分的平方根係數倍率（規格：乘 0.5） */
export const STR_OVERFLOW_FACTOR = 0.5;

/** 此回合是否已進入殘局模式（第 LAST_SPURT_TURN 回合起含）。 */
export function isLastSpurtTurn(turn: number): boolean {
    return turn >= LAST_SPURT_TURN;
}

/** 爆發力係數（含軟上限）；STR 非有限值或不大於 0 時為 0。 */
export function strPowerFactor(str: number): number {
    if (!Number.isFinite(str) || str <= 0) return 0;
    const raw = Math.sqrt(str / STR_POWER_DIVISOR);
    if (str <= STR_SOFT_CAP) return raw;
    const capped = Math.sqrt(STR_SOFT_CAP / STR_POWER_DIVISOR);
    return capped + STR_OVERFLOW_FACTOR * (raw - capped);
}
