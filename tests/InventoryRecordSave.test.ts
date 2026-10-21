/**
 * InventoryRecordSave.test.ts — 統一物件庫列的存檔往返與舊檔重建（DS-08 儲存段，PROG-2-1021）
 *
 * 鎖住：虎符裝備、卸下後的持有狀態經存檔讀回仍正確；舊存檔只有 tallyCards／tallyHoldings 時，
 * 讀檔會由虎符重建列，玩家看到的虎符視圖不變。
 *
 * Unity 對照：像背包存檔格式升級：舊存檔沒有新表就從舊資料算出來，不會讓玩家的道具消失。
 */
import { TestSuite, assert } from './TestRunner';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PLAYER_SAVE_KEY, PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { createInitialGameTimeState } from '../assets/scripts/core/systems/GameClock';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import type { TigerTallyCard } from '../assets/scripts/core/models/TigerTallyCard';

function general(id: string): GeneralConfig {
    return { id, name: id, status: 'alive' } as unknown as GeneralConfig;
}

function card(uid: string): TigerTallyCard {
    return { uid, templateId: 'tpl-' + uid, sourceGeneralUid: 'src', quality: 'R', score: 0, source: 'death', producedSeason: 1 };
}

function createSession(adapter: MemoryStorageAdapter): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore([general('g-a')]));
    session.setSaveService(new PlayerSaveService(adapter));
    return session;
}

export function createInventoryRecordSaveSuite(): TestSuite {
    const suite = new TestSuite('InventoryRecordSave (統一物件庫列存檔 DS-08)');

    suite.test('登記、裝備後存檔、換新 Session 讀檔：虎符視圖的持有者還在', async () => {
        const adapter = new MemoryStorageAdapter();
        const a = createSession(adapter);
        await a.registerTallyCards([card('t1')]);
        const equipped = await a.equipTally('t1', 'g-a');
        assert.isTrue(equipped?.ok === true);
        assert.equals('g-a', a.inventoryViews.talismans.t1?.Equipped_General_UID ?? '');
        await a.save();

        const b = createSession(adapter);
        assert.isTrue(await b.load());
        assert.equals('g-a', b.inventoryViews.talismans.t1?.Equipped_General_UID ?? '');
        assert.equals('DeathSettlement', b.inventoryViews.talismans.t1?.Source_Type ?? '');
    });

    suite.test('卸下虎符後存檔：讀回的視圖顯示未持有', async () => {
        const adapter = new MemoryStorageAdapter();
        const a = createSession(adapter);
        await a.registerTallyCards([card('t1')]);
        await a.equipTally('t1', 'g-a');
        await a.unequipTally('t1');
        await a.save();

        const b = createSession(adapter);
        assert.isTrue(await b.load());
        assert.equals(null, b.inventoryViews.talismans.t1?.Equipped_General_UID ?? null);
    });

    suite.test('舊存檔沒有 inventoryRecords：讀檔時由虎符卡與持有表重建，視圖不變', async () => {
        const adapter = new MemoryStorageAdapter();
        await adapter.set(PLAYER_SAVE_KEY, {
            schemaVersion: 1,
            savedAt: '2026-10-01T00:00:00.000Z',
            gameTime: createInitialGameTimeState(),
            roster: [],
            tallyCards: { t1: card('t1') },
            tallyHoldings: { t1: 'g-a' },
        });
        const session = createSession(adapter);
        assert.isTrue(await session.load());
        assert.equals(1, Object.keys(session.inventoryViews.talismans).length);
        assert.equals('g-a', session.inventoryViews.talismans.t1?.Equipped_General_UID ?? '');
    });

    suite.test('沒有任何虎符時存檔：視圖為空，讀回也為空', async () => {
        const adapter = new MemoryStorageAdapter();
        const a = createSession(adapter);
        await a.save();
        const b = createSession(adapter);
        assert.isTrue(await b.load());
        assert.equals(0, Object.keys(b.inventoryViews.talismans).length);
        assert.equals(0, b.inventoryViews.skipped.length);
    });

    return suite;
}
