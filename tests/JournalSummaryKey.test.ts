/**
 * JournalSummaryKey.test.ts — 日誌劇本句的查表 key 與參數（PROG-2-1448）純邏輯測試。
 *
 * 鎖住：合法的 summaryKey／summaryArgs 寫入與複製時保留；非法值整組省略、不漏進條目；
 * 晨報條目沿用 key；畫面文字有譯文用譯文、缺譯文或無 key 退回 zh-TW summary；
 * 派遣完成的參數順序與 zh-TW 模板一致。
 *
 * Unity 對照：Localization 的 LocalizedString，帶 table key 與 Smart Format 參數，缺譯文時顯示基礎語系原句。
 */
import { assert, TestSuite } from './TestRunner';
import { appendJournalEntry, createEmptyJournal, queryJournal, type JournalEntryInput } from '../assets/scripts/core/systems/JournalLog';
import {
    DISPATCH_COMPLETE_KEY, dispatchCompleteArgs, dispatchCompleteLine,
} from '../assets/scripts/core/systems/DispatchQuality';
import {
    EMPTY_MORNING_REPORT, normalizeMorningReportState, refreshMorningReport,
} from '../assets/scripts/core/systems/MorningReport';
import { journalSummaryText } from '../assets/scripts/ui/core/JournalTexts';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');

function entry(overrides: Partial<JournalEntryInput> = {}): JournalEntryInput {
    return {
        entryId: 'E-1',
        timestamp: '2026-10-28T06:00:00',
        category: 'DISPATCH',
        relatedGeneralUids: ['zhang-fei'],
        priority: 60,
        summary: '張飛已完成『巡邏』，帶回 糧草 +30。',
        ...overrides,
    };
}

export function createJournalSummaryKeySuite(): TestSuite {
    const suite = new TestSuite('JournalSummaryKey (日誌劇本句查表 PROG-2-1448)');

    suite.test('合法的 summaryKey 與參數寫入條目，複製後保留', () => {
        const result = appendJournalEntry(createEmptyJournal(), entry({
            summaryKey: DISPATCH_COMPLETE_KEY,
            summaryArgs: ['張飛', '巡邏', '糧草 +30'],
        }));
        assert.isTrue(result.ok);
        const saved = queryJournal(result.state)[0];
        assert.equals(DISPATCH_COMPLETE_KEY, saved.summaryKey);
        assert.equals('張飛,巡邏,糧草 +30', saved.summaryArgs?.join(','));
    });

    suite.test('沒有 summaryKey 的條目不多出欄位（舊條目行為不變）', () => {
        const result = appendJournalEntry(createEmptyJournal(), entry());
        const saved = queryJournal(result.state)[0];
        assert.isFalse('summaryKey' in saved);
        assert.isFalse('summaryArgs' in saved);
    });

    suite.test('summaryArgs 含非字串時，整組參數省略但保留 key；key 為空字串時兩者都省略', () => {
        const badArgs = appendJournalEntry(createEmptyJournal(), entry({
            summaryKey: DISPATCH_COMPLETE_KEY,
            summaryArgs: ['張飛', 3 as unknown as string],
        }));
        const saved = queryJournal(badArgs.state)[0];
        assert.equals(DISPATCH_COMPLETE_KEY, saved.summaryKey);
        assert.isFalse('summaryArgs' in saved);

        const emptyKey = appendJournalEntry(createEmptyJournal(), entry({ summaryKey: '', summaryArgs: ['x'] }));
        const plain = queryJournal(emptyKey.state)[0];
        assert.isFalse('summaryKey' in plain);
        assert.isFalse('summaryArgs' in plain);
    });

    suite.test('非法的 summaryKey 型別不會漏進條目（用 summary 照寫）', () => {
        const result = appendJournalEntry(createEmptyJournal(), entry({ summaryKey: 42 as unknown as string }));
        assert.isTrue(result.ok);
        assert.isFalse('summaryKey' in queryJournal(result.state)[0]);
    });

    suite.test('晨報條目沿用日誌的 key 與參數；讀檔正規化保留合法值、去掉非法值', () => {
        const withKey = appendJournalEntry(createEmptyJournal(), entry({
            summaryKey: DISPATCH_COMPLETE_KEY,
            summaryArgs: ['張飛', '巡邏', '糧草 +30'],
            priority: 90,
        }));
        const report = refreshMorningReport(EMPTY_MORNING_REPORT, withKey.state.entries, 9);
        assert.equals(DISPATCH_COMPLETE_KEY, report.items[0].summaryKey);
        assert.equals('張飛,巡邏,糧草 +30', report.items[0].summaryArgs?.join(','));

        const normalized = normalizeMorningReportState({
            journalMark: 1,
            items: [
                { entryId: 'A', summary: '甲', summaryKey: 'K', summaryArgs: ['a', 'b'] },
                { entryId: 'B', summary: '乙', summaryKey: 'K', summaryArgs: ['a', 1] },
                { entryId: 'C', summary: '丙', summaryKey: '' },
            ],
            read: false,
        });
        assert.equals('K', normalized.items[0].summaryKey);
        assert.equals('a,b', normalized.items[0].summaryArgs?.join(','));
        assert.isFalse('summaryArgs' in normalized.items[1]);
        assert.isFalse('summaryKey' in normalized.items[2]);
    });

    suite.test('journalSummaryText：有譯文用譯文並帶入參數', () => {
        const lookup = (key: string, ...args: string[]): string => `[${key}:${args.join('|')}]`;
        const text = journalSummaryText(lookup, { summary: 'zh', summaryKey: 'K', summaryArgs: ['a', 'b'] });
        assert.equals('[K:a|b]', text);
    });

    suite.test('journalSummaryText：沒有 key、沒有 lookup、或譯文為空／等於 key 時退回 zh-TW summary', () => {
        const summary = '張飛已完成『巡邏』';
        assert.equals(summary, journalSummaryText(undefined, { summary, summaryKey: 'K' }));
        assert.equals(summary, journalSummaryText((k) => k, { summary, summaryKey: 'K' }));
        assert.equals(summary, journalSummaryText(() => '', { summary, summaryKey: 'K' }));
        assert.equals(summary, journalSummaryText(() => 'x', { summary }));
    });

    suite.test('派遣完成的參數順序與 zh-TW 句型一致（{0} 武將、{1} 任務、{2} 獎勵）', () => {
        const args = dispatchCompleteArgs('張飛', '巡邏', '糧草 +30');
        const dict = JSON.parse(fs.readFileSync('assets/resources/i18n/zh-TW.json', 'utf8')) as Record<string, string>;
        const filled = dict[DISPATCH_COMPLETE_KEY].replace('{0}', args[0]).replace('{1}', args[1]).replace('{2}', args[2]);
        assert.equals(dispatchCompleteLine('張飛', '巡邏', '糧草 +30'), filled);
    });

    return suite;
}
