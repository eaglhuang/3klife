/**
 * UltimateTexts.test.ts — 五階奧義操作區文案走語系表（PROG-2-0743）headless 測試
 *
 * 鎖住：zh-TW 預設表與 zh-TW.json 同步；{n} 參數替換；lookup 找不到時退回預設；
 * 注入的 lookup 會影響操作區與摘要的輸出。
 */
import { assert, TestSuite } from './TestRunner';
import { ULTIMATE_FALLBACK_ZH_TW, ultimateText } from '../assets/scripts/ui/core/UltimateTexts';
import { ultimateActionView, RAISE_LOCKED_TEXT } from '../assets/scripts/ui/core/UltimateActionView';
import { ultimateStageSummary } from '../assets/scripts/ui/core/UltimateStageSummary';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const READY = { fame: 100, incidents: 1, epicIncidents: 0 };
const NONE = { fame: 0, incidents: 0, epicIncidents: 0 };

export function createUltimateTextsSuite(): TestSuite {
    const suite = new TestSuite('UltimateTexts (五階奧義文案語系表 PROG-2-0743)');

    suite.test('zh-TW 預設表與 zh-TW.json 的 ui.general.ultimate.* 同步', () => {
        const file = path.join(__dirname, '..', 'assets', 'resources', 'i18n', 'zh-TW.json');
        const table = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, string>;
        for (const key of Object.keys(ULTIMATE_FALLBACK_ZH_TW)) {
            assert.equals(ULTIMATE_FALLBACK_ZH_TW[key], table[key], `語系表缺或不同：${key}`);
        }
    });

    suite.test('{n} 依序替換成參數', () => {
        assert.equals('點亮第 3 階', ultimateText((k) => k, 'ui.general.ultimate.awaken_label', 3));
    });

    suite.test('lookup 回傳 key 本身時退回 zh-TW 預設', () => {
        assert.equals('名聲不足', ultimateText((k) => k, 'ui.general.ultimate.next.fame_short'));
    });

    suite.test('注入的 lookup 有值時採用它，並替換參數', () => {
        const lookup = (key: string) => (key === 'ui.general.ultimate.awaken_label' ? 'Light stage {0}' : key);
        assert.equals('Light stage 2', ultimateText(lookup, 'ui.general.ultimate.awaken_label', 2));
    });

    suite.test('操作區文案由注入的 lookup 決定', () => {
        const en = (key: string) => ({ 'ui.general.ultimate.head': 'Stages {0}/{1} (cap {2})', 'ui.general.ultimate.summary': '{0}, {1}', 'ui.general.ultimate.next_ready': 'ready', 'ui.general.ultimate.awaken_label': 'Light stage {0}' } as Record<string, string>)[key] ?? key;
        const view = ultimateActionView({ stageCap: 3, stageCurrent: 1 }, READY, en);
        assert.equals('Stages 1/5 (cap 3), ready', view.summary);
        assert.equals('Light stage 2', view.awakenLabel);
    });

    suite.test('摘要由注入的 lookup 決定', () => {
        const en = (key: string) => ({ 'ui.general.ultimate.next.fame_short': 'not enough fame' } as Record<string, string>)[key] ?? key;
        const text = ultimateStageSummary({ stageCap: 3, stageCurrent: 1 }, NONE, en);
        assert.isTrue(text.endsWith('not enough fame'));
    });

    suite.test('沒有 lookup 時輸出與 zh-TW 原文一致', () => {
        const view = ultimateActionView({ stageCap: 3, stageCurrent: 1 }, NONE);
        assert.equals('血脈傳承奧義：已點亮 1 / 5 階（上限 3），名聲不足', view.summary);
        assert.equals(RAISE_LOCKED_TEXT, view.raiseLabel);
    });

    return suite;
}
