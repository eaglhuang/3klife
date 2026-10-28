/**
 * HeirloomCardSessionFlow.test.ts — 寶頁傳家寶卡跟著真實季結掉落（QA，PROG-2-1479）
 * 關押俘虜多季掉落傳家寶後，寶頁內容狀態的 heirloomCard 與背包一致；存讀檔後重建仍相同。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { buildGeneralDetailOverviewContentState } from '../assets/scripts/ui/components/GeneralDetailOverviewMapper';
import { ITEM_TREASURE, itemCount } from '../assets/scripts/core/systems/PlayerInventory';
import { PRISON_TREASURE_DROP_RATE } from '../assets/scripts/core/systems/PrisonerOfWar';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { person } from './MvpMainFlowE2E.test';
import { sys } from 'cc';

function build(adapter: MemoryStorageAdapter, roster: GeneralConfig[] = []): GameSession {
    const s = new GameSession(29);
    s.setRosterStore(new InMemoryRosterStore(roster));
    s.setLifecycle(new LegacyService(new MemoryStorageAdapter()));
    s.setSaveService(new PlayerSaveService(adapter));
    s.setAutoSave(false);
    return s;
}

function cardOf(s: GameSession, hero: GeneralConfig) {
    return buildGeneralDetailOverviewContentState(hero, s.inventoryViews, s.inventoryRecords, s.military.cityTroops, null, s.inventory).heirloomCard;
}

export function createHeirloomCardSessionFlowSuite(): TestSuite {
    const suite = new TestSuite('HeirloomCardSessionFlow (寶頁傳家寶卡跟著季結 PROG-2-1479)');

    suite.test('季結掉落後寶頁卡數量等於背包，存讀檔後重建仍相同；沒掉過為 NONE，舊呼叫方式不出錯', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const adapter = new MemoryStorageAdapter();
        const lead = person('lead', '男', 25);
        const a = build(adapter, [lead]);
        a.startNewGame(71);
        assert.equals('NONE', cardOf(a, lead).state, '起始沒有傳家寶');
        assert.equals('NONE', buildGeneralDetailOverviewContentState(lead).heirloomCard.state, '不帶背包的舊呼叫方式為 NONE');

        assert.isTrue(!!(await a.capturePrisoner(person('p1', '男', 35))));
        assert.isTrue(!!(await a.resolvePrisoner('p1', 'imprison'))?.imprisoned);
        a.setRandomSource(() => PRISON_TREASURE_DROP_RATE / 2);
        for (let i = 0; i < 3; i++) await a.advanceSeason();
        const count = itemCount(a.inventory, ITEM_TREASURE);
        assert.equals(3, count, '三季各掉一件');
        const card = cardOf(a, lead);
        assert.equals('OWNED', card.state);
        assert.equals(count, card.count, '寶頁卡數量等於背包');

        await a.save();
        const b = build(adapter, []);
        assert.isTrue(await b.load());
        const loadedLead = b.roster.find((g) => g.id === 'lead')!;
        const again = cardOf(b, loadedLead);
        assert.equals(count, again.count, '讀檔後寶頁卡數量保留');
        assert.equals(card.countLine, again.countLine);
    });

    return suite;
}
