/**
 * CommandSortieLoss — 帶兵上限錨點、出陣閾值、戰損 6:4（doc_spec_0357；PROG-2-2043）
 */
import { assert, TestSuite } from './TestRunner';
import {
    applyBattleLoss, checkSortiePool, computeAnchorCommandCapacity, recoverWoundedQuarter, splitLostTroops,
} from '../assets/scripts/core/systems/CommandSortieLoss';

export function createCommandSortieLossSuite(): TestSuite {
    const suite = new TestSuite('CommandSortieLoss (帶兵與戰損 doc_spec_0357 PROG-2-2043)');

    suite.test('§5-1 帶兵公式與後期大將突破 18000', () => {
        assert.equals(3500, computeAnchorCommandCapacity(50, 0, 'none'));
        assert.equals(4000, computeAnchorCommandCapacity(50, 0, 'colonel'));
        assert.equals(18000, computeAnchorCommandCapacity(100, 1000, 'grandGeneral'));
    });

    suite.test('§5-2 傷兵＋陣亡恆等於損失', () => {
        for (const lost of [0, 1, 7, 999, 12345]) {
            const s = splitLostTroops(lost);
            assert.equals(lost, s.wounded + s.dead);
        }
        assert.equals(599, splitLostTroops(999).wounded);
    });

    suite.test('§5-3 城市駐軍 499 不得出陣', () => {
        assert.isFalse(checkSortiePool(5000, 499, 8000).canDeploy);
        const ok = checkSortiePool(5000, 500, 8000);
        assert.isTrue(ok.canDeploy);
        assert.equals(500, ok.sortiePool);
    });

    suite.test('§4 回寫傷兵營與季末康復 30%', () => {
        let ledger = applyBattleLoss({ reserveTroops: 10000, woundedCamp: 0 }, 1000);
        assert.equals(9000, ledger.reserveTroops);
        assert.equals(600, ledger.woundedCamp);
        ledger = recoverWoundedQuarter(ledger);
        assert.equals(9180, ledger.reserveTroops);
        assert.equals(420, ledger.woundedCamp);
    });

    return suite;
}
