// @spec-source → WBS v3 MERC-03（6 日結義倒數與每日好感：+10，最大 60）；傭兵系統規格書：試用轉永久 §3（六日對飲）
/**
 * MercenaryAffection — 傭兵試用期間的每日好感（結義進度的一部分）純邏輯，不依賴 cc。
 *
 * 好感與 MercenaryBond 的 bond（已完成天數）分開記錄：本模組只處理好感數值，
 * 不推進試用天數，也不決定結義。尚未接到大廳、薪水或存檔；
 * 接線時由呼叫端把每日推進與好感加成一起呼叫。
 *
 * Unity 對照：像 Slider 的 value 夾在 [0, max]，每天 Add(10) 後 Mathf.Min 到上限。
 */

export const AFFECTION_PER_DAY = 10;
export const AFFECTION_CAP = 60;

export interface AffectionResult {
    affection: number;
    /** 本次實際增加量；已達上限時為 0。 */
    gained: number;
    /** 是否已達上限（之後每日好感不再增加）。 */
    capped: boolean;
}

function assertAffection(value: number): void {
    if (!Number.isFinite(value) || value < 0 || value > AFFECTION_CAP) {
        throw new RangeError(`好感必須為 0~${AFFECTION_CAP} 的有限數值`);
    }
}

/**
 * 每日好感加成：+10，最大 60。回傳新值，不改輸入、不用亂數、不寫存檔。
 */
export function applyDailyAffection(current: number): AffectionResult {
    assertAffection(current);
    const next = Math.min(AFFECTION_CAP, current + AFFECTION_PER_DAY);
    return { affection: next, gained: next - current, capped: next === AFFECTION_CAP };
}
