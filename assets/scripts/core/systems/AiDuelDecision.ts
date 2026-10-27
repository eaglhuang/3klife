// @spec-source → AI武將強度系統.md E-7 單挑 AI 決策（PROG-2-1322，WBS AIS-10）
/**
 * AiDuelDecision — 防守方是否接受單挑（純邏輯，不依賴 cc）
 *
 * 公式：duel_score = 0.45 × HP 比 + 0.35 × 分隊兵力比 + 0.20 × 總戰力比，再加上 ±0.05 抖動。
 * 一般難度閾值 0.58；EASY 降到 0.45，即使處境不利也較容易接受。
 *
 * 暫定：HARD 以上「有利時主動發起」不在這裡，屬發起判定，另開卡。
 *
 * Unity 對照：像 AI 的 Decision Score 元件，權重寫在 ScriptableObject 裡，隨機抖動由外部 Random seed 注入。
 */
import type { AiDifficulty } from './AiSpCharge';

/** 規格 E-7 各項權重；三項相加為 1 */
export const DUEL_SCORE_WEIGHT = Object.freeze({
    hp: 0.45,
    squad: 0.35,
    power: 0.2,
});

/** 規格 E-7：一般難度接受閾值 */
export const DUEL_ACCEPT_THRESHOLD = 0.58;

/** 規格 E-7：EASY 接受閾值 */
export const DUEL_ACCEPT_THRESHOLD_EASY = 0.45;

/** 規格 E-7：抖動幅度，roll 0 對應 −0.05、roll 1 對應 +0.05 */
const DUEL_JITTER = 0.05;

export interface DuelScoreInput {
    /** 目前 HP / 最大 HP */
    hpRatio: number;
    /** 場上現存分隊兵力比 */
    squadRatio: number;
    /** 總戰力比 */
    powerRatio: number;
}

function clamp01(value: number): number {
    return Math.min(1, Math.max(0, value));
}

/** 不含抖動的 duel_score；輸入先夾在 0~1。 */
export function duelScoreOf(input: DuelScoreInput): number {
    return DUEL_SCORE_WEIGHT.hp * clamp01(input.hpRatio)
        + DUEL_SCORE_WEIGHT.squad * clamp01(input.squadRatio)
        + DUEL_SCORE_WEIGHT.power * clamp01(input.powerRatio);
}

/** 加上抖動後的 duel_score；roll 為 0~1 的亂數，由呼叫端注入，讓測試可固定結果。 */
export function duelScoreWithJitter(input: DuelScoreInput, roll: number): number {
    const jitter = -DUEL_JITTER + 2 * DUEL_JITTER * clamp01(roll);
    return duelScoreOf(input) + jitter;
}

/** 接受閾值：EASY 為 0.45，其餘為 0.58。 */
export function duelAcceptThresholdOf(difficulty: AiDifficulty): number {
    return difficulty === 'easy' ? DUEL_ACCEPT_THRESHOLD_EASY : DUEL_ACCEPT_THRESHOLD;
}

/** 防守方是否接受單挑；分數達閾值即接受，拒絕時全軍攻防與武將 HP 減半（規格 E-7）。 */
export function decideDuelAccept(input: DuelScoreInput, roll: number, difficulty: AiDifficulty): boolean {
    return duelScoreWithJitter(input, roll) >= duelAcceptThresholdOf(difficulty);
}
