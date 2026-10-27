/**
 * GameSessionOfflineInteraction.test.ts — 離線互動觸發接到讀檔時間（PROG-2-0991，JRN-04）
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';

/** 模擬讀檔：直接設定讀檔時記下的存檔時間（與 load() 寫入的欄位相同）。 */
function sessionSavedAt(savedAtMs: number | null): GameSession {
    const session = new GameSession(1);
    (session as unknown as { _loadedSavedAtMs: number | null })._loadedSavedAtMs = savedAtMs;
    return session;
}

const HOUR = 3_600_000;

export function createGameSessionOfflineInteractionSuite(): TestSuite {
    const suite = new TestSuite('GameSessionOfflineInteraction (PROG-2-0991 離線互動接線)');

    suite.test('沒有讀檔時不觸發', () => {
        assert.isFalse(new GameSession(1).offlineInteractionDue(Date.now(), { activeConflictTags: ['RIVAL'] }));
    });

    suite.test('離線不足 4 小時不觸發；滿 4 小時且有衝突標籤才觸發', () => {
        const savedAt = 1_000_000_000_000;
        const session = sessionSavedAt(savedAt);
        assert.isFalse(session.offlineInteractionDue(savedAt + 4 * HOUR - 1, { activeConflictTags: ['RIVAL'] }));
        assert.isTrue(session.offlineInteractionDue(savedAt + 4 * HOUR, { activeConflictTags: ['RIVAL'] }));
    });

    suite.test('沒有衝突標籤時即使離線很久也不觸發（目前呼叫端的預設）', () => {
        const savedAt = 1_000_000_000_000;
        assert.isFalse(sessionSavedAt(savedAt).offlineInteractionDue(savedAt + 10 * HOUR));
    });

    suite.test('未讀晨報達 3 則不觸發', () => {
        const savedAt = 1_000_000_000_000;
        const session = sessionSavedAt(savedAt);
        assert.isFalse(session.offlineInteractionDue(savedAt + 5 * HOUR, { activeConflictTags: ['RIVAL'], unreadMorningReport: 3 }));
    });

    suite.test('存檔時間晚於現在（時鐘倒退）不觸發', () => {
        const savedAt = 1_000_000_000_000;
        assert.isFalse(sessionSavedAt(savedAt).offlineInteractionDue(savedAt - HOUR, { activeConflictTags: ['RIVAL'] }));
    });

    return suite;
}
