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
import { normalizeInfusionRecords } from '../assets/scripts/core/services/PlayerSaveService';
import { applyInfusionStats, tallyInfusionLevelOf } from '../assets/scripts/core/systems/DuplicatePullRouting';
import { addTallyExp } from '../assets/scripts/core/systems/TigerTallyStar';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import type { TigerTallyCard } from '../assets/scripts/core/models/TigerTallyCard';

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

    async function infusedSession(general: Partial<GeneralConfig>): Promise<{ session: GameSession; adapter: MemoryStorageAdapter }> {
        const adapter = new MemoryStorageAdapter();
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([{ id: 'guan-yu', name: '關羽', ...general } as unknown as GeneralConfig]));
        session.setSaveService(new PlayerSaveService(adapter));
        await seedArchiver(adapter);
        session.setLifecycle(new LegacyService(adapter));
        await session.registerTallyCards([{ uid: 't1', templateId: 'guan-yu', quality: 'SSR', stars: 1, battleExp: 0 } as unknown as TigerTallyCard]);
        return { session, adapter };
    }

    suite.test('灌注給現役武將全屬性 +5%、虎符經驗 +150、聲望 +50，並寫帳本', async () => {
        const { session } = await infusedSession({ str: 80, int: 40, luk: 0 });
        await session.infuseSpiritCard('guan-yu', 500, 'guan-yu');
        const general = session.roster.find((entry) => entry.id === 'guan-yu')!;
        assert.equals(84, general.str!);
        assert.equals(42, general.int!);
        const tally = session.tallyCards['t1'];
        assert.equals(150, tally.battleExp!);
        assert.equals(2, tally.stars!, '經驗過 100 門檻升 2★');
        assert.equals(50, session.clanPrestige);
        assert.equals(1, session.infusionRecords.length);
        assert.equals('INFUSION_RECORD', session.infusionRecords[0].kind);
        assert.equals(2, session.infusionRecords[0].linkedTallyLevel!);
    });

    suite.test('同步查虎符層級：夾 0~5，沒灌注是 0；帳本進存檔且讀回', async () => {
        const { session } = await infusedSession({ str: 80 });
        assert.equals(0, session.tallyInfusionLevelOf('guan-yu'));
        await session.infuseSpiritCard('guan-yu', 500, 'guan-yu');
        assert.equals(2, session.tallyInfusionLevelOf('guan-yu'));
        assert.equals(0, session.tallyInfusionLevelOf('zhang-fei'));
        const snapshot = session.createSnapshot(new Date(0));
        assert.equals(1, snapshot.infusionRecords!.length);
        const record = snapshot.infusionRecords![0];
        assert.equals(5, tallyInfusionLevelOf([{ ...record, linkedTallyLevel: 9 }], 'guan-yu'));
        assert.equals(1, normalizeInfusionRecords([record, { kind: 'x' }, null]).length);
        assert.equals(0, normalizeInfusionRecords('壞資料').length);
    });

    suite.test('沒有專屬虎符不給經驗；不在名冊只跳過屬性，其他照給', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([] as GeneralConfig[]));
        session.setSaveService(new PlayerSaveService(adapter));
        await seedArchiver(adapter);
        session.setLifecycle(new LegacyService(adapter));
        await session.infuseSpiritCard('guan-yu', 500);
        assert.equals(50, session.clanPrestige);
        assert.equals(1, session.infusionRecords.length);
    });

    suite.test('全屬性加成：至少 +1、不超過該轉數上限、不壓低已超過上限的值、缺欄位不補', () => {
        const raised = applyInfusionStats({ rebirthCount: 1, str: 104, int: 3, lea: 200, pol: 100 });
        assert.equals(105, raised.str!);
        assert.equals(4, raised.int!);
        assert.equals(200, raised.lea!);
        assert.equals(105, raised.pol!);
        assert.isTrue(!('luk' in raised));
    });

    suite.test('虎符經驗共用函式：不超過 3★ 與品質上限', () => {
        assert.equals(3, addTallyExp({ quality: 'SSR', star: 1, exp: 0 }, 9999).star);
        assert.equals(9999, addTallyExp({ quality: 'SSR', star: 1, exp: 0 }, 9999).exp);
    });

    return suite;
}
