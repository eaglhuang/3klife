/**
 * JournalStringsI18n.test.ts — 武將日誌／晨報 UI 字串與劇本文案進 i18n（JRN-07 / PROG-2-1442）
 *
 * 鎖住：H 章 9 個 UI key 與 G 章 5 句文案在 zh-TW／en／ja 都有值；佔位符編號與 zh-TW 一致；
 * zh-TW 的 G 章文案與核心模組的常數逐字相同（具名佔位符換成編號後比對），避免兩邊漂移。
 *
 * Unity 對照：Localization Table 的 Key 必須在每個 Locale 都有值，變數佔位符數量也要一致，否則切語系會缺字或漏參數。
 */
import { assert, TestSuite } from './TestRunner';
import { MORNING_REPORT_OPENING } from '../assets/scripts/core/systems/MorningReport';
import { DISPATCH_COMPLETE_TEMPLATE } from '../assets/scripts/core/systems/DispatchQuality';
import { OFFLINE_INTERACTION_OPENING } from '../assets/scripts/core/systems/OfflineInteractionEvents';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');

const LOCALES = ['zh-TW', 'en', 'ja'] as const;

const UI_KEYS = [
    'UI_JOURNAL_TITLE',
    'UI_MORNING_REPORT_TITLE',
    'UI_DISPATCH_BOARD_TITLE',
    'UI_OFFLINE_INTERACTION_TITLE',
    'UI_OFFLINE_BATTLE_SNAPSHOT',
    'UI_JOURNAL_EMPTY',
    'UI_MORNING_REPORT_EMPTY',
    'UI_DISPATCH_COMPLETE',
    'UI_DISPATCH_QUALITY',
] as const;

const STORY_KEYS = [
    'UI_JOURNAL_STORY_MORNING_OPENING',
    'UI_JOURNAL_STORY_DISPATCH_DONE',
    'UI_JOURNAL_STORY_OFFLINE_INTERACTION',
    'UI_JOURNAL_STORY_OFFLINE_SUPPORT',
    'UI_JOURNAL_STORY_LOG_REVIEW',
] as const;

function loadLocale(locale: string): Record<string, string> {
    return JSON.parse(fs.readFileSync(`assets/resources/i18n/${locale}.json`, 'utf8')) as Record<string, string>;
}

/** 字串中出現的佔位符編號（排序後去重） */
function placeholderIndices(text: string): string {
    const indices = [...text.matchAll(/\{(\d+)\}/g)].map((m) => m[1]);
    return Array.from(new Set(indices)).sort().join(',');
}

/** 把核心模組的具名佔位符換成 i18n 的編號佔位符 */
function toPositional(template: string, names: readonly string[]): string {
    return names.reduce((text, name, i) => text.split(`{${name}}`).join(`{${i}}`), template);
}

export function createJournalStringsI18nSuite(): TestSuite {
    const suite = new TestSuite('JournalStringsI18n (日誌字串多語 JRN-07 / PROG-2-1442)');

    suite.test('H 章 9 個 UI key 與 G 章 5 句文案在 zh-TW／en／ja 都有非空譯文', () => {
        for (const locale of LOCALES) {
            const dict = loadLocale(locale);
            for (const key of [...UI_KEYS, ...STORY_KEYS]) {
                assert.isTrue(typeof dict[key] === 'string' && dict[key].length > 0, `${locale} 缺 ${key}`);
            }
        }
    });

    suite.test('每個 key 的佔位符編號與 zh-TW 相同', () => {
        const base = loadLocale('zh-TW');
        for (const locale of ['en', 'ja'] as const) {
            const dict = loadLocale(locale);
            for (const key of [...UI_KEYS, ...STORY_KEYS]) {
                assert.equals(placeholderIndices(base[key]), placeholderIndices(dict[key]), `${locale} ${key}`);
            }
        }
    });

    suite.test('譯文不含規格表的外層「」記號（規格表用來標示引文，不是畫面字）', () => {
        for (const locale of LOCALES) {
            const dict = loadLocale(locale);
            for (const key of [...UI_KEYS, ...STORY_KEYS]) {
                assert.isFalse(dict[key].startsWith('「') && dict[key].endsWith('」'), `${locale} ${key} 帶有外層引號`);
            }
        }
    });
    suite.test('zh-TW 的 G 章文案與核心模組常數逐字相同', () => {
        const base = loadLocale('zh-TW');
        assert.equals(MORNING_REPORT_OPENING, base.UI_JOURNAL_STORY_MORNING_OPENING);
        assert.equals(
            toPositional(DISPATCH_COMPLETE_TEMPLATE, ['GeneralName', 'JobName', 'RewardText']),
            base.UI_JOURNAL_STORY_DISPATCH_DONE,
        );
        assert.equals(
            toPositional(OFFLINE_INTERACTION_OPENING, ['GeneralA', 'GeneralB']),
            base.UI_JOURNAL_STORY_OFFLINE_INTERACTION,
        );
    });

    return suite;
}
