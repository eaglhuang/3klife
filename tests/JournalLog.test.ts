/**
 * JournalLog.test.ts — 武將日誌主檔寫入與查詢（JRN-01 / PROG-2-0972）
 */
import { assert, TestSuite } from './TestRunner';
import {
    appendJournalEntry,
    createEmptyJournal,
    findJournalEntriesByActionSeq,
    JournalEntryInput,
    JournalState,
    queryJournal,
} from '../assets/scripts/core/systems/JournalLog';

function entry(overrides: Partial<JournalEntryInput> = {}): JournalEntryInput {
    return {
        entryId: 'JR_0001',
        timestamp: '2026-04-11T06:00:00',
        category: 'DISPATCH',
        relatedGeneralUids: ['G021'],
        priority: 80,
        summary: '趙雲完成邊境巡查。',
        sourceActionSeqRange: [401, 404],
        snapshotRef: 'OBS_0007',
        ...overrides,
    };
}

function seeded(): JournalState {
    let state = createEmptyJournal();
    state = appendJournalEntry(state, entry()).state;
    state = appendJournalEntry(state, entry({ entryId: 'JR_0002', timestamp: '2026-04-12T06:00:00', category: 'BATTLE', relatedGeneralUids: ['G021', 'G045'], sourceActionSeqRange: [500, 510] })).state;
    state = appendJournalEntry(state, entry({ entryId: 'JR_0003', timestamp: '2026-04-11T12:00:00', category: 'INTERACTION', relatedGeneralUids: ['G045'], sourceActionSeqRange: undefined })).state;
    return state;
}

export function createJournalLogSuite(): TestSuite {
    const suite = new TestSuite('JournalLog (JRN-01 武將日誌主檔)');

    suite.test('寫入一筆合法條目成功，預設可見', () => {
        const result = appendJournalEntry(createEmptyJournal(), entry());
        assert.isTrue(result.ok);
        assert.equals(1, result.state.entries.length);
        assert.equals('VISIBLE', result.state.entries[0].visibility);
    });

    suite.test('ID 重複、類別不合法、優先度超界、摘要空白都拒絕，狀態不變', () => {
        const base = seeded();
        const cases: Array<[Partial<JournalEntryInput>, string]> = [
            [{ entryId: 'JR_0001' }, 'duplicate-entry-id'],
            [{ entryId: 'JR_9999', category: 'MYSTERY' as never }, 'invalid-category'],
            [{ entryId: 'JR_9999', priority: 101 }, 'invalid-priority'],
            [{ entryId: 'JR_9999', summary: '   ' }, 'empty-summary'],
        ];
        for (const [overrides, reason] of cases) {
            const result = appendJournalEntry(base, entry(overrides));
            assert.isFalse(result.ok);
            assert.equals(reason, result.reason!);
            assert.equals(3, result.state.entries.length);
        }
    });

    suite.test('Action 序號範圍倒置或非整數時拒絕', () => {
        const reversed = appendJournalEntry(createEmptyJournal(), entry({ sourceActionSeqRange: [10, 5] }));
        assert.equals('invalid-action-range', reversed.reason!);
        const fractional = appendJournalEntry(createEmptyJournal(), entry({ sourceActionSeqRange: [1.5, 3] }));
        assert.equals('invalid-action-range', fractional.reason!);
    });

    suite.test('時間戳格式錯誤時拒絕', () => {
        const result = appendJournalEntry(createEmptyJournal(), entry({ timestamp: '昨天' }));
        assert.equals('invalid-timestamp', result.reason!);
    });

    suite.test('依武將查詢：只回傳含該武將的條目', () => {
        const result = queryJournal(seeded(), { generalUid: 'G045' });
        assert.equals(2, result.length);
        assert.isTrue(result.every(e => e.relatedGeneralUids.includes('G045')));
    });

    suite.test('依類別查詢：只回傳該類別', () => {
        const result = queryJournal(seeded(), { category: 'BATTLE' });
        assert.equals(1, result.length);
        assert.equals('JR_0002', result[0].entryId);
    });

    suite.test('查詢結果依時間新到舊排序', () => {
        const ids = queryJournal(seeded()).map(e => e.entryId);
        assert.equals('JR_0002', ids[0]);
        assert.equals('JR_0003', ids[1]);
        assert.equals('JR_0001', ids[2]);
    });

    suite.test('依 Action 序號回扣：範圍涵蓋的條目會被找到，沒有範圍的條目不會', () => {
        const hit = findJournalEntriesByActionSeq(seeded(), 402);
        assert.equals(1, hit.length);
        assert.equals('JR_0001', hit[0].entryId);
        assert.equals(0, findJournalEntriesByActionSeq(seeded(), 999).length);
    });

    suite.test('寫入與查詢都不改輸入狀態', () => {
        const base = seeded();
        appendJournalEntry(base, entry({ entryId: 'JR_0010' }));
        queryJournal(base, { generalUid: 'G021' }).forEach(e => e.relatedGeneralUids.push('X'));
        assert.equals(3, base.entries.length);
        assert.equals(1, base.entries[0].relatedGeneralUids.length);
    });

    return suite;
}
