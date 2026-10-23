/**
 * GameSessionSeasonJournal.test.ts — 季結自動寫入日誌（PROG-2-0976）
 *
 * 每次 advanceSeason 結束一個季，就寫一筆 SYSTEM 條目；存讀檔後仍保留。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import type { PlayerSaveSnapshot } from '../assets/scripts/core/services/PlayerSaveService';

function roundTrip(snapshot: PlayerSaveSnapshot): PlayerSaveSnapshot {
    return JSON.parse(JSON.stringify(snapshot)) as PlayerSaveSnapshot;
}

export function createGameSessionSeasonJournalSuite(): TestSuite {
    const suite = new TestSuite('GameSessionSeasonJournal (PROG-2-0976 季結自動日誌)');

    suite.test('兩次季結各寫一筆 SYSTEM 日誌，最新的排在前面', async () => {
        const session = new GameSession(1);
        await session.advanceSeason();
        await session.advanceSeason();

        const entries = session.queryJournal();
        assert.equals(2, entries.length);
        assert.equals('SYSTEM', entries[0].category);
        assert.isTrue(entries[0].summary.endsWith('結算。'));
        assert.isTrue(entries[0].timestamp > entries[1].timestamp);
    });

    suite.test('同一季 ID 重複寫入會被拒絕（日誌只保留一筆）', async () => {
        const session = new GameSession(1);
        await session.advanceSeason();
        const [season] = session.queryJournal();
        const before = session.queryJournal().length;
        const duplicate = session.recordJournal({
            entryId: season.entryId,
            timestamp: '2026-01-01T00:00:00',
            category: 'SYSTEM',
            relatedGeneralUids: [],
            priority: 50,
            summary: '重複的季結。',
        });
        assert.isFalse(duplicate.ok);
        assert.equals(before, session.queryJournal().length);
    });

    suite.test('季結日誌跨存讀檔保留', async () => {
        const session = new GameSession(1);
        await session.advanceSeason();
        await session.advanceSeason();

        const snapshot = roundTrip(session.createSnapshot(new Date(0)));
        const restored = new GameSession(1);
        restored.restoreLifespanState(snapshot);

        const entries = restored.queryJournal();
        assert.equals(2, entries.length);
        assert.equals(session.queryJournal()[0].entryId, entries[0].entryId);
    });

    return suite;
}
