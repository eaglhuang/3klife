/**
 * ScorePointsWiring.test.ts — 點數（溢出轉化積分）入帳與存檔（MENT-07，PROG-2-0541）
 *
 * 入帳只收正整數；自動存檔後讀回保留；新遊戲歸零。
 * Unity 對照：像 Wallet 的 Add + 存檔往返測試，驗證欄位序列化與重置。
 */
import { TestSuite, assert } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService, normalizeScorePoints } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';

function sessionWith(adapter: MemoryStorageAdapter): GameSession {
    const session = new GameSession(3);
    session.setRosterStore(new InMemoryRosterStore([]));
    session.setSaveService(new PlayerSaveService(adapter));
    return session;
}

export function createScorePointsWiringSuite(): TestSuite {
    const suite = new TestSuite('ScorePointsWiring (點數入帳與存檔 MENT-07)');

    suite.test('入帳正整數累加；0、負數與小數不入帳', async () => {
        const session = sessionWith(new MemoryStorageAdapter());
        assert.equals(500, await session.grantScorePoints(500));
        assert.equals(500, await session.grantScorePoints(0));
        assert.equals(500, await session.grantScorePoints(-20));
        assert.equals(500, await session.grantScorePoints(1.5));
        assert.equals(600, await session.grantScorePoints(100));
    });

    suite.test('入帳後自動存檔：點數讀回保留', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = sessionWith(adapter);
        await session.grantScorePoints(120);
        const restored = sessionWith(adapter);
        assert.isTrue(await restored.load());
        assert.equals(120, restored.scorePoints);
    });

    suite.test('舊檔沒有點數欄位（undefined）、負數或小數讀回為 0', () => {
        assert.equals(0, normalizeScorePoints(undefined));
        assert.equals(0, normalizeScorePoints(-1));
        assert.equals(0, normalizeScorePoints(2.5));
        assert.equals(7, normalizeScorePoints(7));
    });

    return suite;
}
