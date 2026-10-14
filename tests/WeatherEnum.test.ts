/**
 * WeatherEnum.test.ts — 天氣 enum 改為規格六種與舊字串轉換 headless 測試（PROG-2-0343）
 *
 * Unity 對照：像 Enum 的 Obsolete 轉換，舊存檔的字串進來時要換成新值。
 */
import { assert, TestSuite } from './TestRunner';
import { normalizeWeather, Weather } from '../assets/scripts/shared/CommonEnums';

export function createWeatherEnumSuite(): TestSuite {
    const suite = new TestSuite('WeatherEnum (天氣規格六種 PROG-2-0343)');

    suite.test('規格代碼原樣通過：SUNNY / RAINY / FOG / WINDY / NIGHT / THUNDER', () => {
        assert.equals(Weather.Clear, normalizeWeather('SUNNY'));
        assert.equals(Weather.Rain, normalizeWeather('RAINY'));
        assert.equals(Weather.Fog, normalizeWeather('FOG'));
        assert.equals(Weather.Windy, normalizeWeather('WINDY'));
        assert.equals(Weather.Night, normalizeWeather('NIGHT'));
        assert.equals(Weather.Thunder, normalizeWeather('THUNDER'));
    });

    suite.test('舊小寫代碼轉成規格值：clear → SUNNY、fog → FOG', () => {
        assert.equals(Weather.Clear, normalizeWeather('clear'));
        assert.equals(Weather.Fog, normalizeWeather('fog'));
        assert.equals(Weather.Rain, normalizeWeather('rain'));
        assert.equals(Weather.Night, normalizeWeather('night'));
    });

    suite.test('已移除的 snow / sandstorm 依既有暫定轉成雨天 / 大風', () => {
        assert.equals(Weather.Rain, normalizeWeather('snow'));
        assert.equals(Weather.Windy, normalizeWeather('sandstorm'));
    });

    suite.test('認不得或非字串回傳 null', () => {
        assert.equals(null, normalizeWeather('blizzard'));
        assert.equals(null, normalizeWeather(undefined));
        assert.equals(null, normalizeWeather(3));
    });

    suite.test('enum 恰為六種', () => {
        assert.equals(6, Object.values(Weather).length);
    });

    return suite;
}
