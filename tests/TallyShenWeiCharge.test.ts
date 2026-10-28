/**
 * 神威符強擊突刺：本回合每前進一格攻擊 +15%，最多 4 格（PROG-2-1573，數值暫定）。
 */
import { Faction, TerrainType, TroopType } from '../assets/scripts/core/config/Constants';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { tallyAttackMultiplierOf, tallyChargeMultiplierOf } from '../assets/scripts/battle/shared/TallyPassive';
import { TestSuite, assert } from './TestRunner';

function cavalry(template?: string): TroopUnit {
    const u = new TroopUnit('c', TroopType.Cavalry, Faction.Player, { hp: 100, attack: 30, defense: 20, moveRange: 3, attackRange: 1 });
    if (template) u.tallyTemplateId = template;
    return u;
}

export function createTallyShenWeiChargeSuite(): TestSuite {
    const suite = new TestSuite('TallyShenWeiCharge (神威符強擊突刺 PROG-2-1573)');

    suite.test('沒移動時為 1；每格 +15%', () => {
        const u = cavalry('tiger-tally-shen-wei-fu');
        assert.equals(1, tallyChargeMultiplierOf(u));
        u.chargeCells = 2;
        assert.equals(1.3, Math.round(tallyChargeMultiplierOf(u) * 100) / 100);
    });

    suite.test('最多累計 4 格（+60%）', () => {
        const u = cavalry('tiger-tally-shen-wei-fu');
        u.chargeCells = 9;
        assert.equals(1.6, Math.round(tallyChargeMultiplierOf(u) * 100) / 100);
        assert.equals(1.6, Math.round(tallyAttackMultiplierOf(u, TerrainType.Plain) * 100) / 100);
    });

    suite.test('沒有神威符時不加成', () => {
        const u = cavalry();
        u.chargeCells = 3;
        assert.equals(1, tallyChargeMultiplierOf(u));
    });

    return suite;
}
