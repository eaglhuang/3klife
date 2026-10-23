import { assert, TestSuite } from './TestRunner';
import {
    arrangeHallTasks,
    getDayPeriod,
    getVisibleHallTasks,
    HallGateTask,
    shouldRecomputeBoard,
} from '../assets/scripts/core/systems/HallMissionBoard';

function task(id: string, overrides: Partial<HallGateTask> = {}): HallGateTask {
    return { Task_ID: id, Difficulty: 'NORMAL', Required_Rank: 0, Is_Accepted: false, ...overrides };
}

const PLAYER = { rankTier: 2, worldStage: 1, intel: 50 };

export function createHallMissionBoardSuite(): TestSuite {
    const suite = new TestSuite('HallMissionBoard (HALL-03 雙牆任務板)');

    suite.test('官階不足的任務不可見', () => {
        const visible = getVisibleHallTasks(PLAYER, [task('a', { Required_Rank: 3 }), task('b', { Required_Rank: 2 })], 'Domestic');
        assert.equals('b', visible[0].Task_ID);
        assert.equals(1, visible.length);
    });

    suite.test('世界沙盤階段不足的任務不可見', () => {
        const visible = getVisibleHallTasks(PLAYER, [task('a', { Required_Stage: 2 }), task('b', { Required_Stage: 1 })], 'Domestic');
        assert.equals(1, visible.length);
        assert.equals('b', visible[0].Task_ID);
    });

    suite.test('情報度只過濾軍事牆，內政牆不受影響', () => {
        const gated = task('m', { Required_Intel: 80 });
        assert.equals(0, getVisibleHallTasks(PLAYER, [gated], 'Military').length);
        assert.equals(1, getVisibleHallTasks(PLAYER, [gated], 'Domestic').length);
        assert.equals(1, getVisibleHallTasks({ ...PLAYER, intel: 80 }, [gated], 'Military').length);
    });

    suite.test('難度上限隨官職提高（暫定對照表）', () => {
        const hell = task('h', { Difficulty: 'HELL' });
        assert.equals(0, getVisibleHallTasks({ ...PLAYER, rankTier: 4 }, [hell], 'Domestic').length);
        assert.equals(1, getVisibleHallTasks({ ...PLAYER, rankTier: 5 }, [hell], 'Domestic').length);
    });

    suite.test('未知難度不顯示', () => {
        assert.equals(0, getVisibleHallTasks(PLAYER, [task('x', { Difficulty: 'SUPER' })], 'Domestic').length);
    });

    suite.test('已接取任務置頂，其餘保持原順序', () => {
        const arranged = arrangeHallTasks([task('a'), task('b', { Is_Accepted: true }), task('c'), task('d', { Is_Accepted: true })]);
        assert.equals('b,d,a,c', arranged.map(t => t.Task_ID).join(','));
    });

    suite.test('輸入陣列不被改寫', () => {
        const tasks = [task('a'), task('b', { Is_Accepted: true })];
        arrangeHallTasks(tasks);
        assert.equals('a', tasks[0].Task_ID);
    });

    suite.test('時段切點：06~11 早、12~17 中、其餘晚', () => {
        assert.equals('MORNING', getDayPeriod(6));
        assert.equals('MORNING', getDayPeriod(11));
        assert.equals('NOON', getDayPeriod(12));
        assert.equals('NOON', getDayPeriod(17));
        assert.equals('EVENING', getDayPeriod(18));
        assert.equals('EVENING', getDayPeriod(5));
        assert.throws(() => getDayPeriod(24));
    });

    suite.test('重算時機：進入大廳與手動刷新一律重算，時段切換才重算', () => {
        assert.isTrue(shouldRecomputeBoard('ENTER_LOBBY', 'MORNING', 'MORNING'));
        assert.isTrue(shouldRecomputeBoard('MANUAL_REFRESH', 'NOON', 'NOON'));
        assert.isTrue(shouldRecomputeBoard('TICK', 'MORNING', 'NOON'));
        assert.isFalse(shouldRecomputeBoard('TICK', 'NOON', 'NOON'));
    });

    return suite;
}
