/**
 * 退役雙軌（SPI-01，PROG-2-1994）：60 歲可主動榮譽退役；滿 65 歲由系統在換季強制轉教官卡。
 */
import { assert, TestSuite } from './TestRunner';
import { GAME_SESSION_EVENTS, GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function general(id: string, age: number): GeneralConfig {
    return {
        id, name: id, faction: 'shu', gender: '男', age, hp: 1000,
        vitality: 100, maxVitality: 100, maxLifespan: 90,
        str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40,
    } as unknown as GeneralConfig;
}

function createSession(roster: GeneralConfig[]): { session: GameSession; adapter: MemoryStorageAdapter; retired: string[] } {
    const adapter = new MemoryStorageAdapter();
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore(roster));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setLifecycle(new LegacyService(adapter));
    session.startNewGame(20261108);
    session.setRandomSource(() => 0.99);
    const retired: string[] = [];
    session.setEventEmitter({ emit: (name: string, payload?: unknown) => { if (name === GAME_SESSION_EVENTS.GeneralRetired) retired.push((payload as { sourceGeneralId: string }).sourceGeneralId); } });
    return { session, adapter, retired };
}

const isMentor = (session: GameSession, id: string) => (session.roster.find((g) => g.id === id) as { isMentorCard?: boolean } | undefined)?.isMentorCard === true;

export function createRetireDualTrackSuite(): TestSuite {
    const suite = new TestSuite('RetireDualTrack（60 歲主動／65 歲強制退役 SPI-01 PROG-2-1994）');

    suite.test('60 歲可主動退役；未滿 60 歲被拒', async () => {
        const { session } = createSession([general('sixty', 60), general('young', 59.5)]);
        let threw = false;
        try { await session.retireGeneral('young'); } catch { threw = true; }
        assert.isTrue(threw);
        await session.retireGeneral('sixty');
        assert.isTrue(isMentor(session, 'sixty'));
    });

    suite.test('換季時滿 65 歲的武將由系統強制轉教官卡；未滿的不動；payload 與事件記錄', async () => {
        const { session, adapter, retired } = createSession([general('edge', 64.75), general('late', 63), general('over', 70)]);
        const payload = await session.advanceSeason();
        assert.isTrue(isMentor(session, 'edge'), '64.75 → 65 強制退役');
        assert.isTrue(isMentor(session, 'over'), '已超過 65 的也被帶進退役（含舊存檔）');
        assert.isFalse(isMentor(session, 'late'), '63 歲不動');
        assert.equals('edge,over', [...(payload.forcedRetirements ?? [])].sort().join(','));
        assert.equals('edge,over', [...retired].sort().join(','));
        assert.equals(2, (await new LegacyService(adapter).getMentorCards()).length);
    });

    suite.test('已退役的不重複退役；再換一季沒有新的強制退役', async () => {
        const { session, adapter } = createSession([general('over', 70)]);
        await session.advanceSeason();
        const second = await session.advanceSeason();
        assert.isTrue(second.forcedRetirements === undefined);
        assert.equals(1, (await new LegacyService(adapter).getMentorCards()).length);
    });

    return suite;
}
