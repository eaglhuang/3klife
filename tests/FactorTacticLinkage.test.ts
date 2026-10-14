/**
 * FactorTacticLinkage — 因子與戰法、地形連動規則（FBR-05，PROG-2-0584）測試
 */
import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';
import { TerrainType, Weather } from '../assets/scripts/shared/CommonEnums';
import {
    GREEN_FACTOR_TP_MULTIPLIER,
    learnTpCost,
    canNavalCombinedAttack,
    hitRateInWeather,
    forestMoveBonus,
} from '../assets/scripts/core/systems/FactorTacticLinkage';

export function createFactorTacticLinkageSuite(): TestSuite {
    const suite = new TestSuite('FactorTacticLinkage (因子戰法地形連動 FBR-05)');

    suite.test('綠色因子相符時學習戰法 TP 減半，否則維持原值', () => {
        assert.equals(GREEN_FACTOR_TP_MULTIPLIER, 0.5);
        assert.equals(40, learnTpCost(80, true));
        assert.equals(4, learnTpCost(7, true), '奇數減半後無條件進位');
        assert.equals(80, learnTpCost(80, false));
    });

    suite.test('水戰適性只在水域（河流）格可合攻，沒有適性或地形不符都不可', () => {
        assert.isTrue(canNavalCombinedAttack(TerrainType.River, true));
        assert.isFalse(canNavalCombinedAttack(TerrainType.River, false));
        assert.isFalse(canNavalCombinedAttack(TerrainType.Plain, true));
    });

    suite.test('大霧免疫：大霧天氣命中 100%，其他天氣或沒有免疫維持原命中率', () => {
        assert.equals(1, hitRateInWeather(0.7, Weather.Fog, true));
        assert.equals(0.7, hitRateInWeather(0.7, Weather.Fog, false));
        assert.equals(0.7, hitRateInWeather(0.7, Weather.Clear, true));
    });

    suite.test('林地適性在林地格移動力 +1，其他情況為 0', () => {
        assert.equals(1, forestMoveBonus(TerrainType.Forest, true));
        assert.equals(0, forestMoveBonus(TerrainType.Forest, false));
        assert.equals(0, forestMoveBonus(TerrainType.Plain, true));
    });

    return suite;
}

// ── 戰場單位帶上主將因子（PROG-2-0584 接線前置）──

export function createFactorGenesWiringSuite(): TestSuite {
    const suite = new TestSuite('FactorGenesWiring (戰場單位帶上主將因子 PROG-2-0584)');
    const root = path.resolve(__dirname, '..');

    suite.test('部隊模型有 factorGenes 欄位，預設為空陣列', () => {
        const source = fs.readFileSync(path.join(root, 'assets/scripts/core/models/TroopUnit.ts'), 'utf8');
        assert.isTrue(source.includes('public factorGenes: readonly GeneralGeneConfig[] = [];'), 'TroopUnit 沒有 factorGenes 欄位');
    });

    suite.test('玩家部隊出陣時從主將 genes 帶入 factorGenes', () => {
        const source = fs.readFileSync(path.join(root, 'assets/scripts/battle/controllers/BattleController.ts'), 'utf8');
        assert.isTrue(source.includes('unit.factorGenes = this.state.getGeneral(Faction.Player)?.genes ?? [];'), 'tryDeployTroop 沒有帶入 factorGenes');
    });

    return suite;
}
