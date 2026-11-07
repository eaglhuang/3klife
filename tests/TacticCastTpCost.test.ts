/**
 * TacticCastTpCost — 戰法施放 TP 綠因子折半與保底（doc_spec_0344；PROG-2-2030）
 */
import { assert, TestSuite } from './TestRunner';
import { calculateTacticTpCost, tacticTpTier, TACTIC_CAST_TP_FLOOR } from '../assets/scripts/core/systems/TacticCastTpCost';
import { TACTIC_TP_COST_OVERRIDE } from '../assets/scripts/core/systems/SortieDeploy';

export function createTacticCastTpCostSuite(): TestSuite {
    const suite = new TestSuite('TacticCastTpCost (戰法施放 TP doc_spec_0344 PROG-2-2030)');

    suite.test('§4.1-2 保底：15 折半為 7，回傳 10', () => {
        assert.equals(10, calculateTacticTpCost({ tacticId: 'T', baseTp: 15, hasGreenGene: true }));
        assert.equals(15, calculateTacticTpCost({ tacticId: 'T', baseTp: 15, hasGreenGene: false }));
        assert.equals(37, calculateTacticTpCost({ tacticId: 'T', baseTp: 75, hasGreenGene: true }));
    });

    suite.test('§4.1-1 既有 28 招有／無綠因子皆為整數且不低於下限', () => {
        const entries = Object.entries(TACTIC_TP_COST_OVERRIDE);
        assert.isTrue(entries.length >= 28, `只有 ${entries.length} 招`);
        for (const [id, base] of entries) {
            const plain = calculateTacticTpCost({ tacticId: id, baseTp: base, hasGreenGene: false });
            const green = calculateTacticTpCost({ tacticId: id, baseTp: base, hasGreenGene: true });
            assert.equals(base, plain);
            assert.isTrue(Number.isInteger(green) && green >= TACTIC_CAST_TP_FLOOR, `${id}: ${green}`);
            assert.equals(Math.max(10, Math.floor(base / 2)), green);
        }
    });

    suite.test('§1 位階區間', () => {
        assert.equals(1, tacticTpTier(15));
        assert.equals(2, tacticTpTier(30));
        assert.equals(3, tacticTpTier(50));
        assert.equals(4, tacticTpTier(70));
    });

    return suite;
}
