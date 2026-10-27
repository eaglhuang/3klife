/**
 * RelationEventLedgerSave.test.ts — 關係事件帳本隨存檔保存（KIN-08 / PROG-2-1412）
 *
 * Unity 對照：像把 HashSet 序列化進 PlayerPrefs 存檔；讀檔後同一場景不會再播一次事件。
 * 只驗存讀檔流程（真實 JSON 往返），不升存檔版號。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService, PLAYER_SAVE_KEY, PLAYER_SAVE_SCHEMA_VERSION } from '../assets/scripts/core/services/PlayerSaveService';
import { HistoricalPairTable } from '../assets/scripts/core/systems/HistoricalPairs';
import { relationEventsForBreeding } from '../assets/scripts/core/systems/RelationEvents';

function tableOf(): HistoricalPairTable {
    const base = { epBonus: 0, extraEffects: {} };
    return HistoricalPairTable.load({
        relations: [
            { ...base, relationId: 'T_RIVAL', templateA: 'zhuge-liang', templateB: 'sima-yi', type: 'RIVAL', loreKey: 'L3' },
        ],
    }).table;
}

function sessionOn(adapter: MemoryStorageAdapter): GameSession {
    const session = new GameSession(1412);
    session.setSaveService(new PlayerSaveService(adapter));
    return session;
}

/** 經真實 JSON 往返，模擬寫入儲存後再讀回 */
async function roundTrip(adapter: MemoryStorageAdapter): Promise<void> {
    const raw = await adapter.get<unknown>(PLAYER_SAVE_KEY);
    await adapter.set(PLAYER_SAVE_KEY, JSON.parse(JSON.stringify(raw)));
}

export function createRelationEventLedgerSaveSuite(): TestSuite {
    const suite = new TestSuite('RelationEventLedgerSave (PROG-2-1412)');

    suite.test('同季已播的關係事件存檔後重開，同季不再重播，換季仍會播', async () => {
        const adapter = new MemoryStorageAdapter();
        const source = sessionOn(adapter);
        assert.equals(1, relationEventsForBreeding(tableOf(), source.relationEvents, 'season-3', 'zhuge-liang', 'sima-yi').length);
        await source.save();
        await roundTrip(adapter);

        const restored = sessionOn(adapter);
        assert.isTrue(await restored.load());
        assert.equals(0, relationEventsForBreeding(tableOf(), restored.relationEvents, 'season-3', 'sima-yi', 'zhuge-liang').length);
        assert.equals(1, relationEventsForBreeding(tableOf(), restored.relationEvents, 'season-4', 'zhuge-liang', 'sima-yi').length);
    });

    suite.test('沒有已播事件的存檔不寫入欄位，讀回帳本為空', async () => {
        const adapter = new MemoryStorageAdapter();
        await sessionOn(adapter).save();
        const raw = await adapter.get<Record<string, unknown>>(PLAYER_SAVE_KEY);
        assert.isTrue(raw !== null && !('relationEventKeys' in raw!));

        const restored = sessionOn(adapter);
        assert.isTrue(await restored.load());
        assert.equals(0, restored.relationEvents.size());
    });

    suite.test('舊檔缺欄位讀回為空帳本；壞資料只保留合法字串並去重', async () => {
        const adapter = new MemoryStorageAdapter();
        const snapshot = sessionOn(adapter).createSnapshot();
        delete snapshot.relationEventKeys;
        await adapter.set(PLAYER_SAVE_KEY, snapshot);
        const legacy = sessionOn(adapter);
        legacy.relationEvents.tryFire('season-1', { eventId: 'rival', pairKey: 'a|b' });
        assert.isTrue(await legacy.load());
        assert.equals(0, legacy.relationEvents.size());

        const dirty = sessionOn(adapter).createSnapshot();
        dirty.relationEventKeys = ['season-3#rival#a|b', '', 42 as unknown as string, 'season-3#rival#a|b'] as string[];
        await adapter.set(PLAYER_SAVE_KEY, dirty);
        const restored = sessionOn(adapter);
        assert.isTrue(await restored.load());
        assert.equals(JSON.stringify(['season-3#rival#a|b']), JSON.stringify(restored.relationEvents.snapshot()));
    });

    suite.test('存檔版號不升：仍是現行 schema 版本', async () => {
        const adapter = new MemoryStorageAdapter();
        const source = sessionOn(adapter);
        source.relationEvents.tryFire('season-3', { eventId: 'rival', pairKey: 'a|b' });
        await source.save();
        const raw = await adapter.get<{ schemaVersion?: number }>(PLAYER_SAVE_KEY);
        assert.equals(PLAYER_SAVE_SCHEMA_VERSION, raw?.schemaVersion);
    });

    return suite;
}
