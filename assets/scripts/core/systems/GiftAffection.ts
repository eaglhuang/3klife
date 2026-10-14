// @spec-source → 傭兵系統規格書／遊戲系統：結緣與送禮（送禮增加好感，好感越高轉化機率越高）；FEM-08（PROG-2-0562）
/**
 * GiftAffection — 送禮好感度與轉化機率加成（純邏輯，不依賴 cc）
 *
 * - 好感範圍 0~100，送禮可增加或減少（負值），超出範圍夾回。
 * - 轉化加成：好感 100 時 +30%，線性（暫定，規格未給數值）。
 * - 轉化機率封頂 1。
 *
 * Unity 對照：像一條 AnimationCurve，好感當 X 軸，輸出的加成當 Y 軸，再加到基礎機率上。
 */

export const GIFT_AFFECTION_MIN = 0;
export const GIFT_AFFECTION_MAX = 100;
/** 好感滿 100 時的轉化機率加成（暫定） */
export const GIFT_CONVERSION_MAX_BONUS = 0.3;

function clampAffection(value: number): number {
    return Math.min(GIFT_AFFECTION_MAX, Math.max(GIFT_AFFECTION_MIN, value));
}

/** 送禮後的好感值；非有限數字視為 0 的增量 */
export function applyGiftAffection(current: number, giftValue: number): number {
    const delta = Number.isFinite(giftValue) ? giftValue : 0;
    return clampAffection(current + delta);
}

/** 好感造成的轉化機率加成（0 ~ GIFT_CONVERSION_MAX_BONUS） */
export function conversionBonusOf(affection: number): number {
    return (clampAffection(affection) / GIFT_AFFECTION_MAX) * GIFT_CONVERSION_MAX_BONUS;
}

/** 轉化機率 = 基礎機率 + 好感加成，封頂 1 */
export function conversionChanceOf(baseChance: number, affection: number): number {
    return Math.min(1, baseChance + conversionBonusOf(affection));
}
