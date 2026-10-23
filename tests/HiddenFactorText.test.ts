/**
 * HiddenFactorText.test.ts — 武將血脈頁「隱藏因子」文案（REC-06 / PROG-2-0712）headless 測試
 *
 * 鎖住：只列出已覺醒的隱藏因子名稱、同名去重、沒有覺醒時顯示「尚未覺醒」、
 * 語系表查不到時退回 zh-TW 預設，且 zh-TW 語系檔與 fallback 同步。
 */
import { assert, TestSuite } from './TestRunner';
import {
    HIDDEN_FACTOR_FALLBACK_ZH_TW,
    HIDDEN_FACTOR_NAME_KEYS,
    hiddenFactorLine,
} from '../assets/scripts/ui/core/HiddenFactorText';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const ROOT = path.resolve(__dirname, '..');
const missingLookup = (key: string) => key;

export function createHiddenFactorTextSuite(): TestSuite {
    const suite = new TestSuite('HiddenFactorText (血脈頁隱藏因子文案 PROG-2-0712)');

    suite.test('沒有任何隱藏因子時顯示「隱藏因子：尚未覺醒」', () => {
        assert.equals('隱藏因子：尚未覺醒', hiddenFactorLine([], missingLookup));
        assert.equals('隱藏因子：尚未覺醒', hiddenFactorLine(undefined, missingLookup));
        assert.equals('隱藏因子：尚未覺醒', hiddenFactorLine([{ id: 'gene_blue' }], missingLookup));
    });

    suite.test('已覺醒的隱藏因子依序列出名稱，以頓號分隔', () => {
        const genes = [{ id: 'gene_blue' }, { id: 'gene_hidden_undefeated' }, { id: 'gene_hidden_iron_wall' }];
        assert.equals('隱藏因子：不敗、鐵壁', hiddenFactorLine(genes, missingLookup));
    });

    suite.test('同一個隱藏因子重複出現時只列一次', () => {
        const genes = [{ id: 'gene_hidden_killing_intent' }, { id: 'gene_hidden_killing_intent' }];
        assert.equals('隱藏因子：殺意', hiddenFactorLine(genes, missingLookup));
    });

    suite.test('語系表有值時採用語系表的名稱與前綴', () => {
        const lookup = (key: string) => `[${key}]`;
        const genes = [{ id: 'gene_hidden_killing_intent' }];
        assert.equals(
            '[ui.general.bloodline.hidden_factor][ui.general.bloodline.hidden_factor.killing_intent]',
            hiddenFactorLine(genes, lookup),
        );
    });

    suite.test('未知的 gene id 不會出現在文案裡', () => {
        assert.equals('隱藏因子：尚未覺醒', hiddenFactorLine([{ id: 'gene_unknown' }, {}], missingLookup));
    });

    suite.test('zh-TW 語系檔的隱藏因子 key 與 fallback 一致', () => {
        const zhTw = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/i18n/zh-TW.json'), 'utf8')) as Record<string, string>;
        for (const [key, text] of Object.entries(HIDDEN_FACTOR_FALLBACK_ZH_TW)) {
            assert.equals(text, zhTw[key]);
        }
    });

    suite.test('每個隱藏因子 id 都有對應的名稱 key，且 fallback 內有該 key', () => {
        for (const key of Object.values(HIDDEN_FACTOR_NAME_KEYS)) {
            assert.isTrue(key in HIDDEN_FACTOR_FALLBACK_ZH_TW);
        }
    });

    return suite;
}
