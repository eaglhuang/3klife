/**
 * ShrineOffering — 祠堂 Lv.5 每日靈丹供奉（doc_spec_0310 §3；PROG-2-1915）
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { PlayerSaveService, normalizeShrineOfferingDay } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { ITEM_VITALITY_PILL } from '../assets/scripts/core/systems/ItemDef';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

const DAY1 = Date.parse('2026-11-07T04:00:00Z');
const DAY1_LATE = Date.parse('2026-11-07T14:00:00Z');
const DAY2 = Date.parse('2026-11-08T04:00:00Z');

function hero(kills: number): GeneralConfig {
    return {
        id: 'hero', name: 'hero', faction: 'shu', gender: '男', age: 61, hp: 1000, vitality: 100, maxVitality: 100,
        str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40, generalRank: 5,
        battleRecord: { wins: 100, losses: 0, draws: 0, merit: 0, kills },
    } as unknown as GeneralConfig;
}

function makeSession(adapter: MemoryStorageAdapter, roster: GeneralConfig[]): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore(roster));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setLifecycle(new LegacyService(adapter));
    session.setRandomSource(() => 0);
    return session;
}

export function createShrineOfferingSuite(): TestSuite {
    const suite = new TestSuite('ShrineOffering (祠堂每日靈丹 PROG-2-1915)');

    suite.test('Lv.5 每天領一次補元散，跨日可再領，讀檔記得今天已領', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = makeSession(adapter, [hero(300)]);
        await session.retireGeneral('hero');
        assert.equals(5, session.clanPrestigeTier);
        const before = session.itemCount(ITEM_VITALITY_PILL);
        assert.equals(1, await session.claimShrineOffering(DAY1));
        assert.equals(before + 1, session.itemCount(ITEM_VITALITY_PILL));
        assert.equals(0, await session.claimShrineOffering(DAY1_LATE));

        const reloaded = makeSession(adapter, []);
        assert.isTrue(await reloaded.load());
        assert.isFalse(reloaded.canClaimShrineOffering(DAY1));
        assert.isTrue(reloaded.canClaimShrineOffering(DAY2));
        assert.equals(1, await reloaded.claimShrineOffering(DAY2));
    });

    suite.test('未達 Lv.5 不能領；讀檔正規化擋掉壞值', async () => {
        const session = makeSession(new MemoryStorageAdapter(), [hero(10)]);
        await session.retireGeneral('hero');
        assert.isTrue(session.clanPrestigeTier < 5);
        assert.equals(0, await session.claimShrineOffering(DAY1));
        assert.equals(null, normalizeShrineOfferingDay('yesterday'));
        assert.equals('2026-11-07', normalizeShrineOfferingDay('2026-11-07'));
    });

    return suite;
}
