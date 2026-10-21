// @spec-source → WBS v3 MERC-03（6 日結義倒數與每日好感：+10，最大 60）；傭兵系統規格書：試用轉永久 §3（六日對飲）
/**
 * MercenaryTrialDay — 試用中傭兵的單日推進：倒數 −1、結義進度 +1，同日好感 +10（上限 60），純邏輯，不依賴 cc。
 *
 * - 好感存在傭兵狀態的 affection 欄位（選填，缺省視為 0）。
 * - 非試用中或倒數已完成時不推進，好感也不變。
 * - 第 6 天結束時倒數歸零，若好感已達 60，即可結義（門檻見 MercenaryRoster）。
 *
 * 尚未接到每日時間軸（GameSession 的日推進），由後續卡接線。
 * Unity 對照：像一個 Timer 的 Tick：每 Tick 同時減倒數、加 Slider 的值，並夾在上限。
 */
import { advanceMercenaryDay, MercenaryResult, MercenaryState } from './MercenaryBond';
import { applyDailyAffection } from './MercenaryAffection';
import { advanceIllustrationStage } from './MercenaryIllustration';

export interface TrialDayResult extends MercenaryResult {
    /** 本日好感實際增加量；推進失敗時為 0。 */
    affectionGained: number;
}

/** 推進一天試用：倒數與好感一起更新，回傳新狀態，不改輸入、不用亂數、不寫存檔。 */
export function advanceTrialDay(source: Readonly<MercenaryState>): TrialDayResult {
    const advanced = advanceMercenaryDay({ ...source });
    if (!advanced.ok) {
        return { ...advanced, affectionGained: 0 };
    }
    const affection = applyDailyAffection(source.affection ?? 0);
    const illustrationStage = advanceIllustrationStage(source.illustrationStage ?? 1, affection.affection);
    return {
        ...advanced,
        state: { ...advanced.state, affection: affection.affection, illustrationStage },
        affectionGained: affection.gained,
    };
}
