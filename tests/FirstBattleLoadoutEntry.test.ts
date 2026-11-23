/**
 * FirstBattleLoadoutEntry — 首戰出戰前先開戰前編成視窗（PROG-2-9912）測試
 *
 * 規則：還沒通關任何關卡且有關卡資料時，出戰先開編成視窗；通關過後或沒有關卡資料時維持原本流程。
 */
import { TestSuite, assert } from './TestRunner';
import { firstBattleOpensLoadout } from '../assets/scripts/shared/BattleEntryParams';

export function createFirstBattleLoadoutEntrySuite(): TestSuite {
    const suite = new TestSuite('FirstBattleLoadoutEntry (首戰出戰先編成 PROG-2-9912)');

    suite.test('首戰（沒有通關任何關卡）且有關卡資料時先開編成視窗', () => {
        assert.isTrue(firstBattleOpensLoadout([], true));
    });

    suite.test('通關過任何一關後不再先開編成視窗（非首戰流程不變）', () => {
        assert.isTrue(!firstBattleOpensLoadout(['encounter-001'], true));
    });

    suite.test('沒有關卡資料時照舊直接進戰場，不開編成視窗', () => {
        assert.isTrue(!firstBattleOpensLoadout([], false));
    });

    return suite;
}
