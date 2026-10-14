/**
 * WeatherTacticRestriction — 天氣對戰法強約束（APT-07 / PROG-2-0406）的純邏輯與戰鬥接線測試
 */
import { TestSuite, assert } from './TestRunner';
import {
    checkTacticWeather,
    fireDamageMultiplier,
    floodDepthBonus,
    FIRE_TAG,
    RAIN_FLOOD_DEPTH_BONUS,
    WEATHER_RESTRICTION_TOAST,
} from '../assets/scripts/core/systems/WeatherTacticRestriction';
import { BattleState } from '../assets/scripts/battle/models/BattleState';
import { BattleTactic, GAME_CONFIG, Weather } from '../assets/scripts/core/config/Constants';
import { TerrainType } from '../assets/scripts/shared/CommonEnums';
import { refreshFloodAttackTerrain, resolveBattleTacticBehavior } from '../assets/scripts/battle/shared/BattleTacticBehavior';
import { resolveBattleSkillProfile } from '../assets/scripts/battle/skills/BattleSkillProfiles';
import { BattleSkillDispatcher } from '../assets/scripts/battle/runtime/BattleSkillDispatcher';

const FIRE = [FIRE_TAG];
const NO_TAG: string[] = [];

export function createWeatherTacticRestrictionSuite(): TestSuite {
    const suite = new TestSuite('WeatherTacticRestriction (天氣對戰法強約束 APT-07)');

    suite.test('火計標籤在雨天、大霧、雷暴禁用，並給出 Toast 文字', () => {
        for (const weather of [Weather.Rain, Weather.Fog, Weather.Thunder]) {
            const check = checkTacticWeather(FIRE, weather);
            assert.equals(false, check.allowed, `${weather} 應禁用`);
            assert.equals(WEATHER_RESTRICTION_TOAST, check.reason ?? '');
        }
    });

    suite.test('火計標籤在晴天、大風、夜戰可以施放', () => {
        for (const weather of [Weather.Clear, Weather.Windy, Weather.Night]) {
            assert.equals(true, checkTacticWeather(FIRE, weather).allowed, `${weather} 應允許`);
        }
    });

    suite.test('沒有 fire 標籤的戰法不受天氣禁用', () => {
        assert.equals(true, checkTacticWeather(NO_TAG, Weather.Thunder).allowed);
        assert.equals(true, checkTacticWeather(['water'], Weather.Rain).allowed);
    });

    suite.test('火計在大風傷害 ×2，其他天氣 ×1；沒有 fire 標籤恆為 ×1', () => {
        assert.equals(2, fireDamageMultiplier(FIRE, Weather.Windy));
        assert.equals(1, fireDamageMultiplier(FIRE, Weather.Clear));
        assert.equals(1, fireDamageMultiplier(NO_TAG, Weather.Windy));
    });

    suite.test('水攻雨天範圍擴大，其他天氣不擴大', () => {
        assert.equals(RAIN_FLOOD_DEPTH_BONUS, floodDepthBonus(Weather.Rain));
        assert.equals(0, floodDepthBonus(Weather.Clear));
        assert.equals(0, floodDepthBonus(Weather.Windy));
    });

    suite.test('zhou-yu-inferno 的戰法設定帶有 fire 標籤', () => {
        const profile = resolveBattleSkillProfile('zhou-yu-inferno');
        assert.equals(true, profile?.tags?.includes(FIRE_TAG) ?? false);
    });

    suite.test('戰鬥接線：火計在雨天被擋下，回傳 weather-restricted 與 Toast', () => {
        // 直接驗證 dispatcher 的閘門：未施放前就被擋，不需要施法者
        const state = new BattleState();
        state.weather = Weather.Rain;
        const dispatcher = new BattleSkillDispatcher({ state } as never, {} as never);
        const result = dispatcher.executeBattleSkillRequest({
            sourceType: 'seed-tactic',
            ownerUid: 'player',
            battleSkillId: 'zhou-yu-inferno',
            targetMode: 'tile',
            timing: 'active-cast',
        } as never);
        assert.equals(false, result.applied);
        assert.equals('weather-restricted', result.blockedReason ?? '');
        assert.equals(WEATHER_RESTRICTION_TOAST, result.battleLogLines[0] ?? '');
    });

    suite.test('戰鬥接線：水攻在雨天的河流範圍比晴天深一格', () => {
        const behavior = resolveBattleTacticBehavior(BattleTactic.FloodAttack);
        const middleLane = 1;
        const deepest = (weather: Weather): number => {
            const state = new BattleState();
            state.weather = weather;
            behavior.applyStartOfBattle(state);
            let last = -1;
            for (let depth = 0; depth < GAME_CONFIG.GRID_DEPTH; depth++) {
                if (state.getCell(middleLane, depth)?.terrain === TerrainType.River) last = depth;
            }
            return last;
        };
        assert.equals(deepest(Weather.Clear) + RAIN_FLOOD_DEPTH_BONUS, deepest(Weather.Rain));
    });

    suite.test('水攻範圍跟著天氣即時重算：轉雨擴大，轉晴還原並保留原地形', () => {
        const state = new BattleState();
        // 原地形：中間列 depth 6 原本是山地，淹沒前要能還原
        state.getCell(1, 6)!.terrain = TerrainType.Mountain;
        const riverDepth = (lane: number): number => {
            let last = -1;
            for (let depth = 0; depth < GAME_CONFIG.GRID_DEPTH; depth++) {
                if (state.getCell(lane, depth)?.terrain === TerrainType.River) last = depth;
            }
            return last;
        };
        state.weather = Weather.Clear;
        refreshFloodAttackTerrain(state);
        assert.equals(5, riverDepth(1), '晴天中間列淹到 5');
        assert.equals(TerrainType.Mountain, state.getCell(1, 6)!.terrain, '晴天 depth 6 還沒淹，保留山地');

        state.weather = Weather.Rain;
        refreshFloodAttackTerrain(state);
        assert.equals(6, riverDepth(1), '轉雨後中間列擴大到 6');
        assert.equals(TerrainType.River, state.getCell(1, 6)!.terrain);

        state.weather = Weather.Clear;
        refreshFloodAttackTerrain(state);
        assert.equals(5, riverDepth(1), '轉晴後還原');
        assert.equals(TerrainType.Mountain, state.getCell(1, 6)!.terrain, '原地形山地要還原');
        assert.equals(null, state.getTileEffect(1, 6), '範圍外的河流效果要移除');
    });

    return suite;
}
