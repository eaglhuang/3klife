/**
 * TacticDamageEstimate.test.ts — 戰法預估傷害（PROG-2-0915）
 */
import { TestSuite, assert } from './TestRunner';
import { FormulaSystem, type DamageContext } from '../assets/scripts/core/systems/FormulaSystem';
import { estimateTacticDamage } from '../assets/scripts/battle/shared/TacticDamageEstimate';
import { TerrainType, TroopType } from '../assets/scripts/core/config/Constants';

const CONTEXT: DamageContext = {
    attackerAttack: 300,
    defenderDefense: 100,
    attackerType: TroopType.Cavalry,
    defenderType: TroopType.Infantry,
    attackerTerrain: TerrainType.Plain,
    defenderTerrain: TerrainType.Plain,
};

export function createTacticDamageEstimateSuite(): TestSuite {
    const suite = new TestSuite('TacticDamageEstimate (戰法預估傷害 PROG-2-0915)');

    suite.test('倍率 1 等於 FormulaSystem.calculateDamage 的基礎傷害', () => {
        const expected = new FormulaSystem().calculateDamage(CONTEXT);
        assert.equals(expected, estimateTacticDamage(CONTEXT, 1));
        assert.equals(expected, estimateTacticDamage(CONTEXT));
    });

    suite.test('倍率 0.5 約減半（向下取整）', () => {
        const base = estimateTacticDamage(CONTEXT, 1);
        assert.equals(Math.floor(base * 0.5), estimateTacticDamage(CONTEXT, 0.5));
    });

    suite.test('結果不低於 1，即使防禦高於攻擊', () => {
        const weak: DamageContext = { ...CONTEXT, attackerAttack: 1, defenderDefense: 9999 };
        assert.isTrue(estimateTacticDamage(weak, 1) >= 1);
        assert.isTrue(estimateTacticDamage(weak, 0.01) >= 1);
    });

    suite.test('傳入的公式實例與預設實例結果一致', () => {
        assert.equals(estimateTacticDamage(CONTEXT, 1), estimateTacticDamage(CONTEXT, 1, new FormulaSystem()));
    });

    return suite;
}
