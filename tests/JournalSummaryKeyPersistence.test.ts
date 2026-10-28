/**
 * JournalSummaryKeyPersistence.test.ts — 日誌劇本句查表欄位的存讀檔流程（PROG-2-1448）
 *
 * 真實走 GameSession.recordJournal 寫入帶 summaryKey 與參數的條目；存檔經 JSON 往返後，
 * key 與參數仍在、zh-TW 原句 summary 不變；舊格式條目（沒有 key）讀回後照常顯示。
 * 只驗存讀檔流程，不升存檔版號。
 *
 * Unity 對照：Localization 的 table key 寫進存檔，讀回後仍能依目前語系重新取字。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService, PLAYER_SAVE_KEY, PLAYER_SAVE_SCHEMA_VERSION } from '../assets/scripts/core/services/PlayerSaveService';
import { DISPATCH_COMPLETE_KEY, dispatchCompleteArgs, dispatchCompleteLine } from '../assets/scripts/core/systems/DispatchQuality';

const SEED = 1448;

function sessionOn(adapter: MemoryStorageAdapter): GameSession {
    const session = new GameSession(SEED);
    session.setSaveService(new PlayerSaveService(adapter));
    return session;
}

/** 經真實 JSON 往返，模擬寫入儲存後再讀回 */
async function roundTrip(adapter: MemoryStorageAdapter): Promise<void> {
    const raw = await adapter.get<unknown>(PLAYER_SAVE_KEY);
    await adapter.set(PLAYER_SAVE_KEY, JSON.parse(JSON.stringify(raw)));
}

function dispatchEntry(entryId: string, name: string) {
    return {
        entryId,
        timestamp: '2026-10-28T06:00:00',
        category: 'DISPATCH' as const,
        relatedGeneralUids: ['zhang-fei'],
        priority: 60,
        summary: dispatchCompleteLine(name, '巡邏', '糧草 +30'),
        summaryKey: DISPATCH_COMPLETE_KEY,
        summaryArgs: dispatchCompleteArgs(name, '巡邏', '糧草 +30'),
    };
}

export function createJournalSummaryKeyPersistenceSuite(): TestSuite {
    const suite = new TestSuite('JournalSummaryKeyPersistence (日誌劇本句查表存讀 PROG-2-1448)');

    suite.test('帶 key 與參數的日誌條目經存讀檔後，key、參數與 zh-TW summary 都保留', async () => {
        const adapter = new MemoryStorageAdapter();
        const source = sessionOn(adapter);
        source.startNewGame(SEED);
        source.recordJournal(dispatchEntry('DISPATCH_JOB-1', '張飛'));
        await source.save();

        const raw = await adapter.get<{ schemaVersion?: number }>(PLAYER_SAVE_KEY);
        assert.equals(PLAYER_SAVE_SCHEMA_VERSION, raw?.schemaVersion);
        await roundTrip(adapter);

        const restored = sessionOn(adapter);
        assert.isTrue(await restored.load());
        const [saved] = restored.queryJournal({ category: 'DISPATCH' });
        assert.equals(DISPATCH_COMPLETE_KEY, saved.summaryKey);
        assert.equals('張飛,巡邏,糧草 +30', saved.summaryArgs?.join(','));
        assert.equals(dispatchCompleteLine('張飛', '巡邏', '糧草 +30'), saved.summary);
    });

    suite.test('讀檔後再寫入其他條目，舊條目的 key 不會遺失或被改寫', async () => {
        const adapter = new MemoryStorageAdapter();
        const source = sessionOn(adapter);
        source.startNewGame(SEED);
        source.recordJournal(dispatchEntry('DISPATCH_JOB-1', '張飛'));
        await source.save();
        await roundTrip(adapter);

        const restored = sessionOn(adapter);
        assert.isTrue(await restored.load());
        restored.recordJournal(dispatchEntry('DISPATCH_JOB-2', '關羽'));
        await restored.save();
        await roundTrip(adapter);

        const again = sessionOn(adapter);
        assert.isTrue(await again.load());
        const entries = again.queryJournal({ category: 'DISPATCH' });
        assert.equals(2, entries.length);
        assert.equals('張飛', entries.find((e) => e.entryId === 'DISPATCH_JOB-1')?.summaryArgs?.[0]);
        assert.equals('關羽', entries.find((e) => e.entryId === 'DISPATCH_JOB-2')?.summaryArgs?.[0]);
    });

    suite.test('舊存檔條目沒有 key：讀回後照常有 summary，沒有多出查表欄位', async () => {
        const adapter = new MemoryStorageAdapter();
        const source = sessionOn(adapter);
        source.startNewGame(SEED);
        source.recordJournal({
            entryId: 'OLD-1',
            timestamp: '2026-10-28T06:00:00',
            category: 'SYSTEM',
            relatedGeneralUids: [],
            priority: 50,
            summary: '舊的一句日誌。',
        });
        await source.save();
        await roundTrip(adapter);

        const restored = sessionOn(adapter);
        assert.isTrue(await restored.load());
        const [old] = restored.queryJournal({ category: 'SYSTEM' });
        assert.equals('舊的一句日誌。', old.summary);
        assert.isFalse('summaryKey' in old);
    });

    return suite;
}
