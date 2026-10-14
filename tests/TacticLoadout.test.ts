import { TestSuite, assert } from './TestRunner';
import { tacticLoadoutCapacity, TACTIC_LOADOUT_MAX } from '../assets/scripts/core/systems/TacticLoadout';

// 戰法槽位（PROG-2-0532 / NUR-10 部分）。規格：培育系統.md §F-7 表格。

export function createTacticLoadoutSuite(): TestSuite {
    const suite = new TestSuite('TacticLoadout (NUR-10 戰法槽位依智力)');

    suite.test('上限為 4 槽（規格目前上限）', () => {
        assert.equals(4, TACTIC_LOADOUT_MAX);
    });

    suite.test('表格各區間：1–29 為 1 槽，30–59 為 2 槽，60–89 為 3 槽，90–99 為 4 槽', () => {
        assert.equals(1, tacticLoadoutCapacity(1));
        assert.equals(1, tacticLoadoutCapacity(29));
        assert.equals(2, tacticLoadoutCapacity(30));
        assert.equals(2, tacticLoadoutCapacity(59));
        assert.equals(3, tacticLoadoutCapacity(60));
        assert.equals(3, tacticLoadoutCapacity(89));
        assert.equals(4, tacticLoadoutCapacity(90));
        assert.equals(4, tacticLoadoutCapacity(99));
    });

    suite.test('超過上限的智力以上限計，不會超過 4 槽', () => {
        assert.equals(4, tacticLoadoutCapacity(120));
        assert.equals(4, tacticLoadoutCapacity(999));
    });

    suite.test('0、負數、非有限值至少 1 槽', () => {
        for (const int of [0, -5, NaN, Infinity, -Infinity]) {
            assert.equals(1, tacticLoadoutCapacity(int), `INT ${int}`);
        }
    });

    return suite;
}
