/**
 * ServerSchemaFul06 — 玩家等級與解鎖階段（FUL-06 / PROG-2-0856）
 *
 * 驗證重點：
 *   1. 三階段邊界：Lv20 → Phase 1、Lv21 → Phase 2、Lv45 → Phase 2、Lv46 → Phase 3
 *   2. 升級跨階段回報新跨過的階段；同階段內或降級不回報
 *   3. 列驗證擋下階段與等級不符、階段超出 1~3、player_id 過長
 *   4. 升級寫回後的列仍通過驗證
 */
import { assert, TestSuite } from './TestRunner';
import {
    advancePlayerUnlockState,
    detectPhaseCrossing,
    PlayerUnlockStateRow,
    phaseForLevel,
    validatePlayerUnlockStateRow,
} from '../server/schema/ful06-unlock-phase';

function unlockRow(overrides: Partial<PlayerUnlockStateRow> = {}): PlayerUnlockStateRow {
    return {
        player_id: 'P_0001',
        player_level: 30,
        unlock_phase: 2,
        ...overrides,
    };
}

export function createServerSchemaFul06Suite(): TestSuite {
    const suite = new TestSuite('ServerSchemaFul06 (玩家等級與解鎖階段 FUL-06)');

    suite.test('三階段邊界：Lv20 Phase1、Lv21 Phase2、Lv45 Phase2、Lv46 Phase3', () => {
        assert.equals(1, phaseForLevel(1));
        assert.equals(1, phaseForLevel(20));
        assert.equals(2, phaseForLevel(21));
        assert.equals(2, phaseForLevel(45));
        assert.equals(3, phaseForLevel(46));
    });

    suite.test('門檻可由呼叫端覆寫', () => {
        const custom = { phase1MaxLevel: 10, phase2MaxLevel: 30 };
        assert.equals(2, phaseForLevel(11, custom));
        assert.equals(3, phaseForLevel(31, custom));
    });

    suite.test('升級跨階段回報新跨過的階段；一次跨兩階段會列出兩個', () => {
        const single = detectPhaseCrossing(20, 21);
        assert.equals(1, single?.fromPhase);
        assert.equals(2, single?.toPhase);
        assert.equals(1, single?.crossedPhases.length);

        const double = detectPhaseCrossing(20, 50);
        assert.equals(2, double?.crossedPhases.length);
        assert.equals(2, double?.crossedPhases[0]);
        assert.equals(3, double?.crossedPhases[1]);
    });

    suite.test('同階段內升級或降級都不回報跨階段', () => {
        assert.equals(null, detectPhaseCrossing(21, 30));
        assert.equals(null, detectPhaseCrossing(30, 21));
    });

    suite.test('列驗證：階段與等級不符、階段超界、player_id 過長都會回報', () => {
        assert.equals(0, validatePlayerUnlockStateRow(unlockRow()).length);
        assert.isTrue(validatePlayerUnlockStateRow(unlockRow({ unlock_phase: 1 })).some((e) => e.startsWith('unlock_phase')));
        assert.isTrue(validatePlayerUnlockStateRow(unlockRow({ unlock_phase: 4 })).some((e) => e.startsWith('unlock_phase')));
        assert.isTrue(validatePlayerUnlockStateRow(unlockRow({ player_id: 'X'.repeat(33) })).some((e) => e.startsWith('player_id')));
        assert.isTrue(validatePlayerUnlockStateRow(unlockRow({ player_level: 0 })).some((e) => e.startsWith('player_level')));
    });

    suite.test('升級寫回：階段更新、跨越資訊正確，寫回後的列仍合法', () => {
        const result = advancePlayerUnlockState(unlockRow({ player_level: 44, unlock_phase: 2 }), 46);
        assert.equals(46, result.row.player_level);
        assert.equals(3, result.row.unlock_phase);
        assert.equals(3, result.crossing?.crossedPhases[0]);
        assert.equals(0, validatePlayerUnlockStateRow(result.row).length);

        assert.throws(() => advancePlayerUnlockState(unlockRow(), 0));
    });

    return suite;
}
