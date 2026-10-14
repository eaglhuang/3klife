/**
 * 壽命劇本字串的多語系一致性（LIFE-13 草稿翻譯，PROG-2-0431）
 *
 * 覆蓋：zh-CN / en / ja 的 life.* key 與 zh-TW 完全一致；每個 key 的佔位符編號與 zh-TW 相同；
 * 譯文不為空。譯文本身是草稿，待語系審閱，這裡只鎖結構。
 */
import { assert, TestSuite } from './TestRunner';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');

const LOCALES = ['zh-CN', 'en', 'ja'] as const;

function loadLocale(locale: string): Record<string, string> {
    return JSON.parse(fs.readFileSync(`assets/resources/i18n/${locale}.json`, 'utf8')) as Record<string, string>;
}

/** 字串中出現的佔位符編號（排序後去重） */
function placeholderIndices(template: string): string {
    const indices = [...template.matchAll(/\{(\d+)\}/g)].map((m) => m[1]);
    return [...new Set(indices)].sort().join(',');
}

export function createLifeCopyLocalesSuite(): TestSuite {
    const suite = new TestSuite('LifeCopyLocales (壽命劇本多語系一致性 LIFE-13)');

    suite.test('zh-CN / en / ja 的 life.* key 與 zh-TW 完全一致', () => {
        const base = Object.keys(loadLocale('zh-TW')).filter((k) => k.startsWith('life.')).sort();
        for (const locale of LOCALES) {
            const keys = Object.keys(loadLocale(locale)).filter((k) => k.startsWith('life.')).sort();
            assert.equals(base.join('|'), keys.join('|'), `${locale} 的 life.* key 與 zh-TW 不一致`);
        }
    });

    suite.test('每個 life.* 譯文的佔位符編號與 zh-TW 相同', () => {
        const base = loadLocale('zh-TW');
        for (const locale of LOCALES) {
            const data = loadLocale(locale);
            for (const key of Object.keys(base).filter((k) => k.startsWith('life.'))) {
                assert.equals(placeholderIndices(base[key]), placeholderIndices(data[key] ?? ''), `${locale} ${key} 佔位符不符`);
            }
        }
    });

    suite.test('譯文不為空', () => {
        for (const locale of LOCALES) {
            const data = loadLocale(locale);
            for (const key of Object.keys(data).filter((k) => k.startsWith('life.'))) {
                assert.isTrue(typeof data[key] === 'string' && data[key].trim().length > 0, `${locale} ${key} 為空`);
            }
        }
    });

    return suite;
}
