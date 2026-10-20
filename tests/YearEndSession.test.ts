/**
 * GameSession 年度推進與年末事件（TIME-07 接線 / PROG-2-0811）
 *
 * 鎖住：advanceYear 跑到年末並回傳年報、年報只在年末發出一次、
 * YearEnded 掛點事件、年報計數本年老化事件（死亡）。
 */
import { assert, TestSuite } from './TestRunner';
import { GAME_SESSION_EVENTS, GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import type { AgingGeneral } from '../assets/scripts/core/systems/GeneralAging';

function makeGeneral(id: string, age: number, extra: Partial<AgingGeneral> = {}): AgingGeneral {
    return { id, name: id, faction: 'player', age, ...extra } as AgingGeneral;
}

function createSession(roster: AgingGeneral[]): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore(roster as never));
    session.setSaveService(new PlayerSaveService(new MemoryStorageAdapter()));
    session.setRandomSource(() => 0);
    return session;
}

export function createYearEndSessionSuite(): TestSuite {
    const suite = new TestSuite('YearEndSession (年度推進與年末事件 TIME-07)');

    suite.test('advanceYear：從第 1 季跑滿一年，回傳本年年報並計入死亡', async () => {
        const session = createSession([makeGeneral('dying', 90, { maxLifespan: 70 })]);
        const report = await session.advanceYear();
        assert.equals(1, report.year);
        assert.equals(4, report.seasons);
        assert.equals(1, report.deaths);
        assert.equals(0, report.retirementCandidates);
    });

    suite.test('年末事件：只在第 4 季結束時發出一次，前三季不發', async () => {
        const emitted: string[] = [];
        const session = createSession([makeGeneral('a', 30)]);
        session.setEventEmitter({ emit: (name) => emitted.push(name) });
        for (let i = 0; i < 3; i++) await session.advanceSeason();
        assert.isFalse(emitted.includes(GAME_SESSION_EVENTS.YearEnded));
        const fourth = await session.advanceSeason();
        assert.isTrue(emitted.includes(GAME_SESSION_EVENTS.YearEnded));
        assert.equals(1, fourth.yearReport?.year ?? -1);
        assert.equals(1, emitted.filter(name => name === GAME_SESSION_EVENTS.YearEnded).length);
    });

    suite.test('年報只統計該年事件：跨年後計數歸零重算', async () => {
        const session = createSession([makeGeneral('dying', 90, { maxLifespan: 70 })]);
        const first = await session.advanceYear();
        assert.equals(1, first.deaths);
        // 死者不再增齡，第二年沒有新死亡
        const second = await session.advanceYear();
        assert.equals(2, second.year);
        assert.equals(0, second.deaths);
    });

    return suite;
}
