/**
 * WeatherItem — 天氣道具改變戰場天氣（APT-15，PROG-2-0929）
 *
 * 規格（戰場適性系統 §C 商業套路）：付費道具可改變戰場天氣，例如祈風令、祈雨符。
 * 規格只點名道具，沒有寫明各自改成哪種天氣、持續幾回合、一場能否多次使用。
 * 本檔暫定：祈風令 → 大風（WINDY），祈雨符 → 雨天（RAINY），道具直接覆寫本場天氣。
 * 持續與次數限制待企劃確認，記入待辦。
 *
 * Unity 對照：像一個 ScriptableObject 效果，OnUse 時把場景的 Weather 欄位改成指定值。
 */
import { Weather } from '../config/Constants';

export type WeatherItemId = 'wind-prayer' | 'rain-charm';

/** 道具 → 目標天氣（暫定，見檔頭） */
export const WEATHER_ITEM_TARGET: Readonly<Record<WeatherItemId, Weather>> = {
    'wind-prayer': Weather.Windy,
    'rain-charm': Weather.Rain,
};

export interface WeatherItemResult {
    weather: Weather;
    changed: boolean;
}

/** 使用天氣道具後的戰場天氣；目前天氣與道具目標相同時 changed 為 false */
export function applyWeatherItem(current: Weather, item: WeatherItemId): WeatherItemResult {
    const weather = WEATHER_ITEM_TARGET[item];
    return { weather, changed: weather !== current };
}
