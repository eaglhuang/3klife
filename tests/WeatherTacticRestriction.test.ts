/**
 * WeatherTacticRestriction — 天氣對戰法強約束（APT-07 / PROG-2-0406）的純邏輯測試
 */
import { TestSuite, assert } from './TestRunner';
import {
    checkTacticWeather,
    fireDamageMultiplier,
    floodDepthBonus,
    isFireTactic,
    RAIN_FLOOD_DEPTH_BONUS,
    WEATHER_RESTRICTION_TOAST,
} from '../assets/scripts/core/systems/WeatherTacticRestriction';
import { Weather } from '../assets/scripts/core/config/Constants';

const FIRE = 'tactic-fire-scheme';
const OTHER = 'tactic-some-other';

export function createWeatherTacticRestrictionSuite(): TestSuite {
    const suite = new TestSuite('WeatherTacticRestriction (天氣對戰法強約束 APT-07)');

    suite.test('火計在雨天、大霧、雷暴禁用，並給出 Toast 文字', () => {
        for (const weather of [Weather.Rain, Weather.Fog, Weather.Thunder]) {
            const check = checkTacticWeather(FIRE, weather);
            assert.equals(false, check.allowed, `${weather} 應禁用`);
            assert.equals(WEATHER_RESTRICTION_TOAST, check.reason ?? '');
        }
    });

    suite.test('火計在晴天、大風、夜戰可以施放', () => {
        for (const weather of [Weather.Clear, Weather.Windy, Weather.Night]) {
            assert.equals(true, checkTacticWeather(FIRE, weather).allowed, `${weather} 應允許`);
        }
    });

    suite.test('非火計類戰法不受天氣禁用', () => {
        assert.equals(false, isFireTactic(OTHER));
        assert.equals(true, checkTacticWeather(OTHER, Weather.Thunder).allowed);
    });

    suite.test('火計在大風傷害 ×2，其他天氣 ×1；非火計恆為 ×1', () => {
        assert.equals(2, fireDamageMultiplier(FIRE, Weather.Windy));
        assert.equals(1, fireDamageMultiplier(FIRE, Weather.Clear));
        assert.equals(1, fireDamageMultiplier(OTHER, Weather.Windy));
    });

    suite.test('水攻雨天範圍擴大，其他天氣不擴大', () => {
        assert.equals(RAIN_FLOOD_DEPTH_BONUS, floodDepthBonus(Weather.Rain));
        assert.equals(0, floodDepthBonus(Weather.Clear));
        assert.equals(0, floodDepthBonus(Weather.Windy));
    });

    return suite;
}
