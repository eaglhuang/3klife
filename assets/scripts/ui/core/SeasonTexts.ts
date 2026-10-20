/**
 * 大廳季節文案（PROG-2-0730，承接 TIME-09 / PROG-2-0727）。純邏輯，不依賴 cc。
 *
 * 規格：遊戲時間系統.md；語系來源：resources/i18n/{locale}.json 的 ui.season.display。
 * 與 GameClock.formatSeasonLabel 的 zh-TW 輸出一致；語系表沒有該 key 時退回同一句中文。
 */
import { BreedTextLookup, fillBreedText } from './BreedingTexts';
import type { GameTimeState } from '../../core/systems/GameClock';

export const SEASON_DISPLAY_KEY = 'ui.season.display';

/** zh-TW 預設：與 GameClock.formatSeasonLabel 相同的句型 */
export const SEASON_DISPLAY_FALLBACK_ZH_TW = '第 {0} 年 {1} 季';

/** 「第 N 年 M 季」：語系表查到 ui.season.display 就用它，查不到（回傳 key 本身）退回 zh-TW 預設 */
export function seasonDisplayText(lookup: BreedTextLookup, state: Pick<GameTimeState, 'currentYear' | 'currentSeason'>): string {
    const args = [String(state.currentYear), String(state.currentSeason)];
    const localized = lookup(SEASON_DISPLAY_KEY, ...args);
    return localized === SEASON_DISPLAY_KEY ? fillBreedText(SEASON_DISPLAY_FALLBACK_ZH_TW, args) : localized;
}
