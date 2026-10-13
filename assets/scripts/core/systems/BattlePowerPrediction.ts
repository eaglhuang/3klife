// @spec-source → 數值系統.md §F-4 戰役勝敗快速預判（predictBattleOutcome，PROG-2-0208，WBS NUM-14 的預判部分）
/**
 * BattlePowerPrediction — 雙方總戰力比值的勝率預判（純邏輯，不依賴 cc）
 *
 * 規格明寫的部分：勝率 = 0.5 + (攻 / 守 − 1) × 0.6，夾在 5%~95%；結果依勝率分三段。
 * 規格沒寫的部分：總戰力 calculateBattlePowerRating 用到的常數（AGE_MODIFIER、各種 CAP）與
 * 地形 / 天氣 / 虎符查表函式，本卡不做，留給後續卡；這裡只接收已算好的兩個戰力數值。
 *
 * Unity 對照：像戰前的 Odds 顯示，輸入兩邊的 CP，輸出一個百分比與標籤，不改任何戰鬥狀態。
 */

export const PREDICTION_WIN_RATE_MIN = 0.05;
export const PREDICTION_WIN_RATE_MAX = 0.95;
export const PREDICTION_RATIO_SLOPE = 0.6;

export type PredictionResult = '攻方優勢' | '勢均力敵' | '攻方劣勢';

export interface BattleOutcomePrediction {
    /** 攻方勝率（整數百分比，0~100） */
    winRate: number;
    result: PredictionResult;
}

/** 攻方與守方的總戰力比值預判。守方戰力低於 1 時以 1 計，避免除以零。 */
export function predictBattleOutcome(attackerPower: number, defenderPower: number): BattleOutcomePrediction {
    const ratio = attackerPower / Math.max(1, defenderPower);
    const raw = 0.5 + (ratio - 1) * PREDICTION_RATIO_SLOPE;
    const winRate = Math.min(PREDICTION_WIN_RATE_MAX, Math.max(PREDICTION_WIN_RATE_MIN, raw));
    const result: PredictionResult = winRate > 0.65 ? '攻方優勢' : winRate > 0.45 ? '勢均力敵' : '攻方劣勢';
    return { winRate: Math.round(winRate * 100), result };
}
