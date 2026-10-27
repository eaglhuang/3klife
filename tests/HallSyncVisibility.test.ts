/**
 * HallSyncVisibility.test.ts — 大廳同步後的任務可見性、情報度與刷新池（HALL-14 第二段，PROG-2-1258）headless 測試
 *
 * 鎖住：任務列經同步列往返後，官職／沙盤階段／情報度的可見結果不變；
 * 同步後情報度的再探判定不變；武將刷新池在同步前後以同一亂數序列抽出的結果一致。
 */
import { assert, TestSuite } from './TestRunner';
import { buildHallSyncRow, parseHallSyncRow } from '../assets/scripts/core/systems/HallSyncSnapshot';
import { getVisibleHallTasks, type HallGateTask, type HallPlayerState } from '../assets/scripts/core/systems/HallMissionBoard';
import { canUseReconAction, getHallTaskIntelRevealPercent } from '../assets/scripts/core/systems/HallTaskIntel';
import { rollHallCharacters, type HallCandidate } from '../assets/scripts/core/systems/HallCharacterRoll';

const TASKS: Array<HallGateTask & { Intel_Reveal_Percent?: number }> = [
    { Task_ID: 'dom-1', Difficulty: 'NORMAL', Required_Rank: 0, Is_Accepted: false, Intel_Reveal_Percent: 100 },
    { Task_ID: 'mil-1', Difficulty: 'HELL', Required_Rank: 2, Required_Stage: 1, Required_Intel: 60, Is_Accepted: false },
    { Task_ID: 'mil-2', Difficulty: 'NORMAL', Required_Rank: 0, Required_Intel: 40, Is_Accepted: true },
];

const PLAYER: HallPlayerState = { rankTier: 2, worldStage: 1, intel: 50 };

const CANDIDATES: HallCandidate[] = [
    { id: 'zhao-yun', favorite: true, assigned: false },
    { id: 'guan-yu', favorite: false, assigned: true },
    { id: 'zhang-fei', favorite: false, assigned: false },
    { id: 'ma-chao', favorite: false, assigned: false },
];

function sequence(values: number[]): () => number {
    let index = 0;
    return () => values[index++ % values.length];
}

function roundTrip<T>(value: T): T {
    const result = parseHallSyncRow(buildHallSyncRow({ theme: null, missions: value, characters: value, updatedAt: 'T' }));
    if (!result.ok) throw new Error(result.errors.join(';'));
    return result.state.missions as T;
}

export function createHallSyncVisibilitySuite(): TestSuite {
    const suite = new TestSuite('HallSyncVisibility (大廳同步後可見性與刷新池 HALL-14 PROG-2-1258)');

    suite.test('任務可見性在同步前後一致', () => {
        const before = getVisibleHallTasks(PLAYER, TASKS, 'Military').map((t) => t.Task_ID);
        const after = getVisibleHallTasks(PLAYER, roundTrip(TASKS), 'Military').map((t) => t.Task_ID);
        assert.equals(before.join(','), after.join(','));
        assert.equals('dom-1,mil-2', after.join(','));
    });

    suite.test('情報度與再探判定在同步前後一致', () => {
        const restored = roundTrip(TASKS);
        for (let i = 0; i < TASKS.length; i++) {
            assert.equals(getHallTaskIntelRevealPercent(TASKS[i]), getHallTaskIntelRevealPercent(restored[i]));
            assert.equals(canUseReconAction(TASKS[i]), canUseReconAction(restored[i]));
        }
        assert.equals(100, getHallTaskIntelRevealPercent(restored[0]));
        assert.equals(50, getHallTaskIntelRevealPercent(restored[1]));
    });

    suite.test('武將刷新池以同一亂數序列抽出，同步前後結果一致', () => {
        const values = [0.1, 0.55, 0.92, 0.3];
        const before = rollHallCharacters(CANDIDATES, 3, sequence(values));
        const after = rollHallCharacters(roundTrip(CANDIDATES), 3, sequence(values));
        assert.equals(before.join(','), after.join(','));
        assert.equals(3, after.length);
    });

    return suite;
}
