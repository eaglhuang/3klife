// 戰功入帳官職經驗（官職系統 E-2，PROG-2-1619）
import { TestSuite, assert } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';

function createSession(): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore([]));
    session.setRandomSource(() => 0.99);
    return session;
}

export function createOfficerBattleMeritSuite(): TestSuite {
    const suite = new TestSuite('OfficerBattleMerit (戰功官職經驗 PROG-2-1619)');

    suite.test('勝 +19、敗 +7、平手不計', async () => {
        const session = createSession();
        await session.recordBattle([], 'player-win');
        assert.equals(19, session.officerState.officerExp);
        await session.recordBattle([], 'enemy-win');
        assert.equals(26, session.officerState.officerExp);
        await session.recordBattle([], 'draw');
        assert.equals(26, session.officerState.officerExp);
    });

    return suite;
}
