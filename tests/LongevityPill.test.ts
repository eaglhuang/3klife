/**
 * LongevityPill.test.ts — 延壽丹延長壽命上限（武將壽命系統 E-6，PROG-2-1347）
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { addItem, ITEM_LONGEVITY_PILL, itemCount, normalizeInventory } from '../assets/scripts/core/systems/PlayerInventory';
import { resolveMaxLifespan, GENERAL_STATUS_DEAD } from '../assets/scripts/core/systems/GeneralAging';
import { LONGEVITY_PILL_YEARS, useLongevityPill } from '../assets/scripts/core/systems/LongevityPill';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { sys } from 'cc';

function general(id: string, extra: Record<string, unknown> = {}): GeneralConfig {
    return {
        id, name: id, faction: 'player', gender: '男', age: 40, hp: 1000,
        str: 60, int: 60, lea: 60, pol: 50, cha: 50, luk: 40, careerClass: 'Warrior', role: 'Combat', rarityTier: 'epic', ...extra,
    } as unknown as GeneralConfig;
}

export function createLongevityPillSuite(): TestSuite {
    const suite = new TestSuite('LongevityPill (延壽丹 PROG-2-1347)');
    const withPills = (n: number) => addItem(normalizeInventory({}), ITEM_LONGEVITY_PILL, n);

    suite.test('成功：扣 1 顆，壽命上限 = 原上限 + 3', () => {
        const g = general('a', { maxLifespan: 70 });
        const r = useLongevityPill(withPills(2), g);
        assert.isTrue(r.ok);
        if (!r.ok) return;
        assert.equals(73, r.maxLifespan);
        assert.equals(70, r.previousMaxLifespan);
        assert.equals(1, itemCount(r.inventory, ITEM_LONGEVITY_PILL));
    });

    suite.test('沒有 maxLifespan 時以推導上限為基準', () => {
        const g = general('b');
        const r = useLongevityPill(withPills(1), g);
        assert.isTrue(r.ok);
        if (r.ok) assert.equals(resolveMaxLifespan(g) + LONGEVITY_PILL_YEARS, r.maxLifespan);
    });

    suite.test('沒有道具、已陣亡：拒絕且不扣', () => {
        const none = useLongevityPill(normalizeInventory({}), general('c'));
        assert.equals('no-item', none.ok ? '' : none.reason);
        const inv = withPills(1);
        const dead = useLongevityPill(inv, general('d', { status: GENERAL_STATUS_DEAD }));
        assert.equals('dead', dead.ok ? '' : dead.reason);
        assert.equals(1, itemCount(inv, ITEM_LONGEVITY_PILL));
    });

    suite.test('GameSession：寫回名冊、可疊加、存檔保留；查無武將拒絕', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const adapter = new MemoryStorageAdapter();
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([general('a', { maxLifespan: 60 })]));
        session.setSaveService(new PlayerSaveService(adapter));
        session.setAutoSave(true);
        session.startNewGame(7);
        await session.addItem(ITEM_LONGEVITY_PILL, 2);

        const missing = await session.useLongevityPillOnGeneral('zzz');
        assert.equals('no-general', missing.ok ? '' : missing.reason);
        assert.isTrue((await session.useLongevityPillOnGeneral('a')).ok);
        assert.isTrue((await session.useLongevityPillOnGeneral('a')).ok);
        const lifespanOf = (s: GameSession) => (s.roster.find((g) => g.id === 'a') as unknown as { maxLifespan: number }).maxLifespan;
        assert.equals(66, lifespanOf(session));
        assert.equals(0, session.itemCount(ITEM_LONGEVITY_PILL));
        assert.isFalse((await session.useLongevityPillOnGeneral('a')).ok, '用完拒絕');

        const restored = new GameSession();
        restored.setRosterStore(new InMemoryRosterStore([]));
        restored.setSaveService(new PlayerSaveService(adapter));
        await restored.load();
        assert.equals(66, lifespanOf(restored));
    });

    return suite;
}
