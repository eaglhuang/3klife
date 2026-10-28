/**
 * PostLoadGraphSync.test.ts — 讀檔完成處統一補血統圖（PROG-2-0698）
 * 任何讀檔入口（不經結緣畫面）之後，名冊裡的子嗣都已在血統圖上，下一代祖譜完整。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { BreedingService } from '../assets/scripts/core/services/BreedingService';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { buildWorld, person } from './MvpMainFlowE2E.test';
import { sys } from 'cc';

export function createPostLoadGraphSyncSuite(): TestSuite {
    const suite = new TestSuite('PostLoadGraphSync (讀檔後補血統圖 PROG-2-0698)');

    suite.test('掛上讀檔後處理：讀檔完成時子嗣已在血統圖，父母可查', async () => {
        const adapter = new MemoryStorageAdapter();
        const w = buildWorld(adapter, [person('hero', '男', 30), person('lady', '女', 28)]);
        w.session.startNewGame(1);
        const childId = w.breeding.breed('hero', 'lady').child!.id;
        await w.session.save();

        // 新世界：血統圖是空的，只掛讀檔後處理，不碰結緣畫面
        const store = new InMemoryRosterStore([]);
        const graph = new BloodlineGraph();
        const breeding = new BreedingService(store, graph, { random: () => 0.01 });
        const session = new GameSession();
        session.setRosterStore(store);
        session.setSaveService(new PlayerSaveService(adapter));
        session.setLifecycle(new LegacyService(adapter));
        let calls = 0;
        session.setPostLoadHook(() => { calls++; breeding.syncGraphFromRoster(); });
        assert.isTrue(!graph.getParents(childId).father, '讀檔前圖上沒有子嗣');
        assert.isTrue(await session.load());
        assert.equals(1, calls, '讀檔後處理呼叫一次');
        assert.equals('hero', graph.getParents(childId).father, '讀檔後子嗣的父親在圖上');
        assert.equals('lady', graph.getParents(childId).mother);
    });

    suite.test('讀檔後處理拋錯不讓讀檔失敗；沒有存檔時不呼叫', async () => {
        const adapter = new MemoryStorageAdapter();
        const w = buildWorld(adapter, [person('hero', '男', 30)]);
        let calls = 0;
        w.session.setPostLoadHook(() => { calls++; throw new Error('boom'); });
        assert.isFalse(await w.session.load(), '沒有存檔回傳 false');
        assert.equals(0, calls);
        w.session.startNewGame(2);
        await w.session.save();
        assert.isTrue(await w.session.load(), '拋錯仍讀檔成功');
        assert.equals(1, calls);
    });

    suite.test('ServiceLoader 的 session 已掛上讀檔後處理，讀檔時會載入血統登記表', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const svc = services();
        svc.session.startNewGame(3);
        await svc.session.save();
        assert.isTrue(await svc.session.load(), '經 ServiceLoader 的 session 讀檔成功');
        assert.isTrue(BloodlineGraph.getInstance().isLoaded, '讀檔後處理已載入血統登記表');
    });

    return suite;
}
