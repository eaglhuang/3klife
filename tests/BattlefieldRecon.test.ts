/**
 * BattlefieldRecon — 出戰前環境偵察（APT-12 / PROG-2-0402）的純邏輯測試
 */
import { TestSuite, assert } from './TestRunner';
import { buildBattlefieldRecon, buildBattlefieldReconForEncounter, RECON_FORECAST_TURNS } from '../assets/scripts/core/systems/BattlefieldRecon';
import { GAME_CONFIG, Weather } from '../assets/scripts/core/config/Constants';
import { TerrainType } from '../assets/scripts/shared/CommonEnums';

export function createBattlefieldReconSuite(): TestSuite {
    const suite = new TestSuite('BattlefieldRecon (環境偵察 APT-12)');

    suite.test('沒有地形資料時視為整片平原，格數等於戰場格數', () => {
        const recon = buildBattlefieldRecon();
        const total = GAME_CONFIG.GRID_LANES * GAME_CONFIG.GRID_DEPTH;
        assert.equals(GAME_CONFIG.GRID_LANES, recon.terrain.lanes);
        assert.equals(GAME_CONFIG.GRID_DEPTH, recon.terrain.depth);
        assert.equals(total, recon.terrain.counts[TerrainType.Plain]);
        assert.equals(0, recon.terrain.counts[TerrainType.Mountain]);
    });

    suite.test('地形計數加總等於格數，並依來源排列', () => {
        const terrain = [
            [TerrainType.Mountain, TerrainType.Plain],
            [TerrainType.River, TerrainType.Forest],
        ];
        const recon = buildBattlefieldRecon({ terrain });
        const sum = Object.values(recon.terrain.counts).reduce((a, b) => a + b, 0);
        assert.equals(4, sum);
        assert.equals(1, recon.terrain.counts[TerrainType.Mountain]);
        assert.equals(1, recon.terrain.counts[TerrainType.Plain]);
        assert.equals(1, recon.terrain.counts[TerrainType.River]);
        assert.equals(1, recon.terrain.counts[TerrainType.Forest]);
        assert.equals(0, recon.terrain.counts[TerrainType.Fortress]);
        assert.equals(TerrainType.Forest, recon.terrain.grid[1][1]);
    });

    suite.test('地形結果是複本，改動來源不影響偵察資料', () => {
        const terrain = [[TerrainType.Plain]];
        const recon = buildBattlefieldRecon({ terrain });
        terrain[0][0] = TerrainType.Desert;
        assert.equals(TerrainType.Plain, recon.terrain.grid[0][0]);
    });

    suite.test('天氣預報預設從第 1 回合起算，長度為預設回合數', () => {
        const recon = buildBattlefieldRecon({
            schedule: [{ turnStart: 2, turnEnd: 3, weather: Weather.Rain }],
        });
        assert.equals(RECON_FORECAST_TURNS, recon.weather.forecast.length);
        assert.equals(1, recon.weather.forecast[0].turn);
        assert.equals(Weather.Clear, recon.weather.forecast[0].weather);
        assert.equals(Weather.Rain, recon.weather.forecast[1].weather);
        assert.equals(Weather.Rain, recon.weather.forecast[2].weather);
        assert.equals(Weather.Clear, recon.weather.forecast[3].weather);
    });

    suite.test('變化回合只列出預報中真正改變的點', () => {
        const recon = buildBattlefieldRecon({
            schedule: [
                { turnStart: 2, turnEnd: 3, weather: Weather.Rain },
                { turnStart: 4, turnEnd: 4, weather: Weather.Thunder },
            ],
            forecastTurns: 5,
        });
        const changeTurns = recon.weather.changes.map((c) => c.turn);
        assert.equals(JSON.stringify([2, 4, 5]), JSON.stringify(changeTurns));
        assert.equals(Weather.Thunder, recon.weather.changes[1].weather);
    });

    suite.test('空排程全部晴天，沒有變化', () => {
        const recon = buildBattlefieldRecon({ forecastTurns: 3 });
        assert.equals(3, recon.weather.forecast.length);
        assert.equals(true, recon.weather.forecast.every((f) => f.weather === Weather.Clear));
        assert.equals(0, recon.weather.changes.length);
    });

    suite.test('預報回合數為 0 時沒有預報，負數視為 0', () => {
        assert.equals(0, buildBattlefieldRecon({ forecastTurns: 0 }).weather.forecast.length);
        assert.equals(0, buildBattlefieldRecon({ forecastTurns: -4 }).weather.forecast.length);
    });

    suite.test('關卡沒有排程時，預報整段使用固定天氣（encounters.json 的 weather）', () => {
        const recon = buildBattlefieldReconForEncounter({ weather: 'FOG', terrain: [[TerrainType.Forest]] }, 3);
        assert.equals(1, recon.terrain.counts[TerrainType.Forest]);
        assert.equals(true, recon.weather.forecast.every((f) => f.weather === Weather.Fog));
        assert.equals(0, recon.weather.changes.length);
    });

    suite.test('舊的小寫天氣字串會經 normalizeWeather 轉成規格代碼', () => {
        const recon = buildBattlefieldReconForEncounter({ weather: 'fog' }, 2);
        assert.equals(true, recon.weather.forecast.every((f) => f.weather === Weather.Fog));
    });

    suite.test('關卡有排程時優先使用排程，不看固定天氣', () => {
        const recon = buildBattlefieldReconForEncounter({
            weather: 'SUNNY',
            weatherSchedule: [{ turnStart: 2, turnEnd: 2, weather: Weather.Thunder }],
        }, 3);
        assert.equals(Weather.Clear, recon.weather.forecast[0].weather);
        assert.equals(Weather.Thunder, recon.weather.forecast[1].weather);
        assert.equals(2, recon.weather.changes.length);
    });

    suite.test('關卡沒有天氣也沒有地形時，回到晴天與平原', () => {
        const recon = buildBattlefieldReconForEncounter({}, 1);
        assert.equals(Weather.Clear, recon.weather.forecast[0].weather);
        assert.equals(GAME_CONFIG.GRID_LANES * GAME_CONFIG.GRID_DEPTH, recon.terrain.counts[TerrainType.Plain]);
    });

    return suite;
}
