import { TestSuite, assert } from './TestRunner';
import { PEDIGREE_SEAT_WEIGHTS, pedigreeRowLabel } from '../assets/scripts/core/systems/BloodlineTreeSlots';
import { FACTOR_POOL_RATE } from '../assets/scripts/core/systems/FactorInheritance';

export function createPedigreeSeatWeightsSuite(): TestSuite {
    const suite = new TestSuite('PedigreeSeatWeights');

    suite.test('每一代合計都是 0.56', () => {
        const { parent, grandparent, greatGrandparent } = PEDIGREE_SEAT_WEIGHTS;
        assert.equals('0.56', (parent * 2).toFixed(2));
        assert.equals('0.56', (grandparent * 4).toFixed(2));
        assert.equals('0.56', (greatGrandparent * 8).toFixed(2));
    });

    suite.test('公開權重和實際因子進池率的比例一致，不會顯示一套、算另一套', () => {
        const { parent, grandparent, greatGrandparent } = PEDIGREE_SEAT_WEIGHTS;
        assert.equals((FACTOR_POOL_RATE[2] / FACTOR_POOL_RATE[1]).toFixed(4), (grandparent / parent).toFixed(4));
        assert.equals((FACTOR_POOL_RATE[3] / FACTOR_POOL_RATE[1]).toFixed(4), (greatGrandparent / parent).toFixed(4));
    });

    suite.test('列標籤寫出世代、人數與每席權重', () => {
        assert.equals('曾祖父母\n(8人)\n每席 0.07', pedigreeRowLabel('曾祖父母', 8, PEDIGREE_SEAT_WEIGHTS.greatGrandparent));
        assert.equals('父母\n(2人)\n每席 0.28', pedigreeRowLabel('父母', 2, PEDIGREE_SEAT_WEIGHTS.parent));
    });

    return suite;
}
