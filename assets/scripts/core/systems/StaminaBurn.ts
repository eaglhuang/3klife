// @spec-source → 育成與戰鬥公式基準手冊 §4.3 體力與根性的燃燒模型（FORM-07，PROG-2-2125）
/**
 * StaminaBurn — 破釜沉舟時的體力水池與根性減免（純邏輯，不依賴 cc）。
 *
 * 裁決（2026-11-08）：不新增屬性。VIT 對應既有生命值換算；WILL 以士氣為主、運氣為輔。
 *
 * 暫定（規格只給公式形狀）：基準速度、常數 C、比例係數取 1，速度用部隊移動力；
 * 回合制戰場以「每回合」取代規格的「每秒」。
 *
 * Unity 對照：像一個 Stamina 元件，每回合依速度扣值，歸零就發一次事件。
 */

export const STAMINA_BASE_POOL = 100;
export const STAMINA_VIT_FACTOR = 0.8;
/** 暫定：武將生命 886~1704，除以 20 得到與基礎體能同級的 VIT */
export const STAMINA_HP_PER_VIT = 20;
/** 暫定：步兵移動力 1 視為基準速度 */
export const STAMINA_BASE_SPEED = 1;
export const STAMINA_BURN_C = 3;
/** 暫定：規格 WILL 以 600 為中段，士氣與運氣是 0~100，乘 10 換算（同 STR 的換算） */
export const STAMINA_WILL_SCALE = 10;
export const STAMINA_LUK_WEIGHT = 0.5;

function nonNegative(value: number): number {
    return Number.isFinite(value) && value > 0 ? value : 0;
}

/** 總體力庫 = 基礎體能 + VIT × 0.8 × 兵種消耗率；VIT 由武將生命換算。 */
export function staminaPool(generalHp: number, troopBurnRate = 1): number {
    return STAMINA_BASE_POOL + (nonNegative(generalHp) / STAMINA_HP_PER_VIT) * STAMINA_VIT_FACTOR * nonNegative(troopBurnRate);
}

/** WILL = (士氣 + 運氣 × 0.5) × 10，負士氣視為 0，至少 1 以免除以 0。 */
export function willOf(morale: number, luk: number): number {
    return Math.max(1, (nonNegative(morale) + nonNegative(luk) * STAMINA_LUK_WEIGHT) * STAMINA_WILL_SCALE);
}

/** 根性係數 = 1 + 200 / √(600 × WILL)。乘在燃燒量上，WILL 越高越接近 1，燒得越少。 */
export function gutsBurnMultiplier(will: number): number {
    return 1 + 200 / Math.sqrt(600 * Math.max(1, nonNegative(will)));
}

/** 每回合消耗 = (當前速度 − 基準速度 + C)² × 根性係數。 */
export function staminaBurnPerTurn(speed: number, will: number): number {
    const over = Math.max(0, nonNegative(speed) - STAMINA_BASE_SPEED + STAMINA_BURN_C);
    return over * over * gutsBurnMultiplier(will);
}

/** 扣一回合後的剩餘體力，不低於 0。 */
export function burnStamina(current: number, speed: number, will: number): number {
    return Math.max(0, nonNegative(current) - staminaBurnPerTurn(speed, will));
}
