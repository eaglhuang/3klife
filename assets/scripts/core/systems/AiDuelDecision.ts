// @spec-source → AI武將強度系統.md E-7 單挑 AI 決策（PROG-2-1322，WBS AIS-10）
/**
 * AiDuelDecision — 防守方是否接受單挑（純邏輯，不依賴 cc）
 *
 * 公式：duel_score = 0.45 × HP 比 + 0.35 × 分隊兵力比 + 0.20 × 總戰力比，再加上 ±0.05 抖動。
 * 接受閾值由難度表 duelAcceptThreshold 提供（EASY 0.45、其餘 0.58）。
 *
 * 發起判定（PROG-2-1470）：HARD 以上敵將只在有利時發起，見 aiShouldInitiateDuel。
 *
 * Unity 對照：像 AI 的 Decision Score 元件，權重寫在 ScriptableObject 裡，隨機抖動由外部 Random seed 注入。
 */
/** 規格 E-7 各項權重；三項相加為 1 */
export const DUEL_SCORE_WEIGHT = Object.freeze({
    hp: 0.45,
    squad: 0.35,
    power: 0.2,
});

/**
 * 規格 E-7：一般閾值 0.58。玩家防守沿用此值；敵方 AI 防守的閾值讀難度表 duelAcceptThreshold（PROG-2-1325），
 * 只有未設定難度表時才退回此值。
 */
export const DUEL_ACCEPT_THRESHOLD = 0.58;

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

/** 防守方是否接受單挑；分數達閾值即接受，拒絕時全軍攻防與武將 HP 減半（規格 E-7）。閾值由呼叫端傳入（難度表）。 */
export function decideDuelAccept(input: DuelScoreInput, roll: number, threshold: number): boolean {
    return duelScoreWithJitter(input, roll) >= threshold;
}

/**
 * 暫定（PROG-2-1470）：防守方單挑分數不高於此值，才算發起方「有利」。
 * 0.5 = 防守方在 HP、兵力、戰力加權上不佔上風。
 */
export const AI_DUEL_INITIATE_MAX_DEFENDER_SCORE = 0.5;

/** 規格 E-7「HARD+ 有利時主動發起」適用的 IQ；LOW、MEDIUM 推進到敵將面前就發起 */
const DUEL_INITIATE_EVALUATING_IQ: readonly string[] = ['HIGH', 'EXTREME', 'PERFECT'];

/**
 * 敵將推進到我將面前時是否發起單挑。
 * iq 為 null（未套難度表）、LOW、MEDIUM：一律發起（沿用既有行為）。
 * HIGH 以上：只在我方防守分數 ≤ AI_DUEL_INITIATE_MAX_DEFENDER_SCORE 時發起。
 */
export function aiShouldInitiateDuel(iq: string | null, defenderScore: number): boolean {
    if (!iq || !DUEL_INITIATE_EVALUATING_IQ.includes(iq)) return true;
    return defenderScore <= AI_DUEL_INITIATE_MAX_DEFENDER_SCORE;
}
