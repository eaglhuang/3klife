// @spec-source → AI武將強度系統.md E-8 難度自適應（選配）、G-2 難度提示文案；WBS AIS-11
/**
 * AiAdaptiveDifficulty — 依玩家連勝／連敗微調 AI 強度（純邏輯，不依賴 cc）
 *
 * 規則（E-8）：連續 3 場勝利 → 敵方縮放 +0.1；連續 3 場失敗 → −0.1；結果夾在 0.7~2.5。
 * 暫定：平手視為打斷連勝與連敗，兩個計數都歸零（規格未定義平手）。
 * 注意：E-8 字面公式在失敗那一項寫成「+0.1」，但註解與 G-2 文案都是「下調」，本實作依註解與文案（待企劃確認）。
 *
 * 計數存在存檔的選填欄位 aiAdaptiveStreak；缺值視為 0（不升版號）。
 *
 * Unity 對照：像一個 Difficulty Director 記錄玩家最近幾場的勝負，超過門檻就把敵人的 Stat 倍率往上或往下推一小步。
 */

/** 規格 E-8：連續幾場才觸發 */
export const ADAPTIVE_STREAK_THRESHOLD = 3;
/** 規格 E-8：每次調整的幅度 */
export const ADAPTIVE_STEP = 0.1;
/** 規格 E-8：自適應倍率下限與上限 */
export const ADAPTIVE_SCALE_MIN = 0.7;
export const ADAPTIVE_SCALE_MAX = 2.5;

export interface AiAdaptiveStreak {
    consecutiveWins: number;
    consecutiveLosses: number;
}

export const EMPTY_AI_ADAPTIVE_STREAK: Readonly<AiAdaptiveStreak> = Object.freeze({
    consecutiveWins: 0,
    consecutiveLosses: 0,
});

export type AdaptiveBattleResult = 'player-win' | 'enemy-win' | 'draw';

function countOf(value: unknown): number {
    return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : 0;
}

/** 讀存檔時用：缺欄位、非整數或負數一律視為 0 */
export function normalizeAiAdaptiveStreak(raw: unknown): AiAdaptiveStreak {
    if (!raw || typeof raw !== 'object') return { ...EMPTY_AI_ADAPTIVE_STREAK };
    const record = raw as Record<string, unknown>;
    return {
        consecutiveWins: countOf(record.consecutiveWins),
        consecutiveLosses: countOf(record.consecutiveLosses),
    };
}

/** 一場戰鬥結束後的連勝連敗計數 */
export function nextAiAdaptiveStreak(streak: AiAdaptiveStreak, result: AdaptiveBattleResult): AiAdaptiveStreak {
    if (result === 'player-win') return { consecutiveWins: streak.consecutiveWins + 1, consecutiveLosses: 0 };
    if (result === 'enemy-win') return { consecutiveWins: 0, consecutiveLosses: streak.consecutiveLosses + 1 };
    return { consecutiveWins: 0, consecutiveLosses: 0 };
}

/** 自適應後的縮放倍率：基礎倍率 ±0.1（達 3 場），四捨五入到小數兩位，夾在 0.7~2.5。 */
export function adaptiveScaleOf(baseScale: number, streak: AiAdaptiveStreak): number {
    let scale = baseScale;
    if (streak.consecutiveWins >= ADAPTIVE_STREAK_THRESHOLD) scale += ADAPTIVE_STEP;
    if (streak.consecutiveLosses >= ADAPTIVE_STREAK_THRESHOLD) scale -= ADAPTIVE_STEP;
    const rounded = Math.round(scale * 100) / 100;
    return Math.min(ADAPTIVE_SCALE_MAX, Math.max(ADAPTIVE_SCALE_MIN, rounded));
}

/** 開戰提示文案（G-2）：自適應上調或下調時回傳文案，沒有變化回傳 null。 */
export function adaptiveHintOf(baseScale: number, adaptiveScale: number): string | null {
    if (adaptiveScale > baseScale) return '敵軍增援抵達，敵方士氣高漲！';
    if (adaptiveScale < baseScale) return '敵軍糧草不濟，士氣低落。';
    return null;
}
