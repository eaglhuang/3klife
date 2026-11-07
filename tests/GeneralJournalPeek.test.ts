/**
 * GeneralJournalPeek — 人物頁日誌氣泡與完整生平實錄（HUM-06；PROG-2-1969）
 */
import { assert, TestSuite } from './TestRunner';
import type { JournalEntry, JournalState } from '../assets/scripts/core/systems/JournalLog';
import {
    journalPeekBubble, journalTimeLabel, lifeRecordRows,
} from '../assets/scripts/core/systems/GeneralJournalPeek';

function entry(id: string, timestamp: string, summary: string, over: Partial<JournalEntry> = {}): JournalEntry {
    return {
        entryId: id, timestamp, category: 'INTERACTION', relatedGeneralUids: ['G-ZF'],
        priority: 50, summary, visibility: 'VISIBLE', ...over,
    };
}

const STATE: JournalState = {
    entries: [
        entry('J1', '2026-04-08T09:00:00', '張飛於校場操練。'),
        entry('J2', '2026-04-10T22:00:00', '張飛因酒後與華雄切磋，助其武力提升了 1 點。'),
        entry('J3', '2026-04-11T05:00:00', '密報（不可見）', { visibility: 'HIDDEN' }),
        entry('J4', '2026-04-11T06:00:00', '關羽讀春秋。', { relatedGeneralUids: ['G-GY'] }),
    ],
};

export function createGeneralJournalPeekSuite(): TestSuite {
    const suite = new TestSuite('GeneralJournalPeek (日誌氣泡 HUM-06 PROG-2-1969)');

    suite.test('相對時間：今日、昨晚、N 日前、月/日', () => {
        const now = '2026-04-11T08:00:00';
        assert.equals('今日', journalTimeLabel('2026-04-11T01:00:00', now));
        assert.equals('昨晚', journalTimeLabel('2026-04-10T22:00:00', now));
        assert.equals('3 日前', journalTimeLabel('2026-04-08T09:00:00', now));
        assert.equals('3/30', journalTimeLabel('2026-03-30T09:00:00', now));
        assert.equals('', journalTimeLabel('bad', now));
    });

    suite.test('氣泡取最新一筆可見日誌，跳過隱藏條目與他將', () => {
        const bubble = journalPeekBubble(STATE, 'G-ZF', '2026-04-11T08:00:00');
        assert.equals('J2', bubble?.entryId);
        assert.equals('昨晚：張飛因酒後與華雄切磋，助其武力提升了 1 點。', bubble?.text);
        assert.equals(null, journalPeekBubble(STATE, 'G-NONE', '2026-04-11T08:00:00'));
    });

    suite.test('生平實錄依時間由舊到新，只含可見條目', () => {
        const rows = lifeRecordRows(STATE, 'G-ZF');
        assert.equals('J1,J2', rows.map((r) => r.entryId).join(','));
        assert.equals(4, STATE.entries.length);
    });

    return suite;
}
