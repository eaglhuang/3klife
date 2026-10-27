/**
 * InventoryRecordSeasonE2E.test.ts — 季結陣亡產虎符 → 統一物件庫列 → 存讀檔 → 新局重置（#824，QA，PROG-2-0668）
 *
 * Unity 對照：像真的讓角色老死一次，再看背包總表有沒有多一列、存檔讀回還在、開新遊戲後是否清空，
 * 而不是只手動塞一張卡進去。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { sys } from 'cc';

function general(id: string, extra: Record<string, unknown> = {}): GeneralConfig {
    return { id, name: id, faction: 'shu', gender: '男', age: 40, hp: 1000, maxLifespan: 70, ...extra } as unknown as GeneralConfig;
}

function setup(adapter: MemoryStorageAdapter): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore([
        general('liu', { age: 69.75, templateId: 'liu-bei-1', isHistorical: true }),
        general('zhang', { templateId: 'zhang-fei-1' }),
    ]));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setLifecycle({
        settleSeason: async (r: GeneralConfig[]) => ({ roster: r.filter((g) => g.status !== 'dead'), settlement: { spiritCards: [] } }),
        retireGeneral: async () => { throw new Error('not used'); },
    } as never);
    session.startNewGame(7);
    return session;
}

export function createInventoryRecordSeasonE2ESuite(): TestSuite {
    const suite = new TestSuite('InventoryRecordSeasonE2E (季結虎符→物件庫列 PROG-2-0668)');

    suite.test('名將老死產生虎符：物件庫視圖與虎符卡一致，存讀檔保留，開新局清空', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const adapter = new MemoryStorageAdapter();
        const session = setup(adapter);
        session.spendLifespan('liu', 'breeding');
        await session.advanceSeason();

        const cardUids = Object.keys(session.tallyCards);
        assert.equals(1, cardUids.length);
        const views = session.inventoryViews;
        assert.equals(cardUids.length, Object.keys(views.talismans).length);
        const entry = views.talismans[cardUids[0]];
        assert.equals('DeathSettlement', entry.Source_Type);
        assert.equals(session.tallyCards[cardUids[0]].quality, entry.Quality);
        await session.save();

        const restored = new GameSession();
        restored.setRosterStore(new InMemoryRosterStore([]));
        restored.setSaveService(new PlayerSaveService(adapter));
        assert.isTrue(await restored.load());
        assert.equals(1, Object.keys(restored.inventoryViews.talismans).length);
        assert.equals(session.tallyCards[cardUids[0]].quality, restored.inventoryViews.talismans[cardUids[0]].Quality);

        restored.startNewGame(9);
        assert.equals(0, Object.keys(restored.inventoryViews.talismans).length);
        assert.equals(0, Object.keys(restored.tallyCards).length);
    });

    return suite;
}
