/**
 * PrisonTreasureFlowE2E.test.ts — 監獄傳家寶掉落、取得紀錄（QA，PROG-2-1478）
 * 關押俘虜多季後，傳家寶物入庫且來源為 DROP；取得紀錄加總與背包數量相符；
 * 存讀檔後仍一致；沒有關押者時季結不再掉。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { ITEM_TREASURE, itemCount } from '../assets/scripts/core/systems/PlayerInventory';
import { PRISON_TREASURE_DROP_RATE } from '../assets/scripts/core/systems/PrisonerOfWar';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { person } from './MvpMainFlowE2E.test';
import { sys } from 'cc';

function build(adapter: MemoryStorageAdapter, roster: GeneralConfig[] = []): GameSession {
    const s = new GameSession(23);
    s.setRosterStore(new InMemoryRosterStore(roster));
    s.setLifecycle(new LegacyService(new MemoryStorageAdapter()));
    s.setSaveService(new PlayerSaveService(adapter));
    s.setAutoSave(false);
    return s;
}

function loggedTreasure(s: GameSession): number {
    return s.queryItemAcquisitions({ itemId: ITEM_TREASURE }).reduce((sum, r) => sum + r.amount, 0);
}

export function createPrisonTreasureFlowE2ESuite(): TestSuite {
    const suite = new TestSuite('PrisonTreasureFlowE2E (監獄傳家寶流程 PROG-2-1478)');

    suite.test('多季掉落：背包與取得紀錄一致，來源 DROP，存讀檔後仍一致', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const adapter = new MemoryStorageAdapter();
        const a = build(adapter, [person('lead', '男', 25)]);
        a.startNewGame(51);
        for (const id of ['p1', 'p2']) {
            assert.isTrue(!!(await a.capturePrisoner(person(id, '男', 35))), `俘虜 ${id}`);
            assert.isTrue(!!(await a.resolvePrisoner(id, 'imprison'))?.imprisoned, `關押 ${id}`);
        }
        assert.equals(0, itemCount(a.inventory, ITEM_TREASURE));

        // 骰值低於機率：每季每位關押者各掉一件
        const roll = PRISON_TREASURE_DROP_RATE / 2;
        a.setRandomSource(() => roll);
        for (let i = 0; i < 3; i++) await a.advanceSeason();
        const afterThree = itemCount(a.inventory, ITEM_TREASURE);
        assert.equals(6, afterThree, '三季 × 兩位關押者 = 6 件');
        assert.equals(afterThree, loggedTreasure(a), '取得紀錄加總等於背包數量');
        assert.isTrue(a.queryItemAcquisitions({ itemId: ITEM_TREASURE }).every((r) => r.source === 'DROP'), '來源皆為 DROP');

        // 骰值高於機率：不掉
        a.setRandomSource(() => 0.999);
        await a.advanceSeason();
        assert.equals(afterThree, itemCount(a.inventory, ITEM_TREASURE), '骰高不掉');

        // 存讀檔後兩者仍一致，再多一季繼續累積
        await a.save();
        const b = build(adapter, []);
        assert.isTrue(await b.load());
        assert.equals(afterThree, itemCount(b.inventory, ITEM_TREASURE), '讀檔後背包數量保留');
        assert.equals(afterThree, loggedTreasure(b), '讀檔後取得紀錄保留');
        b.setRandomSource(() => roll);
        await b.advanceSeason();
        assert.equals(afterThree + 2, itemCount(b.inventory, ITEM_TREASURE), '讀檔後關押者仍每季掉落');
        assert.equals(afterThree + 2, loggedTreasure(b), '新增掉落也記入取得紀錄');
    });

    suite.test('沒有關押者：季結不掉傳家寶', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const a = build(new MemoryStorageAdapter(), [person('lead', '男', 25)]);
        a.startNewGame(52);
        a.setRandomSource(() => 0);
        for (let i = 0; i < 3; i++) await a.advanceSeason();
        assert.equals(0, itemCount(a.inventory, ITEM_TREASURE));
    });

    return suite;
}
