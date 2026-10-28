/**
 * PrisonTerritoryE2E.test.ts — 俘虜、監獄容量、太守府升級、季結產出、存讀檔（QA，PROG-2-1450）
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { prisonCapacityOf } from '../assets/scripts/core/systems/PrisonerOfWar';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { person } from './MvpMainFlowE2E.test';
import { sys } from 'cc';

function build(adapter: MemoryStorageAdapter, roster: GeneralConfig[] = []): GameSession {
    const s = new GameSession(11);
    s.setRosterStore(new InMemoryRosterStore(roster));
    s.setLifecycle(new LegacyService(new MemoryStorageAdapter()));
    s.setSaveService(new PlayerSaveService(adapter));
    s.setAutoSave(false);
    return s;
}

export function createPrisonTerritoryE2ESuite(): TestSuite {
    const suite = new TestSuite('PrisonTerritoryE2E (俘虜監獄與太守府升級 PROG-2-1450)');

    suite.test('容量滿了不能再關押；太守府升級後容量增加可再關押；產出隨季結累積；存讀檔保留', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const adapter = new MemoryStorageAdapter();
        const a = build(adapter, [person('lead', '男', 30)]);
        a.startNewGame(9);
        const cap1 = prisonCapacityOf(a.territoryLevel);

        // 1. 俘虜 cap1+1 位，關滿容量，第 cap1+1 位被擋
        const targets = Array.from({ length: cap1 + 1 }, (_, i) => person(`enemy-${i}`, '男', 35));
        for (const t of targets) assert.isTrue(!!(await a.capturePrisoner(t)), `俘虜 ${t.id}`);
        assert.equals(cap1 + 1, a.prison.pending.length);
        for (let i = 0; i < cap1; i++) {
            const r = await a.resolvePrisoner(`enemy-${i}`, 'imprison');
            assert.isTrue(!!r?.imprisoned, `第 ${i + 1} 位關押成功`);
        }
        assert.equals(cap1, a.prison.prisoners.length);
        const blocked = await a.resolvePrisoner(`enemy-${cap1}`, 'imprison');
        assert.isFalse(!!blocked?.imprisoned, '容量已滿不能再關');
        assert.equals(1, a.prison.pending.length, '被擋的俘虜仍在待處置');
        // 同一人不重複俘虜
        assert.equals(null, await a.capturePrisoner(targets[0]), '已關押的人不重複俘虜');

        // 2. 季結累積情報（關押者每季產出）
        const intel0 = a.prison.intel;
        await a.advanceSeason();
        assert.isTrue(a.prison.intel >= intel0, '情報不減少');

        // 3. 存讀檔後仍滿、仍被擋；升級太守府後容量增加才可關
        await a.save();
        const b = build(adapter, [person('lead', '男', 30)]);
        assert.isTrue(await b.load());
        assert.equals(cap1, b.prison.prisoners.length, '讀檔後關押者保留');
        assert.equals(1, b.prison.pending.length, '讀檔後待處置保留');
        const stillBlocked = await b.resolvePrisoner(`enemy-${cap1}`, 'imprison');
        assert.isFalse(!!stillBlocked?.imprisoned, '讀檔後同樣被擋');

        (b as unknown as { _military: { food: number } })._military.food = 5000;
        const plan = b.orderTerritoryUpgrade(() => true);
        assert.isTrue(plan.ok, '升級下單成功');
        assert.equals(1, b.territoryLevel, '下單後季結才生效');
        await b.advanceSeason();
        assert.equals(2, b.territoryLevel, '季結後升到 2 級');
        assert.isTrue(prisonCapacityOf(b.territoryLevel) >= cap1, '容量不減');
        // Lv1→Lv2 容量仍為 3（每兩級 +1），升到 Lv3 才多一格：再升一級
        (b as unknown as { _military: { food: number } })._military.food = 50000;
        assert.isTrue(b.orderTerritoryUpgrade(() => true).ok, '再升一級下單');
        await b.advanceSeason();
        assert.equals(3, b.territoryLevel);
        assert.isTrue(prisonCapacityOf(3) > cap1, 'Lv3 容量比 Lv1 多');
        const ok = await b.resolvePrisoner(`enemy-${cap1}`, 'imprison');
        assert.isTrue(!!ok?.imprisoned, '升級後容量增加可再關押');
        assert.equals(cap1 + 1, b.prison.prisoners.length);

        // 升級後再存讀檔：等級、關押者都保留
        await b.save();
        const c = build(adapter, [person('lead', '男', 30)]);
        assert.isTrue(await c.load());
        assert.equals(3, c.territoryLevel);
        assert.equals(cap1 + 1, c.prison.prisoners.length);
    });

    return suite;
}
