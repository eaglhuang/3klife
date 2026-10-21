/**
 * SpiritInfusionArchive.test.ts — 血脈灌注接線（PROG-2-1074）headless 測試
 *
 * 鎖住：英靈卡寫入灌注結果並保留其他欄位；舊卡缺欄位視為 0；找不到卡時丟錯；
 * GameSession 沒掛 lifecycle 時回傳 null，掛上後能灌注。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { GeneralArchiver } from '../assets/scripts/core/services/GeneralArchiver';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

async function seedArchiver(adapter: MemoryStorageAdapter): Promise<GeneralArchiver> {
    const archiver = new GeneralArchiver(adapter);
    await adapter.set('spirit_cards', [
        { uid: 'guan-yu', name: '關羽', isSpiritRelic: true, bloodlineLevel: 2, spiritPower: 30, linkedTallyLevel: 1 },
        { uid: 'old-card', name: '舊卡', isSpiritRelic: true },
    ]);
    return archiver;
}

export function createSpiritInfusionArchiveSuite(): TestSuite {
    const suite = new TestSuite('SpiritInfusionArchive (血脈灌注接線 PROG-2-1074)');

    suite.test('英靈卡寫入灌注結果，並保留其他欄位', async () => {
        const adapter = new MemoryStorageAdapter();
        const archiver = await seedArchiver(adapter);
        const card = await archiver.infuseSpiritCard('guan-yu', 10);
        assert.equals(3, card.bloodlineLevel!);
        assert.equals(40, card.spiritPower!);
        assert.equals(2, card.linkedTallyLevel!);
        assert.equals('關羽', card.name);
        const saved = await archiver.getSpiritCard('guan-yu');
        assert.equals(3, saved!.bloodlineLevel!);
    });

    suite.test('舊卡缺灌注欄位時視為 0，灌注後為 1／加值／1', async () => {
        const adapter = new MemoryStorageAdapter();
        const archiver = await seedArchiver(adapter);
        const card = await archiver.infuseSpiritCard('old-card', 5);
        assert.equals(1, card.bloodlineLevel!);
        assert.equals(5, card.spiritPower!);
        assert.equals(1, card.linkedTallyLevel!);
    });

    suite.test('找不到英靈卡時丟錯，不寫入', async () => {
        const adapter = new MemoryStorageAdapter();
        const archiver = await seedArchiver(adapter);
        let threw = false;
        try {
            await archiver.infuseSpiritCard('nobody', 1);
        } catch {
            threw = true;
        }
        assert.isTrue(threw);
        assert.equals(2, (await archiver.getAllSpiritCards()).length);
    });

    suite.test('GameSession 沒掛 lifecycle 時回傳 null；掛上後可灌注', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([] as GeneralConfig[]));
        session.setSaveService(new PlayerSaveService(adapter));
        assert.equals(null, await session.infuseSpiritCard('guan-yu', 10));

        const legacy = new LegacyService(adapter);
        await seedArchiver(adapter);
        session.setLifecycle(legacy);
        const card = await session.infuseSpiritCard('guan-yu', 10);
        assert.equals(3, card!.bloodlineLevel!);
    });

    return suite;
}
