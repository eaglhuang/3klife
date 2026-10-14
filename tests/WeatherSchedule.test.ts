/**
 * WeatherSchedule.test.ts — 戰場天氣排程純邏輯 headless 測試（PROG-2-0342 / WBS APT-06）
 *
 * Unity 對照：EditMode Test 直接餵一張時間表，檢查每回合查到的天氣與切換事件。
 */
import { assert, TestSuite } from './TestRunner';
import { Weather } from '../assets/scripts/shared/CommonEnums';
import {
    detectWeatherTransition,
    validateWeatherSchedule,
    weatherForecast,
    weatherForTurn,
    type WeatherScheduleEntry,
} from '../assets/scripts/core/systems/WeatherSchedule';

const SCHEDULE: WeatherScheduleEntry[] = [
    { turnStart: 3, turnEnd: 4, weather: Weather.Rain },
    { turnStart: 1, turnEnd: 2, weather: Weather.Fog },
    { turnStart: 6, turnEnd: 6, weather: Weather.Night },
];

export function createWeatherScheduleSuite(): TestSuite {
    const suite = new TestSuite('WeatherSchedule (天氣排程 APT-06)');

    suite.test('驗證後依回合排序，區間含頭尾', () => {
        const sorted = validateWeatherSchedule(SCHEDULE);
        assert.equals(1, sorted[0].turnStart);
        assert.equals(3, sorted[1].turnStart);
        assert.equals(6, sorted[2].turnStart);
    });

    suite.test('驗證：重疊、倒序、非正整數回合都拋錯', () => {
        assert.throws(() => validateWeatherSchedule([
            { turnStart: 1, turnEnd: 3, weather: Weather.Rain },
            { turnStart: 3, turnEnd: 4, weather: Weather.Fog },
        ]));
        assert.throws(() => validateWeatherSchedule([{ turnStart: 5, turnEnd: 2, weather: Weather.Rain }]));
        assert.throws(() => validateWeatherSchedule([{ turnStart: 0, turnEnd: 2, weather: Weather.Rain }]));
        assert.throws(() => validateWeatherSchedule([{ turnStart: 1.5, turnEnd: 2, weather: Weather.Rain }]));
    });

    suite.test('查天氣：區間頭尾都命中，空檔使用預設天氣（晴）', () => {
        const sorted = validateWeatherSchedule(SCHEDULE);
        assert.equals(Weather.Fog, weatherForTurn(sorted, 1));
        assert.equals(Weather.Fog, weatherForTurn(sorted, 2));
        assert.equals(Weather.Rain, weatherForTurn(sorted, 3));
        assert.equals(Weather.Rain, weatherForTurn(sorted, 4));
        assert.equals(Weather.Clear, weatherForTurn(sorted, 5));
        assert.equals(Weather.Night, weatherForTurn(sorted, 6));
        assert.equals(Weather.Clear, weatherForTurn(sorted, 99));
        assert.equals(Weather.Clear, weatherForTurn([], 1));
    });

    suite.test('預報：從指定回合起算 N 回合，count 小於 1 為空', () => {
        const sorted = validateWeatherSchedule(SCHEDULE);
        const forecast = weatherForecast(sorted, 3, 3);
        assert.equals(3, forecast.length);
        assert.equals(3, forecast[0].turn);
        assert.equals(Weather.Rain, forecast[0].weather);
        assert.equals(5, forecast[2].turn);
        assert.equals(Weather.Clear, forecast[2].weather);
        assert.equals(0, weatherForecast(sorted, 1, 0).length);
    });

    suite.test('切換判定：天氣改變的回合標記 changed，並帶出前後天氣', () => {
        const sorted = validateWeatherSchedule(SCHEDULE);
        const toRain = detectWeatherTransition(sorted, 3);
        assert.isTrue(toRain.changed);
        assert.equals(Weather.Fog, toRain.previous);
        assert.equals(Weather.Rain, toRain.current);
        assert.isFalse(detectWeatherTransition(sorted, 4).changed);
    });

    suite.test('切換判定：第 1 回合若與預設天氣相同則不算切換', () => {
        const clearStart = validateWeatherSchedule([{ turnStart: 1, turnEnd: 2, weather: Weather.Clear }]);
        assert.isFalse(detectWeatherTransition(clearStart, 1).changed);
        const fogStart = validateWeatherSchedule(SCHEDULE);
        assert.isTrue(detectWeatherTransition(fogStart, 1).changed);
    });

    return suite;
}
