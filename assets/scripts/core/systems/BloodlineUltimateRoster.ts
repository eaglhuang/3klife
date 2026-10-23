// @spec-source → 武將人物介面規格書.md §6.6（五階血脈傳承奧義）、§6.7（升星、覺醒、名聲的分工）；GDUI-07（PROG-2-0714）、PROG-2-0718
/**
 * BloodlineUltimateRoster — 把五階血脈傳承奧義套回名冊武將的純函式（不依賴 cc）
 *
 * BloodlineTransmissionUltimate 只算階段；這裡負責讀取武將身上的 bloodlineUltimate、
 * 用 UltimateProgress 取得名聲與事蹟，回傳「換過欄位的副本」，不修改輸入。
 * 存檔與廣播由 GameSession 負責，與 awakenFactor 相同的分工。
 *
 * Unity 對照：像 ScriptableObject 的 Getter，只算出新狀態，由 Manager 決定何時寫回。
 */
import {
    awakenNextStage,
    normalizeUltimateState,
    raiseStageCap,
    type UltimateAwakenReason,
} from './BloodlineTransmissionUltimate';
import { ultimateProgressOf, type UltimateProgressSource } from './UltimateProgress';

export interface BloodlineUltimateHolder extends UltimateProgressSource {
    bloodlineUltimate?: { stageCap?: number; stageCurrent?: number };
}

/** 升星：提高 Stage_Cap，回傳新副本；不會降低既有上限 */
export function raiseBloodlineUltimateCap<T extends BloodlineUltimateHolder>(general: T, stars: number): T {
    const next = raiseStageCap(normalizeUltimateState(general.bloodlineUltimate), stars);
    return { ...general, bloodlineUltimate: next };
}

export type BloodlineUltimateAwakenResult<T> =
    | { ok: true; general: T; awakenedStage: number }
    | { ok: false; reason: UltimateAwakenReason };

/**
 * 覺醒下一階：依名聲與事蹟判定，成功回傳新副本，失敗回傳第一個擋下的原因且不改資料。
 * progress 沒給時沿用武將自身的 fame／incidents／epicIncidents（PROG-2-0741 之前的讀法）。
 */
export function awakenBloodlineUltimate<T extends BloodlineUltimateHolder>(
    general: T,
    progress?: UltimateProgressSource,
): BloodlineUltimateAwakenResult<T> {
    const result = awakenNextStage(normalizeUltimateState(general.bloodlineUltimate), ultimateProgressOf(progress ?? general));
    if (result.ok === false) return result;
    return { ok: true, general: { ...general, bloodlineUltimate: result.state }, awakenedStage: result.awakenedStage };
}
