// @spec-source → AI武將強度系統.md E-2 AI 武將屬性縮放；數值系統.md E-6 年齡階段能力修正（PROG-2-1315，WBS AIS-02）
/**
 * AiStatScaling — AI 武將屬性、EP、精力與轉生次數的縮放（純邏輯，不依賴 cc）
 *
 * 公式：AI 屬性 = 模板基礎值 × 難度縮放 × 章節修正 × 年齡修正。
 * 難度縮放直接取 AiDifficultyEntry.statScale（PROG-2-1314 的難度表），不在這裡重複定義。
 *
 * 暫定：章節修正超過 Ch3 後仍每章 +0.1（規格只寫到 Ch3）；屬性與精力無條件捨去，與 AiSpCharge 一致；
 * EP 的亂數由呼叫端傳入 roll（0~1），映射到規格的 0.9~1.1，讓測試可以固定結果。
 *
 * Unity 對照：像 Stat Scaler 元件，Base 值乘上 Difficulty、Chapter、Age 三個 ScriptableObject 的係數，
 * 亂數由外部 Random seed 注入，而不是在元件裡直接呼叫 Random。
 */
import type { AiDifficultyEntry } from './AiDifficultyTable';

/** 年齡階段（數值系統 E-6）；幼兒不可用，故不列入。 */
export type AiAgeStage = 'Youth' | 'Prime' | 'Peak' | 'Elder' | 'Over';

/** 年齡階段能力修正：少年 0.6、青年 1.0、壯年（巔峰）1.1、老年 0.8、超齡 0.5。 */
export const AI_AGE_MODIFIER: Readonly<Record<AiAgeStage, number>> = Object.freeze({
    Youth: 0.6,
    Prime: 1.0,
    Peak: 1.1,
    Elder: 0.8,
    Over: 0.5,
});

/** 章節修正每章增量（Ch1 = 1.0） */
export const AI_CHAPTER_MODIFIER_STEP = 0.1;

/** 轉生次數上限（規格：min(5, ...)） */
export const AI_REINCARNATION_CAP = 5;

/** AI 精力的基準值（規格：100 × Difficulty_Scale） */
const AI_VITALITY_BASE = 100;

/** AI EP 亂數區間（規格：Random(0.9, 1.1)） */
const AI_EP_RANDOM_MIN = 0.9;
const AI_EP_RANDOM_MAX = 1.1;

/** 章節修正：Ch1 = 1.0，之後每章 +0.1；章節小於 1 視為 Ch1。精度取到小數兩位，避免浮點誤差。 */
export function aiChapterModifierOf(chapter: number): number {
    const safeChapter = Math.max(1, Math.floor(chapter));
    return Math.round((1 + AI_CHAPTER_MODIFIER_STEP * (safeChapter - 1)) * 100) / 100;
}

/** AI 武將屬性 = 模板基礎值 × 難度縮放 × 章節修正 × 年齡修正，無條件捨去。 */
export function aiStatOf(
    templateBase: number,
    difficulty: Pick<AiDifficultyEntry, 'statScale'>,
    chapter: number,
    age: AiAgeStage,
): number {
    return Math.floor(templateBase * difficulty.statScale * aiChapterModifierOf(chapter) * AI_AGE_MODIFIER[age]);
}

/**
 * AI 武將 EP = 模板 EP × 難度縮放 × Random(0.9, 1.1)，無條件捨去。
 * roll 為 0 以上、1 以下的亂數；0 對應 0.9 倍，1 對應 1.1 倍。
 */
export function aiEpOf(templateEp: number, difficulty: Pick<AiDifficultyEntry, 'statScale'>, roll: number): number {
    const clampedRoll = Math.min(1, Math.max(0, roll));
    const randomMod = AI_EP_RANDOM_MIN + (AI_EP_RANDOM_MAX - AI_EP_RANDOM_MIN) * clampedRoll;
    return Math.floor(templateEp * difficulty.statScale * randomMod);
}

/** AI 精力（簡化：永遠充足）= 100 × 難度縮放，無條件捨去。 */
export function aiVitalityOf(difficulty: Pick<AiDifficultyEntry, 'statScale'>): number {
    return Math.floor(AI_VITALITY_BASE * difficulty.statScale);
}

/** AI 轉生次數 = min(5, floor(章節 / 3) + 難度加成)。章節小於 1 視為 Ch1。 */
export function aiReincarnationOf(
    chapter: number,
    difficulty: Pick<AiDifficultyEntry, 'difficultyBonus'>,
): number {
    const safeChapter = Math.max(1, Math.floor(chapter));
    return Math.min(AI_REINCARNATION_CAP, Math.floor(safeChapter / 3) + difficulty.difficultyBonus);
}

/** 年齡轉年齡階段（數值系統 E-6）：65 以上超齡、55 老年、40 壯年、15 青年、其餘（含幼兒）為少年。 */
export function aiAgeStageOf(age: number): AiAgeStage {
    if (age >= 65) return 'Over';
    if (age >= 55) return 'Elder';
    if (age >= 40) return 'Peak';
    if (age >= 15) return 'Prime';
    return 'Youth';
}

/** 敵將 config 中會被縮放的數值（hp 與精力不在規格的 AI_Stat 範圍內，不縮放）。 */
export interface AiScalableGeneralConfig {
    str?: number;
    int?: number;
    lea?: number;
    luk?: number;
    age?: number;
}

const AI_SCALED_STAT_KEYS = ['str', 'int', 'lea', 'luk'] as const;

/**
 * 回傳縮放後的敵將 config（不改傳入物件）：只縮放有值的 str、int、lea、luk；
 * 缺 age 時視為青年（修正 1.0），與規格預設一致。
 *
 * 暫定：呼叫端在建立 GeneralUnit 前先用這個函式處理 config，避免改到 readonly 欄位。
 */
export function scaleAiEnemyConfig<T extends AiScalableGeneralConfig>(
    config: T,
    difficulty: Pick<AiDifficultyEntry, 'statScale'>,
    chapter: number,
): T {
    const age = config.age === undefined ? 'Prime' : aiAgeStageOf(config.age);
    const scaled: AiScalableGeneralConfig = {};
    for (const key of AI_SCALED_STAT_KEYS) {
        const value = config[key];
        if (value !== undefined) scaled[key] = aiStatOf(value, difficulty, chapter, age);
    }
    return { ...config, ...scaled };
}
