// @spec-source → 戰場適性系統.md §O 戰前天氣顯示；PROG-2-9735
/**
 * WeatherEffectText — 戰前顯示用的天氣效果描述（純邏輯，不依賴 cc）
 *
 * 描述一律從現有效果數值產生（WeatherTacticRestriction 的命中、射程、火計規則），
 * 不另外寫死一份文字；效果數值改了，顯示自動跟著變。
 */
import { Weather } from '../../shared/CommonEnums';
import { WEATHER_LABEL } from '../../shared/BattleEntryParams';
import {
    checkTacticWeather,
    FIRE_TAG,
    fireDamageMultiplier,
    floodDepthBonus,
    weatherRangedHitDelta,
    weatherRangedRangeDelta,
} from './WeatherTacticRestriction';

/** 這個天氣的效果片段；晴天等沒有特殊效果時回空陣列 */
export function weatherEffectParts(weather: Weather): string[] {
    const parts: string[] = [];
    const hit = weatherRangedHitDelta(weather);
    if (hit !== 0) parts.push(`遠程命中 ${hit > 0 ? '+' : ''}${Math.round(hit * 100)}%`);
    const range = weatherRangedRangeDelta(weather);
    if (range !== 0) parts.push(`遠程射程 ${range > 0 ? '+' : ''}${range}`);
    if (!checkTacticWeather([FIRE_TAG], weather).allowed) parts.push('火計禁用');
    const fire = fireDamageMultiplier([FIRE_TAG], weather);
    if (fire !== 1) parts.push(`火計傷害 ×${fire}`);
    const flood = floodDepthBonus(weather);
    if (flood > 0) parts.push(`水攻範圍 +${flood} 格`);
    return parts;
}

/** 戰前一行：「天氣：大霧（遠程命中 -30%、火計禁用）」；沒有特殊效果時不加括號 */
export function weatherPreBattleLine(weather: Weather): string {
    const name = WEATHER_LABEL[weather] ?? weather;
    const parts = weatherEffectParts(weather);
    return parts.length > 0 ? `天氣：${name}（${parts.join('、')}）` : `天氣：${name}`;
}
