// @spec-source → 戰場適性系統.md §天氣對戰法與機制的強約束（Weather Constraints）；PROG-2-0406（WBS APT-07）
/**
 * WeatherTacticRestriction — 天氣對戰法的強約束（純邏輯，不依賴 cc）
 *
 * 規則（規格表）：
 *   - 火計／火箭：雨天、大霧、雷暴禁用（HUD 變灰、點擊出 Toast）；大風傷害 ×2。
 *   - 水攻（場景戰法 flood-attack）：雨天範圍擴大。
 *
 * 暫定（待 PM 裁定）：
 *   - 火計類戰法只認 FIRE_TACTIC_IDS；目前只有 tactic-fire-scheme。赤壁焚風等其他火攻不在內。
 *   - 水攻雨天擴大的格數 RAIN_FLOOD_DEPTH_BONUS = 1（規格只寫「範圍擴大」）。
 *
 * 本模組只給判定結果，不改戰場狀態；HUD 變灰與傷害接線由後續卡處理。
 */
import { Weather } from '../../shared/CommonEnums';

/** 火計類戰法（暫定清單，見檔頭） */
export const FIRE_TACTIC_IDS: readonly string[] = ['tactic-fire-scheme'];

/** 水攻雨天額外擴大的深度格數（暫定） */
export const RAIN_FLOOD_DEPTH_BONUS = 1;

/** 天氣下火計禁用 */
const FIRE_BLOCKED_WEATHER: ReadonlySet<Weather> = new Set([Weather.Rain, Weather.Fog, Weather.Thunder]);

export interface WeatherTacticCheck {
    allowed: boolean;
    /** 不允許時的 Toast 文字；允許時為 null */
    reason: string | null;
}

export const WEATHER_RESTRICTION_TOAST = '當前天氣不符合施放限制';

export function isFireTactic(tacticId: string): boolean {
    return FIRE_TACTIC_IDS.includes(tacticId);
}

/** 判斷某天氣下能否施放某戰法；非火計類一律允許 */
export function checkTacticWeather(tacticId: string, weather: Weather): WeatherTacticCheck {
    if (isFireTactic(tacticId) && FIRE_BLOCKED_WEATHER.has(weather)) {
        return { allowed: false, reason: WEATHER_RESTRICTION_TOAST };
    }
    return { allowed: true, reason: null };
}

/** 火計傷害倍率：大風 ×2，其他天氣 ×1；非火計類恆為 ×1 */
export function fireDamageMultiplier(tacticId: string, weather: Weather): number {
    if (!isFireTactic(tacticId)) return 1;
    return weather === Weather.Windy ? 2 : 1;
}

/** 水攻範圍的額外深度格數：雨天擴大，其他天氣為 0 */
export function floodDepthBonus(weather: Weather): number {
    return weather === Weather.Rain ? RAIN_FLOOD_DEPTH_BONUS : 0;
}
