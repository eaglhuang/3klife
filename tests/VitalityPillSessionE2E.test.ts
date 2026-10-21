/**
 * VitalityPillSessionE2E.test.ts — 補元散走派發器後的整場流程（#811，QA，PROG-2-0665）
 *
 * Unity 對照：像在 PlayMode 裡真的按「使用道具」，看背包扣了、名冊精力回復、存檔還在，
 * 而不是只測 ItemEffectDispatcher 自己。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { ITEM_PREMIUM_VITALITY_PILL, ITEM_VITALITY_PILL } from '../assets/scripts/core/systems/PlayerInventory';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { sys } from 'cc';

function general(id: string, vitality: number, maxVitality: number): GeneralConfig {
    return {
        id, name: id, faction: 'player', gender: '男', age: 25, hp: 1000, vitality, maxVitality, maxLifespan: 120,
        str: 60, int: 60, lea: 60, pol: 50, cha: 50, luk: 40, careerClass: 'Warrior', role: 'Combat', rarityTier: 'epic',
    } as unknown as GeneralConfig;
}

function setup(roster: GeneralConfig[], adapter: MemoryStorageAdapter): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore(roster));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setAutoSave(true);
    session.startNewGame(7);
    return session;
}

export function createVitalityPillSessionE2ESuite(): TestSuite {
    const suite = new TestSuite('VitalityPillSessionE2E (補元散整場流程 PROG-2-0665)');

    suite.test('補元散 +50、高級 +100：扣道具、名冊精力回復且不超過上限，存檔保留', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const adapter = new MemoryStorageAdapter();
        const session = setup([general('a', 10, 120), general('b', 90, 100)], adapter);
        await session.addItem(ITEM_VITALITY_PILL, 2);
        await session.addItem(ITEM_PREMIUM_VITALITY_PILL, 1);

        const r1 = await session.usePillOnGeneral('a', 'vitalityPill');
        assert.isTrue(r1.ok);
        assert.equals(60, session.roster.find((g) => g.id === 'a')!.vitality!);
        const r2 = await session.usePillOnGeneral('b', 'premiumVitalityPill');
        assert.isTrue(r2.ok);
        assert.equals(100, session.roster.find((g) => g.id === 'b')!.vitality!, '夾在上限 100');
        assert.equals(1, session.itemCount(ITEM_VITALITY_PILL));
        assert.equals(0, session.itemCount(ITEM_PREMIUM_VITALITY_PILL));

        const restored = new GameSession();
        restored.setRosterStore(new InMemoryRosterStore([]));
        restored.setSaveService(new PlayerSaveService(adapter));
        await restored.load();
        assert.equals(1, restored.itemCount(ITEM_VITALITY_PILL));
        assert.equals(60, restored.roster.find((g) => g.id === 'a')!.vitality!);
    });

    suite.test('拒絕的情況（精力已滿、沒有道具、查無武將）：背包與名冊都不變', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const session = setup([general('a', 100, 100), general('b', 5, 100)], new MemoryStorageAdapter());
        await session.addItem(ITEM_VITALITY_PILL, 1);

        const full = await session.usePillOnGeneral('a', 'vitalityPill');
        assert.isFalse(full.ok);
        assert.equals(1, session.itemCount(ITEM_VITALITY_PILL));
        const noItem = await session.usePillOnGeneral('b', 'premiumVitalityPill');
        assert.isFalse(noItem.ok);
        assert.equals(5, session.roster.find((g) => g.id === 'b')!.vitality!);
        const none = await session.usePillOnGeneral('zzz', 'vitalityPill');
        assert.isFalse(none.ok);
        assert.equals(1, session.itemCount(ITEM_VITALITY_PILL));
    });

    return suite;
}
