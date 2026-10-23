/**
 * HallMissionDispatch — 大廳任務派遣條件與成敗判定（任務流程純邏輯）的 headless 測試
 *
 * 鎖住：派遣三種阻擋原因、可見性沿用任務牆規則、成敗判定依門檻且不用亂數。
 */
import { assert, TestSuite } from './TestRunner';
import { canDispatchHallTask, judgeHallMissionSuccess, resolveHallDispatch } from '../assets/scripts/core/systems/HallMissionDispatch';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
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

    suite.test('派遣結算：通過條件才產生結果，阻擋時不判定', () => {
        const blocked = resolveHallDispatch(task(), player, 'Domestic', null, 999);
        assert.isFalse(blocked.ok);
        const won = resolveHallDispatch(task({ Difficulty: 'EASY' }), player, 'Military', 'g1', 500);
        assert.isTrue(won.ok);
        assert.isTrue(won.ok && won.outcome.success);
        assert.equals('EASY', won.ok ? won.outcome.difficulty : '');
    });

    suite.test('GameSession.dispatchHallTask：成功派遣會指派武將並結算；阻擋時不指派', async () => {
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([{ id: 'zhang-fei', name: '張飛' } as never]));
        const blocked = await session.dispatchHallTask(task({ Required_Rank: 5 }), 'Domestic', player, 'zhang-fei', 999);
        assert.isFalse(blocked.ok);
        assert.isFalse('t1' in session.hallAssignments);
        const done = await session.dispatchHallTask(task({ Difficulty: 'EASY' }), 'Domestic', player, 'zhang-fei', 500);
        assert.isTrue(done.ok);
        assert.equals('zhang-fei', session.hallAssignments['t1'] ?? '');
    });

    suite.test('GameSession.dispatchHallTask：戰力不足為失敗，仍會指派（任務消耗）', async () => {
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([{ id: 'zhang-fei', name: '張飛' } as never]));
        const lost = await session.dispatchHallTask(task({ Difficulty: 'HELL' }), 'Domestic', { ...player, rankTier: 5 }, 'zhang-fei', 10);
        assert.isTrue(lost.ok && lost.outcome.success === false);
        assert.equals('zhang-fei', session.hallAssignments['t1'] ?? '');
    });

    return suite;
}
