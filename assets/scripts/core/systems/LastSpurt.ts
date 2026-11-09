// @spec-source → 育成與戰鬥公式基準手冊 §4.2 殘局爆發（破釜沉舟）、§P0 殘局判斷器／平方根解算器（FORM-06，PROG-2-1925）
/**
 * LastSpurt — 破釜沉舟殘局模式判定與 STR 平方根解算（純邏輯，不依賴 cc）。
 *
 * - 殘局判斷：第 5 回合起，或場上存活比例 < 50%，切換 Last_Spurt_Mode。
 * - 爆發傷害：基礎傷害 × √(STR / 500) × 兵種終盤係數。
 * - Soft-Cap：STR > 1200 時，超過 1200 那段帶來的平方根增量再乘 0.5。
 *
 * 暫定：戰鬥流程接線（AP 消耗規則、體力燃燒）另卡；兵種終盤係數由呼叫端傳入，預設 1。
 * Unity 對照：像 Mathf.Sqrt 的成長曲線加上一段折半斜率的封頂。
 */

export const LAST_SPURT_TURN = 5;
export const LAST_SPURT_ALIVE_RATIO = 0.5;
export const LAST_SPURT_STR_BASE = 500;
export const LAST_SPURT_STR_SOFT_CAP = 1200;
export const LAST_SPURT_OVERFLOW_FACTOR = 0.5;

/**
 * 暫定（PROG-2-1992）：武將 STR 欄位是 0~100，規格公式的 STR 基準 500／軟上限 1200 是另一個尺度，
 * 先把武將 STR 乘 10 換算（STR 50＝基準 500、STR 100＝1000，超過 1200 靠加成），規格沒給換算。
 */
export const LAST_SPURT_GENERAL_STR_SCALE = 10;

/** 第 5 回合起，或存活比例低於 50%，進入破釜沉舟。aliveRatio 取 0~1。 */
export function isLastSpurtMode(turn: number, aliveRatio: number): boolean {
    return turn >= LAST_SPURT_TURN || aliveRatio < LAST_SPURT_ALIVE_RATIO;
}

/** √(STR/500)，超過 1200 的部分增量折半；負值與非數字視為 0。 */
export function lastSpurtStrFactor(str: number): number {
    const s = Number.isFinite(str) && str > 0 ? str : 0;
    const raw = Math.sqrt(s / LAST_SPURT_STR_BASE);
    if (s <= LAST_SPURT_STR_SOFT_CAP) return raw;
    const capped = Math.sqrt(LAST_SPURT_STR_SOFT_CAP / LAST_SPURT_STR_BASE);
    return capped + (raw - capped) * LAST_SPURT_OVERFLOW_FACTOR;
}

/** 殘局爆發傷害：基礎傷害 × STR 係數 × 兵種終盤係數。 */
export function lastSpurtDamage(baseDamage: number, str: number, troopFinaleFactor = 1): number {
    return baseDamage * lastSpurtStrFactor(str) * troopFinaleFactor;
}

/**
 * 殘局傷害接到實際結算：把武將 STR（0~100 尺度）換算後套 lastSpurtDamage，取整、至少 1。
 * 戰鬥傷害路徑（普攻與戰法）在殘局中呼叫；沒有武將時呼叫端不呼叫。
 */
export function lastSpurtAdjustedDamage(baseDamage: number, generalStr: number, troopFinaleFactor = 1, staminaExhausted = false): number {
    const full = lastSpurtDamage(baseDamage, generalStr * LAST_SPURT_GENERAL_STR_SCALE, troopFinaleFactor);
    // FORM-07：體力耗盡後失去爆發加成；係數本來就小於 1 的低 STR 武將不因此變強
    return Math.max(1, Math.floor(staminaExhausted ? Math.min(baseDamage, full) : full));
}
