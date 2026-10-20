/**
 * YearEndSaveLoad.test.ts — 年度推進 × 存讀檔 × aging 整合（QA，PROG-2-0618）
 *
 * Unity 對照：像 PlayMode 測試，跨存讀檔跑完一整年，看年報會不會重複或漏發。
 */
import { assert, TestSuite } from './TestRunner';
import { GAME_SESSION_EVENTS, GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import type { AgingGeneral } from '../assets/scripts/core/systems/GeneralAging';

function makeGeneral(id: string, age: number, extra: Partial<AgingGeneral> = {}): AgingGeneral {
    return { id, name: id, faction: 'player', age, ...extra } as AgingGeneral;
}

function createSession(storage: MemoryStorageAdapter, roster: AgingGeneral[], emitted: string[] = []): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore(roster as never));
    session.setSaveService(new PlayerSaveService(storage));
    session.setRandomSource(() => 0);
    session.setEventEmitter({ emit: (name) => emitted.push(name) });
    return session;
}

export function createYearEndSaveLoadSuite(): TestSuite {
    const suite = new TestSuite('YearEndSaveLoad (年度推進 × 存讀檔 × aging)');

    suite.test('年末存檔後讀檔：下一季不會再補發年報，新年第 4 季才發第 2 年的', async () => {
        const storage = new MemoryStorageAdapter();
        const a = createSession(storage, [makeGeneral('a', 30)]);
        const r1 = await a.advanceYear();
        assert.equals(1, r1.year);

        const emitted: string[] = [];
        const b = createSession(storage, [], emitted);
        assert.isTrue(await b.load());
        const first = await b.advanceSeason();
        assert.equals(undefined, first.yearReport);
        assert.isFalse(emitted.includes(GAME_SESSION_EVENTS.YearEnded));
        const r2 = await b.advanceYear();
        assert.equals(2, r2.year);
        assert.equals(1, emitted.filter((n) => n === GAME_SESSION_EVENTS.YearEnded).length);
    });

    suite.test('年中讀檔：照樣在該年第 4 季結束發一次年報（年中前的老化事件不補，已知暫定）', async () => {
        const storage = new MemoryStorageAdapter();
        const a = createSession(storage, [makeGeneral('dying', 90, { maxLifespan: 70 })]);
        await a.advanceSeason();
        await a.advanceSeason();

        const emitted: string[] = [];
        const b = createSession(storage, [], emitted);
        assert.isTrue(await b.load());
        const report = await b.advanceYear();
        assert.equals(1, report.year);
        assert.equals(1, emitted.filter((n) => n === GAME_SESSION_EVENTS.YearEnded).length);
        assert.isTrue(report.deaths <= 1);
    });

    suite.test('多位武將同年：死亡各只計一次，年報死亡數為 2', async () => {
        const storage = new MemoryStorageAdapter();
        const s = createSession(storage, [
            makeGeneral('d1', 90, { maxLifespan: 70 }),
            makeGeneral('d2', 95, { maxLifespan: 70 }),
            makeGeneral('ok', 20),
        ]);
        const report = await s.advanceYear();
        assert.equals(2, report.deaths);
    });

    return suite;
}
