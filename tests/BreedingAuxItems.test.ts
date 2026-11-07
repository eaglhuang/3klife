/**
 * BreedingAuxItems — 結緣輔助道具與幼年環境秘卷（doc_spec_0315；PROG-2-1941）
 */
import { assert, TestSuite } from './TestRunner';
import {
    applyChildCharmEpFloor, applyEnvironmentStats, CHILD_ENVIRONMENTS, failedConceptionVitalityRefund,
    resolveConceptionWithItems, rollEnvironmentFactorStar,
} from '../assets/scripts/core/systems/BreedingAuxItems';

const STATS = { str: 50, int: 60, lea: 40, pol: 70, cha: 80 };

export function createBreedingAuxItemsSuite(): TestSuite {
    const suite = new TestSuite('BreedingAuxItems (結緣輔助道具 doc_spec_0315 PROG-2-1941)');

    suite.test('TC-BREED-ITEM-02 安胎藥 ×1.5 封頂 95%；送子符 100% 且 EP 保底 60', () => {
        assert.equals(0.6, resolveConceptionWithItems(0.4, true, false).finalConceptionRate);
        assert.equals(0.95, resolveConceptionWithItems(0.8, true, false).finalConceptionRate);
        assert.equals(0.98, resolveConceptionWithItems(0.98, true, false).finalConceptionRate);
        assert.equals(0.4, resolveConceptionWithItems(0.4, false, false).finalConceptionRate);
        const charm = resolveConceptionWithItems(0.1, true, true);
        assert.equals(1, charm.finalConceptionRate);
        assert.isTrue(charm.epFloorApplied);
        assert.equals(60, applyChildCharmEpFloor(42, true));
        assert.equals(75, applyChildCharmEpFloor(75, true));
        assert.equals(42, applyChildCharmEpFloor(42, false));
    });

    suite.test('受孕失敗返還 20% 精力', () => {
        assert.equals(8, failedConceptionVitalityRefund(40));
        assert.equals(0, failedConceptionVitalityRefund(-5));
    });

    suite.test('TC-BREED-ITEM-03 秘卷屬性加成與 20% 因子跳星', () => {
        const lib = applyEnvironmentStats(STATS, 'ITEM_ENV_LIBRARY');
        assert.equals(66, lib.int);
        assert.equals(77, lib.pol);
        assert.equals(50, lib.str);
        const arena = applyEnvironmentStats(STATS, 'ITEM_ENV_ARENA');
        assert.equals(55, arena.str);
        assert.equals(44, arena.lea);
        assert.equals(92, applyEnvironmentStats(STATS, 'ITEM_ENV_ACADEMY').cha);
        assert.equals(10, CHILD_ENVIRONMENTS.ITEM_ENV_ACADEMY.academyBondBonus);
        assert.equals(60, applyEnvironmentStats(STATS, null).int);
        assert.equals(3, rollEnvironmentFactorStar('ITEM_ENV_LIBRARY', 'intellect', 2, 5, () => 0.19));
        assert.equals(2, rollEnvironmentFactorStar('ITEM_ENV_LIBRARY', 'intellect', 2, 5, () => 0.2));
        assert.equals(2, rollEnvironmentFactorStar('ITEM_ENV_LIBRARY', 'martial', 2, 5, () => 0));
        assert.equals(5, rollEnvironmentFactorStar('ITEM_ENV_ARENA', 'martial', 5, 5, () => 0));
        assert.equals(2, rollEnvironmentFactorStar(null, 'social', 2, 5, () => 0));
    });

    return suite;
}
