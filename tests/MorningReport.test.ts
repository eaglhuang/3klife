/**
 * PROG-2-1174：晨報摘要生成（JRN-02）與登入接線
 */

import { assert, TestSuite } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import type { PlayerSaveSnapshot } from '../assets/scripts/core/services/PlayerSaveService';
import type { JournalCategory, JournalEntry } from '../assets/scripts/core/systems/JournalLog';
import {
    buildMorningReport, EMPTY_MORNING_REPORT, MORNING_REPORT_OPENING, morningReportLines, morningReportSlotCount,
    normalizeMorningReportState, refreshMorningReport, unreadMorningReportCount,
} from '../assets/scripts/core/systems/MorningReport';

function entry(entryId: string, category: JournalCategory, priority: number, extra: Partial<JournalEntry> = {}): JournalEntry {
    return {
        entryId, category, priority,
        timestamp: '0190-01-01T00:00:00',
        relatedGeneralUids: [],
        summary: `${entryId} 摘要`,
        visibility: 'VISIBLE',
        ...extra,
    };
}

export function createMorningReportSuite(): TestSuite {
    const suite = new TestSuite('MorningReport (PROG-2-1174 晨報摘要)');

    suite.test('名額：官職 4 階以上 3 則，否則 2 則', () => {
        assert.equals(2, morningReportSlotCount(1));
        assert.equals(2, morningReportSlotCount(3));
        assert.equals(3, morningReportSlotCount(4));
    });

    suite.test('挑選：去掉 HIDDEN、同類別只留最高、依 Priority 排序', () => {
        const picked = buildMorningReport([
            entry('A', 'BATTLE', 50),
            entry('B', 'BATTLE', 90),
            entry('C', 'DISPATCH', 70),
            entry('D', 'GROWTH', 99, { visibility: 'HIDDEN' }),
            entry('E', 'SYSTEM', 60),
        ], 5);
        assert.equals('B,C,E', picked.map((e) => e.entryId).join(','));
        assert.equals('B,C', buildMorningReport([entry('B', 'BATTLE', 90), entry('C', 'DISPATCH', 70), entry('E', 'SYSTEM', 60)], 1).map((e) => e.entryId).join(','));
    });

    suite.test('同分取較新的條目', () => {
        const picked = buildMorningReport([
            entry('OLD', 'BATTLE', 80, { timestamp: '0190-01-01T00:00:00' }),
            entry('NEW', 'BATTLE', 80, { timestamp: '0190-02-01T00:00:00' }),
        ], 1);
        assert.equals('NEW', picked[0].entryId);
    });

    suite.test('時間窗：只看標記之後新增的條目，沒有新條目時視為已讀', () => {
        const first = refreshMorningReport(EMPTY_MORNING_REPORT, [entry('A', 'BATTLE', 50)], 1);
        assert.equals(1, first.journalMark);
        assert.equals(1, unreadMorningReportCount(first));
        assert.equals(`${MORNING_REPORT_OPENING}|A 摘要`, morningReportLines(first).join('|'));

        const second = refreshMorningReport(first, [entry('A', 'BATTLE', 50), entry('B', 'SYSTEM', 40)], 1);
        assert.equals('B', second.items.map((i) => i.entryId).join(','));

        const idle = refreshMorningReport(second, [entry('A', 'BATTLE', 50), entry('B', 'SYSTEM', 40)], 1);
        assert.isTrue(idle.read);
        assert.equals(0, morningReportLines(idle).length);
    });

    suite.test('normalize：壞資料回到空狀態，未讀標記保留', () => {
        assert.equals(JSON.stringify({ journalMark: 0, items: [], read: true }), JSON.stringify(normalizeMorningReportState(null)));
        const restored = normalizeMorningReportState({ journalMark: 3, items: [{ entryId: 'A', summary: 's' }, { bad: 1 }], read: false });
        assert.equals(3, restored.journalMark);
        assert.equals(1, restored.items.length);
        assert.isTrue(!restored.read);
    });

    suite.test('GameSession：登入產生晨報、標記已讀、未讀數供離線互動判定', () => {
        const session = new GameSession(1);
        session.recordJournal({ entryId: 'J1', timestamp: '0190-01-01T00:00:00', category: 'DISPATCH', relatedGeneralUids: [], priority: 80, summary: '趙雲完成邊境巡查。' });
        session.recordLoginAt(Date.parse('2026-10-27T10:00:00+08:00'));
        assert.equals(`${MORNING_REPORT_OPENING}|趙雲完成邊境巡查。`, session.morningReportLines.join('|'));
        session.markMorningReportRead();
        assert.equals(0, session.morningReportLines.length);

        session.recordLoginAt(Date.parse('2026-10-27T12:00:00+08:00'));
        assert.equals(0, session.morningReportLines.length);
    });

    suite.test('GameSession：跨存讀檔保留晨報；新局不寫入', () => {
        const session = new GameSession(1);
        session.recordJournal({ entryId: 'J1', timestamp: '0190-01-01T00:00:00', category: 'BATTLE', relatedGeneralUids: [], priority: 60, summary: '一戰告捷。' });
        session.recordLoginAt(Date.parse('2026-10-27T10:00:00+08:00'));
        const snapshot = JSON.parse(JSON.stringify(session.createSnapshot())) as PlayerSaveSnapshot;
        const restored = new GameSession(2);
        restored.restoreLifespanState(snapshot);
        assert.equals(JSON.stringify(session.morningReport), JSON.stringify(restored.morningReport));
        assert.isTrue(new GameSession(3).createSnapshot().morningReport === undefined);
    });

    return suite;
}
