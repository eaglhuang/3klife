/**
 * WeatherItem — 天氣道具改變戰場天氣（PROG-2-0929 / APT-15）
 *
 * 驗證祈風令改成大風、祈雨符改成雨天，且與目前天氣相同時回報 changed = false。
 * 目標天氣為暫定對應，見 WeatherItem.ts 檔頭。
 *
 * Unity 對照：像在 Play Mode 按下道具按鈕，檢查場景的天氣欄位有沒有被改掉。
 */
import { Weather } from '../assets/scripts/core/config/Constants';
import { applyWeatherItem, WEATHER_ITEM_TARGET } from '../assets/scripts/core/systems/WeatherItem';
import { assert, TestSuite } from './TestRunner';

export function createWeatherItemSuite(): TestSuite {
    const suite = new TestSuite('WeatherItem (天氣道具 APT-15)');

    suite.test('祈風令把晴天改成大風，changed 為 true', () => {
        const result = applyWeatherItem(Weather.Clear, 'wind-prayer');
        assert.equals(Weather.Windy, result.weather);
        assert.isTrue(result.changed);
    });

    suite.test('祈雨符把大霧改成雨天，changed 為 true', () => {
        const result = applyWeatherItem(Weather.Fog, 'rain-charm');
        assert.equals(Weather.Rain, result.weather);
        assert.isTrue(result.changed);
    });

    suite.test('目前天氣已是道具目標時 changed 為 false', () => {
        const result = applyWeatherItem(Weather.Windy, 'wind-prayer');
        assert.equals(Weather.Windy, result.weather);
        assert.isFalse(result.changed);
    });

    suite.test('兩種道具的目標天氣互不相同', () => {
        assert.isTrue(WEATHER_ITEM_TARGET['wind-prayer'] !== WEATHER_ITEM_TARGET['rain-charm']);
    });

    return suite;
}
