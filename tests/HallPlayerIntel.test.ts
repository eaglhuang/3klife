/**
 * 大廳任務牆情報度接線（PROG-2-1759）headless 測試
 *
 * 覆蓋：hallPlayerOf 帶入累積情報並夾在 0~100；情報達 Required_Intel 才看得到軍事任務；新存檔情報為 0。
 */
import { TestSuite, assert } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { hallPlayerOf } from '../assets/scripts/core/systems/OfficerSnapshot';
import { getVisibleHallTasks } from '../assets/scripts/core/systems/HallMissionBoard';

export function createHallPlayerIntelSuite(): TestSuite {
    const suite = new TestSuite('HallPlayerIntel (大廳任務牆情報度 PROG-2-1759)');

    suite.test('情報夾在 0~100，未傳時為 0', () => {
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([]));
        const unlocks = session.officerUnlocks;
        assert.equals(0, session.intel);
        assert.equals(0, hallPlayerOf(unlocks).intel);
        assert.equals(37, hallPlayerOf(unlocks, 37.8).intel);
        assert.equals(100, hallPlayerOf(unlocks, 250).intel);
        assert.equals(0, hallPlayerOf(unlocks, -5).intel);
        assert.equals(0, hallPlayerOf(unlocks, Number.NaN).intel);
    });

    suite.test('情報達 Required_Intel 才看得到軍事任務', () => {
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([]));
        const task = { Required_Rank: 1, Required_Intel: 40, Difficulty: 'EASY' } as unknown as Parameters<typeof getVisibleHallTasks>[1][number];
        assert.equals(0, getVisibleHallTasks(hallPlayerOf(session.officerUnlocks, 39), [task], 'Military').length);
        assert.equals(1, getVisibleHallTasks(hallPlayerOf(session.officerUnlocks, 40), [task], 'Military').length);
    });

    return suite;
}
