/**
 * NpcDialogueHook.test.ts — RAG 對話 hook 與未命中情境收集（NPC-08，PROG-2-1255）headless 測試
 *
 * 鎖住：對話模式依 §F-2 選擇（失敗優先、日誌反應、連網＋主動才 RAG）、
 * 同一情境去重保留最新、超過上限丟最舊、sink 成功才清空、未連網或佔位 sink 保留清單、
 * 不修改輸入清單。
 */
import { assert, TestSuite } from './TestRunner';
import {
    UNKNOWN_EVENT_QUEUE_LIMIT,
    flushUnknownEvents,
    notConnectedUnknownSink,
    pickDialogueMode,
    recordUnknownEvent,
    type UnknownEvent,
} from '../assets/scripts/core/systems/NpcDialogueHook';

function eventOf(generalId: string, contextKey: string, capturedAt = '2026-10-27T10:00:00'): UnknownEvent {
    return { generalId, contextKey, capturedAt };
}

export function createNpcDialogueHookSuite(): TestSuite {
    const suite = new TestSuite('NpcDialogueHook (RAG 對話 hook 與未命中收集 NPC-08 PROG-2-1255)');

    suite.test('對話模式依 §F-2 選擇：失敗優先、日誌反應、連網且主動才 RAG', () => {
        const base = { source: 'interaction' as const, online: true, playerInitiated: true, failed: false };
        assert.equals('RAG_REWRITE', pickDialogueMode(base));
        assert.equals('FALLBACK_LINE', pickDialogueMode({ ...base, failed: true }));
        assert.equals('JOURNAL_REACTION', pickDialogueMode({ ...base, source: 'journal' }));
        assert.equals('STATIC_TEMPLATE', pickDialogueMode({ ...base, online: false }));
        assert.equals('STATIC_TEMPLATE', pickDialogueMode({ ...base, playerInitiated: false }));
    });

    suite.test('同一武將與情境只留一筆，保留最新的時間', () => {
        let pending: UnknownEvent[] = [];
        pending = recordUnknownEvent(pending, eventOf('zhang-fei', 'changban-bridge', 'T1'));
        pending = recordUnknownEvent(pending, eventOf('zhang-fei', 'changban-bridge', 'T2'));
        assert.equals(1, pending.length);
        assert.equals('T2', pending[0].capturedAt);
    });

    suite.test('超過上限丟棄最舊的，保留最新的', () => {
        let pending: UnknownEvent[] = [];
        for (let i = 0; i < UNKNOWN_EVENT_QUEUE_LIMIT + 2; i++) {
            pending = recordUnknownEvent(pending, eventOf('g', `ctx-${i}`));
        }
        assert.equals(UNKNOWN_EVENT_QUEUE_LIMIT, pending.length);
        assert.equals('ctx-2', pending[0].contextKey);
        assert.equals(`ctx-${UNKNOWN_EVENT_QUEUE_LIMIT + 1}`, pending[pending.length - 1].contextKey);
    });

    suite.test('記錄不修改輸入清單', () => {
        const pending = [eventOf('a', 'x')];
        recordUnknownEvent(pending, eventOf('b', 'y'));
        assert.equals(1, pending.length);
    });

    suite.test('未連網或佔位 sink 時保留清單；sink 回報成功才清空', () => {
        const pending = [eventOf('a', 'x')];
        assert.equals(1, flushUnknownEvents(pending, false, () => true).length);
        assert.equals(1, flushUnknownEvents(pending, true).length);
        assert.equals(false, notConnectedUnknownSink(pending));
        assert.equals(0, flushUnknownEvents(pending, true, () => true).length);
    });

    return suite;
}
