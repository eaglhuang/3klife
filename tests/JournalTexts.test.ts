/**
 * JournalTexts.test.ts — 日誌與晨報畫面的文字查表（JRN-07 UI 接線 / PROG-2-1445）
 *
 * 鎖住：有譯文用譯文；查不到或譯文為空退回 zh-TW 預設；zh-TW.json 的同名 key 與預設一致；
 * 兩個控制器接上查表後，空狀態與標題走查表。
 *
 * Unity 對照：Localization 查表找不到就退回基礎語系字串，不會留下空白標籤。
 */
import { assert, TestSuite } from './TestRunner';
import { journalText, JOURNAL_TEXT_FALLBACK_ZH_TW, type JournalTextKey } from '../assets/scripts/ui/core/JournalTexts';
import { JournalHubController } from '../assets/scripts/ui/core/JournalHubController';
import { GeneralJournalController } from '../assets/scripts/ui/core/GeneralJournalController';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');

function zhTwDict(): Record<string, string> {
    return JSON.parse(fs.readFileSync('assets/resources/i18n/zh-TW.json', 'utf8')) as Record<string, string>;
}

export function createJournalTextsSuite(): TestSuite {
    const suite = new TestSuite('JournalTexts (日誌畫面文字查表 JRN-07 PROG-2-1445)');

    suite.test('沒有查表時用 zh-TW 預設', () => {
        assert.equals('武將日誌', journalText(undefined, 'UI_JOURNAL_TITLE'));
        assert.equals('派遣整備', journalText(undefined, 'UI_DISPATCH_BOARD_TITLE'));
    });

    suite.test('查表有譯文時用譯文', () => {
        const lookup = (key: string): string => (key === 'UI_JOURNAL_TITLE' ? 'General Journal' : key);
        assert.equals('General Journal', journalText(lookup, 'UI_JOURNAL_TITLE'));
    });

    suite.test('查表缺 key（回傳 key 本身）或譯文為空時退回 zh-TW 預設', () => {
        const missing = (key: string): string => key;
        const empty = (): string => '';
        assert.equals('晨報摘要', journalText(missing, 'UI_MORNING_REPORT_TITLE'));
        assert.equals('晨報摘要', journalText(empty, 'UI_MORNING_REPORT_TITLE'));
    });

    suite.test('zh-TW.json 的 H 章 key 與本模組的預設字面一致（避免兩邊漂移）', () => {
        const dict = zhTwDict();
        for (const key of Object.keys(JOURNAL_TEXT_FALLBACK_ZH_TW) as JournalTextKey[]) {
            assert.equals(JOURNAL_TEXT_FALLBACK_ZH_TW[key], dict[key], key);
        }
    });

    suite.test('JournalHubController 接上查表：標題與空狀態走查表', () => {
        const lookup = (key: string): string => `[${key}]`;
        const view = new JournalHubController({
            morningLines: () => [],
            dispatchRows: () => [],
            lookup,
        }).getFlowView();
        assert.equals('[UI_MORNING_REPORT_TITLE]', view.texts.morningTitle);
        assert.equals('[UI_MORNING_REPORT_EMPTY]', view.texts.morningEmptyLabel);
        assert.equals('[UI_DISPATCH_BOARD_TITLE]', view.texts.dispatchTitle);
    });

    suite.test('GeneralJournalController 接上查表：無武將時標題、有武將無日誌時空狀態走查表', () => {
        const lookup = (key: string): string => `[${key}]`;
        const empty = new GeneralJournalController({ generals: () => [], entries: () => [], lookup }).getFlowView();
        assert.equals('[UI_JOURNAL_TITLE]', empty.texts.journalTitle);

        const withGeneral = new GeneralJournalController({
            generals: () => [{ id: 'g1', name: '趙雲' }],
            entries: () => [],
            lookup,
        }).getFlowView();
        assert.equals('[UI_JOURNAL_EMPTY]', withGeneral.texts.journalEmptyLabel);
    });

    return suite;
}
