/**
 * GameSessionLifespanSave.test.ts — 領地治理跨存讀檔的往返（PROG-2-0975）
 *
 * 每個測試都做「會話 → 快照 → JSON 往返 → 新會話還原」，驗證資料不會在存檔時丟失。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import type { PlayerSaveSnapshot } from '../assets/scripts/core/services/PlayerSaveService';

/** 被指派的武將必須在名冊內（PROG-2-0663）；治理存檔不含名冊，還原後的會話也要有同一批武將 */
function withRoster(session: GameSession): GameSession {
    session.setRosterStore(new InMemoryRosterStore(['G010', 'G045'].map((id) => ({ id, name: id, faction: 'shu', gender: '男', age: 30, hp: 1000, maxLifespan: 120 } as unknown as GeneralConfig))));
    return session;
}

function roundTrip(snapshot: PlayerSaveSnapshot): PlayerSaveSnapshot {
    return JSON.parse(JSON.stringify(snapshot)) as PlayerSaveSnapshot;
}

function restoredFrom(source: GameSession): GameSession {
    const restored = withRoster(new GameSession(1));
    restored.restoreLifespanState(roundTrip(source.createSnapshot(new Date(0))));
    return restored;
}

export function createGameSessionLifespanSaveSuite(): TestSuite {
    const suite = new TestSuite('GameSessionLifespanSave (PROG-2-0975 領地治理存讀檔)');

    suite.test('多回合：指派、失守、日誌跨存讀檔保留', async () => {
        const session = withRoster(new GameSession(1));
        session.setTerritories([
            { id: 'home-city', isHome: true },
            { id: 'a', isHome: false },
        ]);
        session.assignGovernor('farming', 'G010');
        session.recordJournal({
            entryId: 'JR_0001',
            timestamp: '2026-04-11T06:00:00',
            category: 'DISPATCH',
            relatedGeneralUids: ['G010'],
            priority: 80,
            summary: '趙雲完成邊境巡查。',
            sourceActionSeqRange: [401, 404],
        });
        await session.advanceSeason();
        assert.isTrue(session.loseTerritory('a').ok);
        await session.advanceSeason();

        const restored = restoredFrom(session);
        assert.equals(1, restored.governanceAssignments.length);
        assert.equals('G010', restored.governanceAssignments[0].generalUid);
        assert.equals(1, restored.territories.length);
        assert.isTrue(restored.territories[0].isHome);
        assert.equals(2, restored.lastStand.defenseMultiplier);
        assert.equals(1, restored.queryJournal({ generalUid: 'G010' }).length);
        assert.equals(401, restored.queryJournal()[0].sourceActionSeqRange![0]);
    });

    suite.test('還原後的指派仍受衝突規則限制（同一武將不可重複指派）', () => {
        const session = withRoster(new GameSession(1));
        session.assignGovernor('farming', 'G010');
        const restored = restoredFrom(session);
        const dup = restored.assignGovernor('commerce', 'G010');
        assert.isFalse(dup.ok);
        assert.equals('general-already-assigned', dup.reason!);
    });

    suite.test('預設狀態的快照不寫入領地治理欄位（舊檔格式不變）', () => {
        const snapshot = new GameSession(1).createSnapshot(new Date(0));
        assert.isTrue(snapshot.governanceAssignments === undefined);
        assert.isTrue(snapshot.territories === undefined);
        assert.isTrue(snapshot.journalEntries === undefined);
    });

    suite.test('舊檔沒有這些欄位：讀回預設（沒有指派、只有主城、沒有日誌）', () => {
        const restored = new GameSession(1);
        restored.restoreLifespanState({} as PlayerSaveSnapshot);
        assert.equals(0, restored.governanceAssignments.length);
        assert.equals(1, restored.territories.length);
        assert.equals(0, restored.queryJournal().length);
    });

    return suite;
}
