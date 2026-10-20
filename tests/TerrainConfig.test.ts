/**
 * TerrainConfig.test.ts — 地形修正值資料檔（REV-02，headless）
 *
 * 驗證 terrain.json 結構合法，並與 Constants.ts 的 runtime 表交叉比對，
 * 避免兩處各自漂移（與 NUM-04 的交叉比對做法相同）。
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import { parseTerrainConfig } from '../assets/scripts/core/config/TerrainConfig';
import { TERRAIN_ATTACK_MOD, TERRAIN_DEFENSE_MOD } from '../assets/scripts/core/config/Constants';
import { TerrainType } from '../assets/scripts/shared/CommonEnums';

function readRaw(): unknown {
    return JSON.parse(readFileSync(join(__dirname, '..', 'assets/resources/data/terrain.json'), 'utf8'));
}

export function createTerrainConfigSuite(): TestSuite {
    const suite = new TestSuite('TerrainConfig (地形修正值 REV-02)');

    suite.test('terrain.json 結構合法，六種地形都有攻擊與防禦修正值', () => {
        const result = parseTerrainConfig(readRaw());
        assert.isTrue(result.ok, result.ok ? '' : result.errors.join('；'));
    });

    suite.test('缺少地形鍵時回報錯誤', () => {
        const raw = readRaw() as { attackMod: Record<string, number> };
        delete raw.attackMod[TerrainType.Forest];
        const result = parseTerrainConfig(raw);
        assert.isFalse(result.ok);
        assert.isTrue(!result.ok && result.errors.some(e => e.includes('attackMod.forest')));
    });

    suite.test('非有限數字時回報錯誤', () => {
        const raw = readRaw() as { defenseMod: Record<string, unknown> };
        raw.defenseMod[TerrainType.Mountain] = 'abc';
        const result = parseTerrainConfig(raw);
        assert.isFalse(result.ok);
        assert.isTrue(!result.ok && result.errors.some(e => e.includes('defenseMod.mountain')));
    });

    suite.test('與 Constants.ts 交叉比對：攻擊與防禦修正值一致', () => {
        const result = parseTerrainConfig(readRaw());
        assert.isTrue(result.ok);
        if (!result.ok) return;
        for (const key of Object.values(TerrainType) as TerrainType[]) {
            assert.equals(TERRAIN_ATTACK_MOD[key], result.config.attackMod[key], `attackMod.${key}`);
            assert.equals(TERRAIN_DEFENSE_MOD[key], result.config.defenseMod[key], `defenseMod.${key}`);
        }
    });

    return suite;
}
