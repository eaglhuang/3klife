// @spec-source → 經濟系統.md「地窖保護與每日補貼」CELLAR_PROTECTION；Data Schema 文件 Player_Economy.Resource_Protection（PROG-2-1341，ECO-06）
/**
 * CellarProtection — 地窖保護（純邏輯，不依賴 cc）
 *
 * - 戰敗後糧草／黃金不會被扣到保底值以下，避免連續戰敗把玩家打到零資源。
 * - 保底只保「戰前已有的量」：戰前已低於保底時不再扣，但也不會補（補是每日補貼的事）。
 * - 保底值依經濟系統表（暫定，待設定表覆寫）。
 *
 * Unity 對照：像受傷後 HP 夾在 Mathf.Max(minHp, hp) 的保命規則，只是下限不超過受傷前的值。
 */

export const CELLAR_PROTECTION = Object.freeze({
    foodFloor: 1500,
    goldFloor: 600,
    triggerAfterFailedDefense: true,
});

/** 扣減後的保底結果：after 為套用保護後的量，saved 為被保住的量（沒觸發為 0） */
export interface CellarProtectionResult {
    after: number;
    saved: number;
}

/** 戰敗扣減後不低於 min(戰前, 保底)；沒有扣減或扣後仍在保底以上時不觸發。 */
export function protectedAfterLoss(before: number, after: number, floor: number): CellarProtectionResult {
    const keep = Math.max(0, Math.min(before, Math.floor(floor)));
    if (after >= keep) return { after, saved: 0 };
    return { after: keep, saved: keep - after };
}
