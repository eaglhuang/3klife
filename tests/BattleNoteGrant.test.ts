/**
 * 戰法筆記發放（GEN-13 / PROG-2-0816）
 *
 * 鎖住：千人斬產出 3 本戰法筆記、百人斬 1 本、非筆記獎勵不動庫存、
 * 原庫存不被修改，以及道具表有戰法筆記的顯示名稱。
 */
import { assert, TestSuite } from './TestRunner';
import { grantTacticNotes, rewardsForMilestones } from '../assets/scripts/core/systems/MilestoneRewards';
import { ITEM_BATTLE_NOTE, ITEM_DISPLAY_NAMES } from '../assets/scripts/core/systems/PlayerInventory';

export function createBattleNoteGrantSuite(): TestSuite {
    const suite = new TestSuite('BattleNoteGrant (戰法筆記發放 GEN-13)');

    suite.test('千人斬發 3 本、百人斬發 1 本戰法筆記', () => {
        const fromKill1000 = grantTacticNotes({}, rewardsForMilestones(['KILL_1000']));
        assert.equals(3, fromKill1000[ITEM_BATTLE_NOTE] ?? 0);
        const fromKill100 = grantTacticNotes({}, rewardsForMilestones(['KILL_100']));
        assert.equals(1, fromKill100[ITEM_BATTLE_NOTE] ?? 0);
    });

    suite.test('非筆記獎勵（稱號、虎符品質、因子）不改變庫存', () => {
        const before = { ITEM_ORACLE: 2 };
        const after = grantTacticNotes(before, rewardsForMilestones(['KILL_10000', 'ASURA']));
        assert.equals(JSON.stringify(before), JSON.stringify(after));
    });

    suite.test('不修改傳入的庫存物件，並可疊加既有筆記', () => {
        const before = { [ITEM_BATTLE_NOTE]: 2 };
        const after = grantTacticNotes(before, rewardsForMilestones(['KILL_1000']));
        assert.equals(2, before[ITEM_BATTLE_NOTE]);
        assert.equals(5, after[ITEM_BATTLE_NOTE]);
    });

    suite.test('道具表有戰法筆記的顯示名稱', () => {
        assert.equals('戰法筆記', ITEM_DISPLAY_NAMES[ITEM_BATTLE_NOTE]);
    });

    return suite;
}
