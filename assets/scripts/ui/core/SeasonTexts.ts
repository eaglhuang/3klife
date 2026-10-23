/**
 * 大廳季節文案（PROG-2-0730，承接 TIME-09 / PROG-2-0727）。純邏輯，不依賴 cc。
 *
 * 規格：遊戲時間系統.md；語系來源：resources/i18n/{locale}.json 的 ui.season.display。
 * 與 GameClock.formatSeasonLabel 的 zh-TW 輸出一致；語系表沒有該 key 時退回同一句中文。
 */
import { BreedTextLookup, fillBreedText } from './BreedingTexts';
import type { GameTimeState, SeasonIndex } from '../../core/systems/GameClock';
import { seasonModifiersOf } from '../../core/systems/SeasonModifiers';

export const SEASON_DISPLAY_KEY = 'ui.season.display';

/** zh-TW 預設：與 GameClock.formatSeasonLabel 相同的句型 */
export const SEASON_DISPLAY_FALLBACK_ZH_TW = '第 {0} 年 {1} 季';

/** 「第 N 年 M 季」：語系表查到 ui.season.display 就用它，查不到（回傳 key 本身）退回 zh-TW 預設 */
export function seasonDisplayText(lookup: BreedTextLookup, state: Pick<GameTimeState, 'currentYear' | 'currentSeason'>): string {
    const args = [String(state.currentYear), String(state.currentSeason)];
    const localized = lookup(SEASON_DISPLAY_KEY, ...args);
    return localized === SEASON_DISPLAY_KEY ? fillBreedText(SEASON_DISPLAY_FALLBACK_ZH_TW, args) : localized;
}

/** 季節效果提示的 zh-TW 預設：只列已接線的效果（春稅收、夏建設尚無系統，不列出） */
export const SEASON_EFFECT_FALLBACK_ZH_TW = {
    none: '本季無特殊效果',
    training: '訓練體力消耗 ×{0}',
    food: '糧草補給 ×{0}',
    travel: '趕路 +{0} 回合',
    conception: '受孕率 ×{0}',
} as const;

export type SeasonEffectName = keyof typeof SEASON_EFFECT_FALLBACK_ZH_TW;

const SEASON_EFFECT_SEPARATOR = ' · ';

function seasonEffectText(lookup: BreedTextLookup, name: SeasonEffectName, value?: number): string {
    const key = `ui.season.effect.${name}`;
    const args = value === undefined ? [] : [String(value)];
    const localized = lookup(key, ...args);
    return localized === key ? fillBreedText(SEASON_EFFECT_FALLBACK_ZH_TW[name], args) : localized;
}

/** 大廳季節效果提示：列出目前季已接線的修正（不為 1 或 0 者才列），全部中立時顯示「本季無特殊效果」 */
export function seasonEffectHintText(lookup: BreedTextLookup, season: SeasonIndex): string {
    const modifier = seasonModifiersOf(season);
    const parts: string[] = [];
    if (modifier.trainingStaminaMultiplier !== 1) parts.push(seasonEffectText(lookup, 'training', modifier.trainingStaminaMultiplier));
    if (modifier.foodMultiplier !== 1) parts.push(seasonEffectText(lookup, 'food', modifier.foodMultiplier));
    if (modifier.travelTurnsDelta !== 0) parts.push(seasonEffectText(lookup, 'travel', modifier.travelTurnsDelta));
    if (modifier.conceptionMultiplier !== 1) parts.push(seasonEffectText(lookup, 'conception', modifier.conceptionMultiplier));
    return parts.length > 0 ? parts.join(SEASON_EFFECT_SEPARATOR) : seasonEffectText(lookup, 'none');
}
