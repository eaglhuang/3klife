/**
 * BattleWeatherRoll.test.ts — 季節抽天氣純邏輯測試（PROG-2-9735）
 *
 * 涵蓋：權重分布、NIGHT 永遠不會被抽到、劇情固定優先、沒有季節資料回晴天、
 * 真實 JSON 的驗證、戰前文字由現有效果數值產生。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { Weather } from '../assets/scripts/shared/CommonEnums';
import {
    createSeededRng,
    rollBattleWeather,
    seasonWeatherSeed,
    validateBattleWeatherSeasonTable,
    type BattleWeatherSeasonTable,
} from '../assets/scripts/core/systems/BattleWeatherRoll';
import { weatherPreBattleLine } from '../assets/scripts/core/systems/WeatherEffectText';
import { evaluateTacticConditions, type TacticCondition } from '../assets/scripts/core/systems/TacticCondition';
import { TroopType } from '../assets/scripts/core/config/Constants';

const TABLE = validateBattleWeatherSeasonTable(JSON.parse(
    fs.readFileSync(path.join(__dirname, '../assets/resources/data/battle-weather-season.json'), 'utf8'),
) as BattleWeatherSeasonTable);

function tally(season: number, n: number, seed: number): Record<string, number> {
    const rng = createSeededRng(seed);
    const counts: Record<string, number> = {};
    for (let i = 0; i < n; i++) {
        const w = rollBattleWeather({ season, table: TABLE, rng }).weather;
        counts[w] = (counts[w] ?? 0) + 1;
    }
    return counts;
}

export function createBattleWeatherRollSuite(): TestSuite {
    const suite = new TestSuite('BattleWeatherRoll (季節抽天氣 PROG-2-9735)');

    suite.test('四季 1000 次抽樣：只出現該季權重內的天氣，比例貼近權重', () => {
        for (const season of [1, 2, 3, 4]) {
            const counts = tally(season, 1000, 20261122 + season);
            const weights = TABLE.seasons[String(season)].weights;
            const total = Object.values(weights).reduce((a, b) => a + b, 0);
            for (const code of Object.keys(counts)) assert.isTrue(code in weights, `季 ${season} 抽到不在表內的 ${code}`);
            for (const [code, w] of Object.entries(weights)) {
                const ratio = (counts[code] ?? 0) / 1000;
                assert.isTrue(Math.abs(ratio - w / total) < 0.05, `季 ${season} ${code} 比例 ${ratio} 偏離 ${w / total}`);
            }
        }
    });

    suite.test('總 PM 裁決：每季晴天權重至少 50%，且只用規格既有天氣', () => {
        for (const season of [1, 2, 3, 4]) {
            const weights = TABLE.seasons[String(season)].weights;
            const total = Object.values(weights).reduce((a, b) => a + b, 0);
            assert.isTrue(weights.SUNNY / total >= 0.5, `季 ${season} 晴天不足 50%`);
        }
    });

    suite.test('NIGHT 永遠不會被抽到（含極端亂數）', () => {
        for (const season of [1, 2, 3, 4]) {
            assert.equals(undefined, tally(season, 2000, 7)[Weather.Night]);
            for (const r of [0, 0.5, 0.999999]) {
                assert.isTrue(rollBattleWeather({ season, table: TABLE, rng: () => r }).weather !== Weather.Night);
            }
        }
    });

    suite.test('權重表若把 NIGHT 放進權重或沒排除，驗證拋錯', () => {
        assert.throws(() => validateBattleWeatherSeasonTable({ version: 1, seasons: { '1': { weights: { NIGHT: 10 } } } }));
        assert.throws(() => validateBattleWeatherSeasonTable({ version: 1, randomExcluded: [], seasons: { '1': { weights: { SUNNY: 1 } } } }));
        assert.throws(() => validateBattleWeatherSeasonTable({ version: 1, seasons: { '5': { weights: { SUNNY: 1 } } } }));
        assert.throws(() => validateBattleWeatherSeasonTable({ version: 1, seasons: { '1': { weights: { SUNNY: 0 } } } }));
        assert.throws(() => validateBattleWeatherSeasonTable({ version: 1, seasons: { '1': { weights: { SNOW: 1 } } } }));
    });

    suite.test('劇情固定優先：weather 有值就不抽，舊碼 RAIN 也認得', () => {
        const fixed = rollBattleWeather({ season: 2, table: TABLE, encounter: { weather: Weather.Windy }, rng: () => 0 });
        assert.equals(Weather.Windy, fixed.weather);
        assert.equals('fixed', fixed.source);
        assert.equals(Weather.Rain, rollBattleWeather({ season: 1, table: TABLE, encounter: { weather: 'RAIN' } }).weather);
        // 劇本可指定夜戰（唯一能出 NIGHT 的路）
        assert.equals(Weather.Night, rollBattleWeather({ season: 1, table: TABLE, encounter: { weather: 'NIGHT' } }).weather);
        // 有排程也視為劇本指定
        const sched = rollBattleWeather({ season: 1, table: TABLE, encounter: { weatherSchedule: [{ turnStart: 1, turnEnd: 2, weather: Weather.Fog }] } });
        assert.equals('fixed', sched.source);
    });

    suite.test('weather 沒值（空字串、null、認不得）才依季節抽', () => {
        for (const w of [undefined, null, '', 'not-a-weather']) {
            const r = rollBattleWeather({ season: 3, table: TABLE, encounter: { weather: w }, rng: () => 0 });
            assert.equals('season', r.source);
        }
    });

    suite.test('沒有季節資料時回晴天', () => {
        assert.equals(Weather.Clear, rollBattleWeather({ season: 1, table: null }).weather);
        assert.equals(Weather.Clear, rollBattleWeather({ season: undefined, table: TABLE }).weather);
        assert.equals(Weather.Clear, rollBattleWeather({ season: 9, table: TABLE }).weather);
        assert.equals('default', rollBattleWeather({ season: 9, table: TABLE }).source);
    });

    suite.test('同一年同一季同一關的種子固定，抽到同一種', () => {
        const a = rollBattleWeather({ season: 1, table: TABLE, rng: createSeededRng(seasonWeatherSeed(1, 1, 'extreme-lu-bu')) });
        const b = rollBattleWeather({ season: 1, table: TABLE, rng: createSeededRng(seasonWeatherSeed(1, 1, 'extreme-lu-bu')) });
        assert.equals(a.weather, b.weather);
    });

    suite.test('戰前文字由效果數值產生', () => {
        assert.equals('天氣：大霧（遠程命中 -30%、火計禁用）', weatherPreBattleLine(Weather.Fog));
        assert.equals('天氣：晴天', weatherPreBattleLine(Weather.Clear));
        assert.isTrue(weatherPreBattleLine(Weather.Windy).includes('火計傷害 ×2'));
        assert.isTrue(weatherPreBattleLine(Weather.Windy).includes('遠程射程 -2'));
    });

    suite.test('虎牢關之戰（首戰）固定大風：天氣為 WINDY、戰前文字只有一行、火計條件達成（總PM 裁決）', () => {
        const encounters = JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/resources/data/encounters.json'), 'utf8')).encounters as Array<{ id: string; weather?: string; playerGeneralId?: string }>;
        const hugulao = encounters.find((e) => e.id === 'encounter-001')!;
        assert.equals('WINDY', hugulao.weather);
        // 其他劇情關天氣不受影響
        assert.equals('FOG', encounters.find((e) => e.id === 'encounter-002')!.weather);
        const rolled = rollBattleWeather({ season: 1, table: TABLE, encounter: hugulao, rng: () => 0.99 });
        assert.equals(Weather.Windy, rolled.weather);
        assert.equals('fixed', rolled.source);
        // 戰前顯示：一行，只出現一次「天氣：」，大風火計×2、射程-2
        const line = weatherPreBattleLine(rolled.weather);
        assert.equals('天氣：大風（遠程射程 -2、火計傷害 ×2）', line);
        assert.equals(1, line.split('天氣：').length - 1);
        // 張飛首格戰法（火計佈陣）的條件：大風可發動
        const lib = JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/resources/data/master/tactic-library.json'), 'utf8')).data as Array<{ id: string; tcond?: TacticCondition[] }>;
        const fire = lib.find((t) => t.id === 'tactic-fire-scheme')!;
        const ctx = { casterTroopType: TroopType.Infantry, weather: rolled.weather, adjacentAllies: 0, adjacentEnemies: 0 };
        assert.isTrue(evaluateTacticConditions(fire.tcond, ctx).ok);
    });

    return suite;
}
