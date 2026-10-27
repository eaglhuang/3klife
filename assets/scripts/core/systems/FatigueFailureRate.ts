// @spec-source → 育成與戰鬥公式基準手冊 §2.2 疲勞度與失敗率曲線；WBS FORM-02（PROG-2-1268）
/**
 * FatigueFailureRate — 體力比例對應的失敗率（純邏輯，不依賴 cc）
 *
 * 三段區間：
 *   - 安全區：體力 ≥ 70%，失敗率 0%。
 *   - 風險區：體力 30%～70%，失敗率由 5% 爬升至 35%。
 *   - 危險區：體力 < 30%，失敗率由 40% 爬升至 99%。
 *
 * 暫定：
 *   - 規格寫「指數型」但只給端點範圍。風險區用 5% + 30% × t²，危險區用 40% + 59% × t，
 *     t 為該區間內的進度（0..1）。端點與規格一致，中段形狀待企劃確認。
 *   - 輸入為體力比例 0..1，超出範圍會夾住；非有限值視為 0（失敗率 0）。
 *
 * Unity 對照：像一條分段 AnimationCurve，在 70% 與 30% 處各有一個 Key，中間用不同的 easing。
 */

/** 安全區下限（含）：體力比例達到此值以上失敗率為 0 */
export const FATIGUE_SAFE_RATIO = 0.7;
/** 危險區上限（不含）：體力比例低於此值進入危險區 */
export const FATIGUE_DANGER_RATIO = 0.3;

/** 體力比例（0..1）→ 失敗率（0..1） */
export function fatigueFailureRate(staminaRatio: number): number {
    if (!Number.isFinite(staminaRatio)) return 0;
    const s = Math.max(0, Math.min(1, staminaRatio));
    if (s >= FATIGUE_SAFE_RATIO) return 0;
    if (s >= FATIGUE_DANGER_RATIO) {
        const t = (FATIGUE_SAFE_RATIO - s) / (FATIGUE_SAFE_RATIO - FATIGUE_DANGER_RATIO);
        return 0.05 + 0.3 * t * t;
    }
    const t = (FATIGUE_DANGER_RATIO - s) / FATIGUE_DANGER_RATIO;
    return 0.4 + 0.59 * t;
}
