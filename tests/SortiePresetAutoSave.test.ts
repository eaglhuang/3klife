/**
 * 編制預設按下即存檔（PROG-2-0791）headless 測試
 *
 * 協調者 QA 提醒：「儲存預設」原本只改記憶體，要等下一次存檔才寫入。
 * 這裡確認寫入預設後，不呼叫 save()，新的會話就能讀回預設。
 */
import { TestSuite, assert } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';

export function createSortiePresetAutoSaveSuite(): TestSuite {
    const suite = new TestSuite('SortiePresetAutoSave (編制預設按下即存檔 PROG-2-0791)');

    suite.test('setSortiePresets 有存檔服務時立刻寫入，不需另外呼叫 save()', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = new GameSession(3);
        session.setRosterStore(new InMemoryRosterStore([]));
        session.setSaveService(new PlayerSaveService(adapter));
        await session.setSortiePresets({ 'zhuge-liang': { strategistUid: 'a', deputyUid: null } });

        const restored = new GameSession(3);
        restored.setRosterStore(new InMemoryRosterStore([]));
        restored.setSaveService(new PlayerSaveService(adapter));
        assert.isTrue(await restored.load());
        assert.isTrue('zhuge-liang' in restored.sortiePresets, '預設沒有等到下一次存檔才寫入');
    });

    suite.test('沒有存檔服務時只改記憶體，不會丟錯', async () => {
        const session = new GameSession(3);
        session.setRosterStore(new InMemoryRosterStore([]));
        await session.setSortiePresets({ 'zhuge-liang': { strategistUid: 'a', deputyUid: null } });
        assert.isTrue('zhuge-liang' in session.sortiePresets);
    });

    return suite;
}
