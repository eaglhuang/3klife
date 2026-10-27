/**
 * PROG-2-1176：季結自動結算的大廳委任寫入派遣日誌
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { settleOpenAssignsForSeason } from '../assets/scripts/core/systems/HallAutoAssign';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function general(id: string, name: string): GeneralConfig {
    return {
        id, name, faction: 'player', gender: '男', age: 25, hp: 1000, vitality: 100, maxVitality: 100, maxLifespan: 120,
        str: 70, int: 60, lea: 60, pol: 50, cha: 50, luk: 40, careerClass: 'Warrior', role: 'Combat', rarityTier: 'epic',
    } as unknown as GeneralConfig;
}

export function createHallSeasonAssignJournalSuite(): TestSuite {
    const suite = new TestSuite('HallSeasonAssignJournal (PROG-2-1176 季結委任日誌)');

    suite.test('settleOpenAssignsForSeason：結算結果帶武將 ID', () => {
        const result = settleOpenAssignsForSeason([{ taskId: 't1', generalId: 'g-a', assignedAt: 'T1', difficulty: 'EASY' }], () => 0, 'S1');
        assert.equals('g-a', result.settled[0].generalId);
    });

    suite.test('委任後跨季：派遣日誌出現該武將', async () => {
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([]));
        session.setSaveService(new PlayerSaveService(new MemoryStorageAdapter()));
        session.setAutoSave(false);
        session.startNewGame(7);
        await session.addGenerals([general('g-a', '趙雲')]);
        const assigned = await session.autoAssignHallMission({ taskId: 'HALL-T1', AI_Assign_Enabled: true, Difficulty: 'EASY', board: 'Military' }, '第1年春');
        assert.isTrue(assigned.ok);
        await session.advanceSeason();
        const dispatch = session.queryJournal({ category: 'DISPATCH', generalUid: 'g-a' });
        assert.equals(1, dispatch.length);
        const outcome = session.listHallAssignRecords('HALL-T1')[0].outcome;
        assert.equals(outcome === 'success' ? '趙雲完成大廳任務。' : '趙雲執行大廳任務未果。', dispatch[0].summary);
    });

    return suite;
}
