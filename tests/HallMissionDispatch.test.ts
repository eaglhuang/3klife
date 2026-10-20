/**
 * HallMissionDispatch — 大廳任務派遣條件與成敗判定（任務流程純邏輯）的 headless 測試
 *
 * 鎖住：派遣三種阻擋原因、可見性沿用任務牆規則、成敗判定依門檻且不用亂數。
 */
import { assert, TestSuite } from './TestRunner';
import { canDispatchHallTask, judgeHallMissionSuccess } from '../assets/scripts/core/systems/HallMissionDispatch';
import type { HallGateTask, HallPlayerState } from '../assets/scripts/core/systems/HallMissionBoard';

const player: HallPlayerState = { rankTier: 2, worldStage: 1, intel: 0 };
const task = (overrides: Partial<HallGateTask> = {}): HallGateTask => ({
    Task_ID: 't1',
    Difficulty: 'NORMAL',
    Required_Rank: 1,
    Is_Accepted: false,
    ...overrides,
});

export function createHallMissionDispatchSuite(): TestSuite {
    const suite = new TestSuite('HallMissionDispatch (大廳任務派遣與成敗 純邏輯)');

    suite.test('可派遣：可見、未接取、有武將', () => {
        assert.isTrue(canDispatchHallTask(task(), player, 'Domestic', 'g1').ok);
    });

    suite.test('不可見（官職不足）時擋下，原因為 NOT_VISIBLE', () => {
        const result = canDispatchHallTask(task({ Required_Rank: 5 }), player, 'Domestic', 'g1');
        assert.isFalse(result.ok);
        assert.equals('NOT_VISIBLE', result.ok ? '' : result.reason);
    });

    suite.test('已接取的任務不能再派遣', () => {
        const result = canDispatchHallTask(task({ Is_Accepted: true }), player, 'Domestic', 'g1');
        assert.equals('ALREADY_ACCEPTED', result.ok ? '' : result.reason);
    });

    suite.test('沒有指派武將時擋下，原因為 NO_GENERAL', () => {
        const result = canDispatchHallTask(task(), player, 'Domestic', null);
        assert.equals('NO_GENERAL', result.ok ? '' : result.reason);
    });

    suite.test('成敗判定：戰力達門檻成功、不足失敗、未知難度失敗', () => {
        assert.isTrue(judgeHallMissionSuccess('NORMAL', 200));
        assert.isFalse(judgeHallMissionSuccess('NORMAL', 199));
        assert.isFalse(judgeHallMissionSuccess('legendary', 9999));
    });

    suite.test('成敗判定不用亂數：同樣輸入每次結果相同', () => {
        const results = Array.from({ length: 20 }, () => judgeHallMissionSuccess('ELITE', 350));
        assert.isTrue(results.every((r) => r === true));
    });

    return suite;
}
