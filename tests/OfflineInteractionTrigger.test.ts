/**
 * OfflineInteractionTrigger.test.ts — 離線互動觸發條件與每登入窗去重（PROG-2-0984）
 */
import { assert, TestSuite } from './TestRunner';
import {
    canStartOfflineInteraction,
    offlineInteractionKey,
    OFFLINE_INTERACTION_LOCK,
    recordOfflineInteraction,
    shouldTriggerOfflineInteraction,
    OfflineContext,
} from '../assets/scripts/core/systems/OfflineInteractionTrigger';

function ctx(overrides: Partial<OfflineContext> = {}): OfflineContext {
    return { offlineHours: 4, unreadMorningReport: 0, activeConflictTags: ['RIVAL'], cooldowns: [], ...overrides };
}

export function createOfflineInteractionTriggerSuite(): TestSuite {
    const suite = new TestSuite('OfflineInteractionTrigger (PROG-2-0984 離線互動觸發)');

    suite.test('離線滿 4 小時、有衝突標籤、未讀晨報 <3 才觸發', () => {
        assert.isTrue(shouldTriggerOfflineInteraction(ctx()));
        assert.isFalse(shouldTriggerOfflineInteraction(ctx({ offlineHours: 3.9 })));
        assert.isTrue(shouldTriggerOfflineInteraction(ctx({ unreadMorningReport: 2 })));
        assert.isFalse(shouldTriggerOfflineInteraction(ctx({ unreadMorningReport: 3 })));
    });

    suite.test('沒有衝突標籤不觸發', () => {
        assert.isFalse(shouldTriggerOfflineInteraction(ctx({ activeConflictTags: [] })));
    });

    suite.test('離線互動鎖定中不觸發；其他冷卻不影響', () => {
        assert.isFalse(shouldTriggerOfflineInteraction(ctx({ cooldowns: [OFFLINE_INTERACTION_LOCK] })));
        assert.isTrue(shouldTriggerOfflineInteraction(ctx({ cooldowns: ['SOME_OTHER'] })));
    });

    suite.test('同一登入窗、同一對角色只能排一則；順序不同仍視為同一對', () => {
        const log: string[] = [];
        const key = offlineInteractionKey('W1', 'G010', 'G002');
        assert.equals(offlineInteractionKey('W1', 'G002', 'G010'), key);
        assert.isTrue(canStartOfflineInteraction(log, key));
        const after = recordOfflineInteraction(log, key);
        assert.isFalse(canStartOfflineInteraction(after, offlineInteractionKey('W1', 'G002', 'G010')));
        assert.equals(1, recordOfflineInteraction(after, key).length);
        assert.equals(0, log.length);
    });

    suite.test('不同登入窗或不同對象不互相擋', () => {
        const log = recordOfflineInteraction([], offlineInteractionKey('W1', 'G010', 'G002'));
        assert.isTrue(canStartOfflineInteraction(log, offlineInteractionKey('W2', 'G010', 'G002')));
        assert.isTrue(canStartOfflineInteraction(log, offlineInteractionKey('W1', 'G010', 'G003')));
    });

    return suite;
}
