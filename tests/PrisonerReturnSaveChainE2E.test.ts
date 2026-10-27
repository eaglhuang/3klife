/**
 * PrisonerReturnSaveChainE2E.test.ts — 放走俘虜來投的跨存讀檔多季複查（PROG-2-0675）
 *
 * Unity 對照：像把「放走名單」寫進 PlayerPrefs，重開遊戲後再 Tick 幾回合，確認名單還在、來投者照樣入冊。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { FUTURE_RETURN_CHANCE } from '../assets/scripts/core/systems/PrisonerOfWar';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function general(id: string): GeneralConfig {
    return { id, name: id, rarityTier: 'rare', cha: 30, luk: 20, int: 20, pol: 20, loyalty: 40 } as unknown as GeneralConfig;
}

function build(adapter: MemoryStorageAdapter, roster: GeneralConfig[]): GameSession {
    const s = new GameSession(3);
    s.setRosterStore(new InMemoryRosterStore(roster));
    s.setSaveService(new PlayerSaveService(adapter));
    s.setGeneralTemplates([general('gao-shun'), general('zhang-liao')]);
    return s;
}

export function createPrisonerReturnSaveChainE2ESuite(): TestSuite {
    const suite = new TestSuite('PrisonerReturnSaveChainE2E (PROG-2-0675 放走來投跨存讀檔)');

    suite.test('放走後存檔重開：名單仍在，未中不入冊；之後擲中才入冊並清單', async () => {
        const adapter = new MemoryStorageAdapter();
        const a = build(adapter, [general('lead')]);
        a.setRandomSource(() => 0);
        await a.capturePrisoner(general('gao-shun'));
        await a.resolvePrisoner('gao-shun', 'release');
        await a.save();

        const b = build(adapter, []);
        b.setRandomSource(() => FUTURE_RETURN_CHANCE + 0.5);
        assert.isTrue(await b.load());
        assert.equals(1, b.prison.released.length);
        await b.advanceSeason();
        await b.advanceSeason();
        assert.isTrue(!b.roster.some((g) => g.id === 'gao-shun'));
        assert.equals(1, b.prison.released.length);

        b.setRandomSource(() => 0);
        await b.advanceSeason();
        assert.isTrue(b.roster.some((g) => g.id === 'gao-shun'));
        assert.equals(0, b.prison.released.length);

        await b.save();
        const c = build(adapter, []);
        assert.isTrue(await c.load());
        assert.isTrue(c.roster.some((g) => g.id === 'gao-shun'));
        assert.equals(0, c.prison.released.length);
    });

    suite.test('同季放走兩人各自獨立：一人來投、一人留在名單', async () => {
        const adapter = new MemoryStorageAdapter();
        const a = build(adapter, [general('lead')]);
        a.setRandomSource(() => 0.9);
        for (const id of ['gao-shun', 'zhang-liao']) {
            await a.capturePrisoner(general(id));
            await a.resolvePrisoner(id, 'release');
        }
        let n = 0;
        a.setRandomSource(() => (n++ === 0 ? 0 : 0.9));
        await a.advanceSeason();
        const returned = a.roster.filter((g) => g.id === 'gao-shun' || g.id === 'zhang-liao');
        assert.equals(1, returned.length);
        assert.equals(1, a.prison.released.length);
    });

    return suite;
}
