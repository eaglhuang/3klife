/**
 * DelegateTactics.test.ts — 委任 AI 選路、放招目標、主將出陣判斷（PROG-2-9712）
 */
import { TestSuite, assert } from './TestRunner';
import {
    DELEGATE_GENERAL_SORTIE_MIN_HP_RATE,
    pickDelegateLaneSmart,
    pickDelegateSkillTarget,
    shouldDelegateGeneralSortie,
} from '../assets/scripts/core/systems/DelegateTactics';

export function createDelegateTacticsSuite(): TestSuite {
    const suite = new TestSuite('DelegateTactics (委任 AI 補強 PROG-2-9712)');

    suite.test('選路：我方最少的路，同數取較小路號', () => {
        assert.equals(0, pickDelegateLaneSmart({ deployBlocked: [false, false, false, false, false], ownByLane: [0, 0, 0, 0, 0] }));
        assert.equals(3, pickDelegateLaneSmart({ deployBlocked: [false, false, false, false, false], ownByLane: [2, 1, 1, 0, 0] }));
    });

    suite.test('選路：出兵口被堵的路排除，即使那路我方最少；全堵住回 -1', () => {
        assert.equals(1, pickDelegateLaneSmart({ deployBlocked: [true, false, false, false, false], ownByLane: [0, 1, 2, 2, 2] }));
        assert.equals(-1, pickDelegateLaneSmart({ deployBlocked: [true, true, true, true, true], ownByLane: [0, 0, 0, 0, 0] }));
    });

    suite.test('放招目標：最逼近我方的敵軍，同距離挑血量多的；沒有敵軍回 null', () => {
        assert.equals(null, pickDelegateSkillTarget([]));
        assert.equals('near', pickDelegateSkillTarget([
            { id: 'far', depth: 6, currentHp: 900 },
            { id: 'near', depth: 2, currentHp: 100 },
        ]));
        assert.equals('tough', pickDelegateSkillTarget([
            { id: 'weak', depth: 3, currentHp: 100 },
            { id: 'tough', depth: 3, currentHp: 500 },
        ]));
    });

    suite.test('主將出陣：可出陣且血量達門檻才上場', () => {
        assert.isTrue(shouldDelegateGeneralSortie({ canSortie: true, hp: 1000, maxHp: 1000 }));
        assert.isFalse(shouldDelegateGeneralSortie({ canSortie: false, hp: 1000, maxHp: 1000 }), '出兵口全滿');
        const below = Math.floor(1000 * DELEGATE_GENERAL_SORTIE_MIN_HP_RATE) - 1;
        assert.isFalse(shouldDelegateGeneralSortie({ canSortie: true, hp: below, maxHp: 1000 }), '血量不足');
        assert.isFalse(shouldDelegateGeneralSortie({ canSortie: true, hp: 0, maxHp: 0 }));
    });

    return suite;
}
