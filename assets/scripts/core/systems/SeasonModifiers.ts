// @spec-source → 遊戲時間系統.md（TIME-08 季度事件與四季特色）
/**
 * SeasonModifiers — 四季特色修正表（純邏輯，不依賴 cc）
 *
 * 春 稅收結算、夏 建設效率 ×2、秋 糧草收入高峰、冬 行軍 -1 回合、結緣佳期（受孕率 +10%）。
 * 數值由設定檔 season-modifiers.json 提供；缺欄位或壞值退回預設，舊存檔與缺檔不會壞。
 *
 * Unity 對照：像 ScriptableObject 的 SeasonConfig，缺欄位時用程式內建的預設值補上。
 */
import type { SeasonIndex } from './GameClock';

export interface SeasonModifier {
    /** 稅收倍率（春；尚無稅收系統，暫未接線） */
    taxMultiplier: number;
    /** 建設效率倍率（夏；尚無建設系統，暫未接線） */
    constructionMultiplier: number;
    /** 訓練體力消耗倍率（夏；暫定值，尚無接線點） */
    trainingStaminaMultiplier: number;
    /** 糧草補給倍率（秋；暫定值，已接季末補給） */
    foodMultiplier: number;
    /** 受孕率倍率（冬；已接結緣） */
    conceptionMultiplier: number;
    /** 趕路回合增減（冬 -1 行軍速度 = 多 1 回合；已接趕路） */
    travelTurnsDelta: number;
}

export type SeasonModifierConfig = Record<SeasonIndex, SeasonModifier>;

const NEUTRAL: SeasonModifier = {
    taxMultiplier: 1,
    constructionMultiplier: 1,
    trainingStaminaMultiplier: 1,
    foodMultiplier: 1,
    conceptionMultiplier: 1,
    travelTurnsDelta: 0,
};

/** 預設值（與 season-modifiers.json 一致）；暫定數值見各欄註解 */
export const DEFAULT_SEASON_MODIFIERS: Readonly<SeasonModifierConfig> = {
    1: { ...NEUTRAL },
    2: { ...NEUTRAL, constructionMultiplier: 2, trainingStaminaMultiplier: 1.25 },
    3: { ...NEUTRAL, foodMultiplier: 1.5 },
    4: { ...NEUTRAL, conceptionMultiplier: 1.1, travelTurnsDelta: 1 },
};

const SEASONS: readonly SeasonIndex[] = [1, 2, 3, 4];

function numberOr(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function integerOr(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isInteger(value) ? value : fallback;
}

/** 讀入設定檔的原始物件；缺季、缺欄位、型別錯誤皆退回預設值 */
export function normalizeSeasonModifiers(raw: unknown): SeasonModifierConfig {
    const seasons = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>).seasons : undefined;
    const source = seasons && typeof seasons === 'object' ? (seasons as Record<string, unknown>) : {};
    const out = {} as SeasonModifierConfig;
    for (const season of SEASONS) {
        const base = DEFAULT_SEASON_MODIFIERS[season];
        const row = source[String(season)];
        const r = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
        out[season] = {
            taxMultiplier: numberOr(r.taxMultiplier, base.taxMultiplier),
            constructionMultiplier: numberOr(r.constructionMultiplier, base.constructionMultiplier),
            trainingStaminaMultiplier: numberOr(r.trainingStaminaMultiplier, base.trainingStaminaMultiplier),
            foodMultiplier: numberOr(r.foodMultiplier, base.foodMultiplier),
            conceptionMultiplier: numberOr(r.conceptionMultiplier, base.conceptionMultiplier),
            travelTurnsDelta: integerOr(r.travelTurnsDelta, base.travelTurnsDelta),
        };
    }
    return out;
}

/** 目前季的修正；config 未指定時用預設表 */
export function seasonModifiersOf(season: SeasonIndex, config: Readonly<SeasonModifierConfig> = DEFAULT_SEASON_MODIFIERS): SeasonModifier {
    return config[season] ?? DEFAULT_SEASON_MODIFIERS[season];
}
