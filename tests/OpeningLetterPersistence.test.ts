/**
 * OpeningLetterPersistence.test.ts — 開場信件已讀旗標隨存檔保留（PROG-2-1304）headless 測試
 *
 * 鎖住：關閉信件後已讀旗標寫進存檔，重開遊戲不會再自動開；未關閉時讀回仍是未讀；
 * 重複標記不會出錯。
 *
 * Unity 對照：像 PlayerPrefs 的旗標寫進存檔，關掉遊戲再開仍記得。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { shouldShowOpeningLetter } from '../assets/scripts/core/systems/OpeningLetter';

async function makeSession(adapter: MemoryStorageAdapter): Promise<GameSession> {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore([]));
    session.setSaveService(new PlayerSaveService(adapter));
    return session;
}

export function createOpeningLetterPersistenceSuite(): TestSuite {
    const suite = new TestSuite('OpeningLetterPersistence (開場信件已讀隨存檔 PROG-2-1304)');

    suite.test('關閉信件後已讀寫進存檔，重開不再自動開', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = await makeSession(adapter);
        assert.isTrue(shouldShowOpeningLetter(session.openingLetter));

        await session.markOpeningLetterSeen();
        assert.isFalse(shouldShowOpeningLetter(session.openingLetter));

        const restored = await makeSession(adapter);
        assert.isTrue(await restored.load());
        assert.isFalse(shouldShowOpeningLetter(restored.openingLetter));
    });

    suite.test('未關閉信件時存檔讀回仍是未讀', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = await makeSession(adapter);
        await session.save();

        const restored = await makeSession(adapter);
        assert.isTrue(await restored.load());
        assert.isTrue(shouldShowOpeningLetter(restored.openingLetter));
    });

    suite.test('重複標記已讀不會出錯，狀態維持已讀', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = await makeSession(adapter);
        await session.markOpeningLetterSeen();
        await session.markOpeningLetterSeen();
        assert.isFalse(shouldShowOpeningLetter(session.openingLetter));
    });

    return suite;
}
