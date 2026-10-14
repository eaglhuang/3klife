/**
 * EnvScoutPresenter — 環境偵察面板文字（PROG-2-0403）的純邏輯測試
 */
import { TestSuite, assert } from './TestRunner';
import { buildBattlefieldRecon } from '../assets/scripts/core/systems/BattlefieldRecon';
import { buildEnvScoutLines } from '../assets/scripts/ui/core/EnvScoutPresenter';
import { Weather } from '../assets/scripts/core/config/Constants';
import { TerrainType } from '../assets/scripts/shared/CommonEnums';

export function createEnvScoutPresenterSuite(): TestSuite {
    const suite = new TestSuite('EnvScoutPresenter (環境偵察面板文字 PROG-2-0403)');

    suite.test('地形行只列出有格數的地形，並附戰場尺寸', () => {
        const recon = buildBattlefieldRecon({
            terrain: [
                [TerrainType.Mountain, TerrainType.Plain],
                [TerrainType.River, TerrainType.Plain],
            ],
        });
        const lines = buildEnvScoutLines(recon);
        assert.equals('地形 2×2：平原 2、水域 1、山地 1', lines.terrainLine);
    });

    suite.test('天氣行列出逐回合預報並標出變化回合', () => {
        const recon = buildBattlefieldRecon({
            schedule: [
                { turnStart: 2, turnEnd: 3, weather: Weather.Rain },
                { turnStart: 4, turnEnd: 4, weather: Weather.Thunder },
            ],
            forecastTurns: 5,
        });
        const lines = buildEnvScoutLines(recon);
        assert.equals('天氣預報（5 回合）：晴天、雨天、雨天、雷暴、晴天；變化於第2、4、5回合', lines.weatherLine);
    });

    suite.test('天氣整段不變時明說，不列變化回合', () => {
        const recon = buildBattlefieldRecon({ forecastTurns: 3 });
        const lines = buildEnvScoutLines(recon);
        assert.equals('天氣預報（3 回合）：晴天、晴天、晴天；整段不變', lines.weatherLine);
    });

    suite.test('預報回合數為 0 時顯示「無」', () => {
        const recon = buildBattlefieldRecon({ forecastTurns: 0 });
        assert.equals('天氣預報：無', buildEnvScoutLines(recon).weatherLine);
    });

    return suite;
}
