/**
 * ClanPrestigeSave — 退役功業累積祠堂聲望並存讀檔（doc_spec_0310 §3；PROG-2-1912）
 */
import { assert, TestSuite } from './TestRunner';
import { GAME_SESSION_EVENTS, GameSession, InMemoryRosterStore, type ClanPrestigeChangedPayload } from '../assets/scripts/core/managers/GameSession';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { PlayerSaveService, normalizeClanPrestige } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function elder(id: string, generalRank: number, kills: number, wins: number): GeneralConfig {
    return {
        id, name: id, faction: 'shu', gender: '男', age: 61, hp: 1000, vitality: 100, maxVitality: 100,
        str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40, generalRank,
        battleRecord: { wins, losses: 0, draws: 0, merit: 0, kills },
    } as unknown as GeneralConfig;
}

function makeSession(adapter: MemoryStorageAdapter, roster: GeneralConfig[], events: Array<[string, unknown]>): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore(roster));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setLifecycle(new LegacyService(adapter));
    session.setEventEmitter({ emit: (name, payload) => events.push([name, payload]) });
    session.setRandomSource(() => 0);
    return session;
}

export function createClanPrestigeSaveSuite(): TestSuite {
    const suite = new TestSuite('ClanPrestigeSave (祠堂聲望存檔 PROG-2-1912)');

    suite.test('60 歲榮退：功業換聲望、升祠堂發事件，讀檔後仍保留', async () => {
        const adapter = new MemoryStorageAdapter();
        const events: Array<[string, unknown]> = [];
        const session = makeSession(adapter, [elder('a', 3, 10, 20), elder('b', 5, 40, 60)], events);
        assert.equals(0, session.clanPrestige);
        await session.retireGeneral('a');
        assert.equals(3 * 500 + 10 * 50 + 20 * 100, session.clanPrestige);
        assert.equals(2, session.clanPrestigeTier);
        const first = events.filter(([n]) => n === GAME_SESSION_EVENTS.ClanPrestigeChanged).map(([, p]) => p as ClanPrestigeChangedPayload);
        assert.equals(1, first.length);
        assert.isTrue(first[0].tierUp);
        await session.retireGeneral('b');
        assert.equals(4000 + 10500, session.clanPrestige);
        assert.equals(4, session.clanPrestigeTier);

        const reloaded = makeSession(adapter, [], []);
        assert.isTrue(await reloaded.load());
        assert.equals(14500, reloaded.clanPrestige);
    });

    suite.test('沒有功業不發事件；舊存檔沒有欄位讀回 0', async () => {
        const adapter = new MemoryStorageAdapter();
        const events: Array<[string, unknown]> = [];
        const session = makeSession(adapter, [elder('c', 0, 0, 0)], events);
        await session.retireGeneral('c');
        assert.equals(0, session.clanPrestige);
        assert.equals(0, events.filter(([n]) => n === GAME_SESSION_EVENTS.ClanPrestigeChanged).length);
        assert.isTrue(session.createSnapshot(new Date(0)).clanPrestige === undefined);
        assert.equals(0, normalizeClanPrestige(undefined));
        assert.equals(0, normalizeClanPrestige(-5));
        assert.equals(12, normalizeClanPrestige(12.9));
    });

    return suite;
}
