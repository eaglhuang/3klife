/**
 * SpiritSlotInsertReplaceSaveE2E.test.ts — 命槽插入與替換經季結與存讀檔（PROG-2-0691）
 *
 * Unity 對照：換裝後存檔重開，裝備欄與倉庫兩邊要一致，不能出現同一張卡同時在兩處。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { unequippedSpiritCards } from '../assets/scripts/core/systems/SpiritSlotFlow';
import { spiritSlotViewOf } from '../assets/scripts/core/systems/SpiritSlotState';
import type { InventoryRecord } from '../assets/scripts/core/systems/InventoryProjection';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { sys } from 'cc';

function gen(id: string): GeneralConfig {
    return {
        id, name: id, faction: 'shu', gender: '男', age: 28, hp: 900, str: 80, int: 60, lea: 70, pol: 50, cha: 50, luk: 40, ep: 70,
        maxLifespan: 70, vitality: 100, maxVitality: 100, careerClass: 'Warrior', role: 'Combat', rarityTier: 'epic', templateId: `${id}-1`,
    } as unknown as GeneralConfig;
}

function spirit(id: string): InventoryRecord {
    return {
        Inventory_ID: id, Item_Type: 'SPIRIT_CARD', Slot_Type: 'SPIRIT', Bound_General_UID: null, Quantity: 1, Quality: 'R',
        Source_Type: 'TEST', Display_Bucket: 'SPIRIT', Is_Displayed: true, Attributes: {},
    } as InventoryRecord;
}

function build(adapter: MemoryStorageAdapter, roster: GeneralConfig[]): GameSession {
    const s = new GameSession(5);
    s.setRosterStore(new InMemoryRosterStore(roster));
    s.setLifecycle(new LegacyService(new MemoryStorageAdapter()));
    s.setSaveService(new PlayerSaveService(adapter));
    s.setAutoSave(false);
    return s;
}

export function createSpiritSlotInsertReplaceSaveE2ESuite(): TestSuite {
    const suite = new TestSuite('SpiritSlotInsertReplaceSaveE2E (PROG-2-0691 命槽插入替換存讀檔)');

    suite.test('插入、設主卡、替換後經季結與存讀檔，槽內與倉庫一致', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const adapter = new MemoryStorageAdapter();
        const a = build(adapter, [gen('zhao'), gen('guan')]);
        a.startNewGame(3);
        (a as unknown as { _inventoryRecords: InventoryRecord[] })._inventoryRecords = [spirit('S1'), spirit('S2'), spirit('S3')];
        assert.isTrue(a.insertSpiritCard('zhao', 'S1', false).ok);
        assert.isTrue(a.setPrimarySpiritCard('zhao', false).ok);
        assert.equals('OWNED_ELSEWHERE', (a.insertSpiritCard('guan', 'S1', false) as { reason?: string }).reason ?? '');
        assert.isTrue(a.replaceSpiritCard('zhao', 'S2', false).ok);
        await a.advanceSeason();
        await a.save();

        const b = build(adapter, []);
        assert.isTrue(await b.load());
        const view = spiritSlotViewOf(b.inventoryRecords, 'zhao', false);
        assert.equals('S2', view.card?.Inventory_ID ?? '');
        assert.isFalse(view.state.isMain);
        assert.equals('S1,S3', unequippedSpiritCards(b.inventoryRecords).map((r) => r.Inventory_ID).sort().join(','));
        assert.equals('BATTLE_LOCKED', (b.unequipSpiritCard('zhao', true) as { reason?: string }).reason ?? '');
    });

    return suite;
}
