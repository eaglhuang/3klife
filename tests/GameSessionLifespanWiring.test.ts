/**
 * GameSessionLifespanWiring.test.ts — 領地治理接線的多回合流程（PROG-2-0974）
 *
 * 每個測試都跨越真實的 advanceSeason()，驗證狀態在季與季之間保留，而不是只測單一函式。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';

const HOME = 'home-city';

export function createGameSessionLifespanWiringSuite(): TestSuite {
    const suite = new TestSuite('GameSessionLifespanWiring (PROG-2-0974 領地治理多回合流程)');

    suite.test('多回合：指派跨季保留，同一武將不可重複指派，卸下後可改派', async () => {
        const session = new GameSession(1);
        assert.isTrue(session.assignGovernor('farming', 'G010').ok);
        await session.advanceSeason();
        assert.equals(1, session.governanceAssignments.length);

        const dup = session.assignGovernor('commerce', 'G010');
        assert.isFalse(dup.ok);
        assert.equals('general-already-assigned', dup.reason!);
        await session.advanceSeason();
        assert.equals(1, session.governanceAssignments.length);

        session.unassignGovernor('farming');
        assert.isTrue(session.assignGovernor('commerce', 'G010').ok);
        assert.equals('commerce', session.governanceAssignments[0].task);
    });

    suite.test('多回合：外圍逐季失守，最後只剩主城時觸發背水一戰，且主城拒絕失守', async () => {
        const session = new GameSession(1);
        session.setTerritories([
            { id: HOME, isHome: true },
            { id: 'a', isHome: false },
            { id: 'b', isHome: false },
        ]);

        assert.isTrue(session.loseTerritory('a').ok);
        assert.equals(1, session.lastStand.defenseMultiplier);
        await session.advanceSeason();

        assert.isTrue(session.loseTerritory('b').ok);
        assert.equals(2, session.lastStand.defenseMultiplier);
        assert.equals(0.5, session.lastStand.troopProductionBonus);
        await session.advanceSeason();

        const home = session.loseTerritory(HOME);
        assert.isFalse(home.ok);
        assert.equals('home-city-protected', home.reason!);
        assert.equals(1, session.territories.length);
        assert.equals(2, session.lastStand.defenseMultiplier);
    });

    suite.test('多回合：日誌跨季保留，可依武將查詢，重複 ID 寫入被拒絕', async () => {
        const session = new GameSession(1);
        const first = session.recordJournal({
            entryId: 'JR_0001',
            timestamp: '2026-04-11T06:00:00',
            category: 'DISPATCH',
            relatedGeneralUids: ['G010'],
            priority: 80,
            summary: '趙雲完成邊境巡查。',
            sourceActionSeqRange: [401, 404],
        });
        assert.isTrue(first.ok);
        await session.advanceSeason();

        const second = session.recordJournal({
            entryId: 'JR_0002',
            timestamp: '2026-04-12T06:00:00',
            category: 'BATTLE',
            relatedGeneralUids: ['G045'],
            priority: 60,
            summary: '戰後回報。',
        });
        assert.isTrue(second.ok);
        await session.advanceSeason();

        const byGeneral = session.queryJournal({ generalUid: 'G010' });
        assert.equals(1, byGeneral.length);
        assert.equals('JR_0001', byGeneral[0].entryId);
        assert.equals(2, session.queryJournal().length);

        const dup = session.recordJournal({
            entryId: 'JR_0001',
            timestamp: '2026-04-13T06:00:00',
            category: 'GROWTH',
            relatedGeneralUids: ['G010'],
            priority: 10,
            summary: '重複。',
        });
        assert.isFalse(dup.ok);
        assert.equals('duplicate-entry-id', dup.reason!);
        assert.equals(2, session.queryJournal().length);
    });

    suite.test('被拒絕的操作不改變會話狀態（指派、失守、日誌）', () => {
        const session = new GameSession(1);
        session.assignGovernor('farming', 'G010');
        session.assignGovernor('farming', 'G045');
        assert.equals(1, session.governanceAssignments.length);
        assert.equals('G010', session.governanceAssignments[0].generalUid);
        session.recordJournal({
            entryId: 'JR_0001',
            timestamp: 'not-a-time',
            category: 'SYSTEM',
            relatedGeneralUids: [],
            priority: 1,
            summary: 'x',
        });
        assert.equals(0, session.queryJournal().length);
    });

    return suite;
}
