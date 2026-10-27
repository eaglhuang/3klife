/**
 * UltimateCodexTexts.test.ts — 奧義圖鑑列表文字（ULT-16 畫面層，PROG-2-1251）headless 測試
 *
 * 鎖住：空圖鑑顯示提示、列數上限與「另有 N 項」、列文字含武將、奧義與等級、
 * 四語 JSON 都有 ui.ultimate_codex.* key 且 zh-TW 與內建預設一致。
 */
import { assert, TestSuite } from './TestRunner';
import {
    buildUltimateCodexView,
    fallbackUltimateCodexText,
    ULTIMATE_CODEX_MAX_ROWS,
    ULTIMATE_CODEX_TEXT_FALLBACK_ZH_TW,
} from '../assets/scripts/ui/core/UltimateCodexTexts';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const ROOT = path.resolve(__dirname, '..');
const readLocale = (lang: string): Record<string, string> =>
    JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/i18n', `${lang}.json`), 'utf8')) as Record<string, string>;
const row = (i: number) => ({ generalId: `gen-${i}`, ultimateId: `ult-${i}`, slot: 1, level: 2 });

export function createUltimateCodexTextsSuite(): TestSuite {
    const suite = new TestSuite('UltimateCodexTexts (奧義圖鑑列表文字 ULT-16 PROG-2-1251)');

    suite.test('空圖鑑顯示提示且沒有「另有」', () => {
        const view = buildUltimateCodexView([]);
        assert.equals(1, view.lines.length);
        assert.equals(ULTIMATE_CODEX_TEXT_FALLBACK_ZH_TW['ui.ultimate_codex.empty'], view.lines[0]);
        assert.equals(null, view.more);
    });

    suite.test('列文字含武將、奧義與等級', () => {
        const view = buildUltimateCodexView([{ generalId: 'zhao-yun', ultimateId: 'longdan', slot: 1, level: 3 }]);
        assert.equals('zhao-yun・longdan　Lv3', view.lines[0]);
        assert.equals('已解鎖奧義 1 項', view.count);
    });

    suite.test('超過上限時只列前幾列並寫出剩餘數量', () => {
        const rows = Array.from({ length: ULTIMATE_CODEX_MAX_ROWS + 3 }, (_, i) => row(i));
        const view = buildUltimateCodexView(rows);
        assert.equals(ULTIMATE_CODEX_MAX_ROWS, view.lines.length);
        assert.equals('另有 3 項未列出', view.more ?? '');
    });

    suite.test('缺 key 時退回 zh-TW 預設', () => {
        assert.equals('奧義圖鑑', fallbackUltimateCodexText('ui.ultimate_codex.title'));
        assert.equals('no.such.key', fallbackUltimateCodexText('no.such.key'));
    });

    suite.test('四個語系都有 ui.ultimate_codex.* key，zh-TW 與內建預設一致', () => {
        const keys = Object.keys(ULTIMATE_CODEX_TEXT_FALLBACK_ZH_TW);
        for (const lang of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const locale = readLocale(lang);
            assert.isTrue(keys.every((k) => typeof locale[k] === 'string' && locale[k].length > 0));
        }
        const zh = readLocale('zh-TW');
        assert.isTrue(keys.every((k) => zh[k] === ULTIMATE_CODEX_TEXT_FALLBACK_ZH_TW[k]));
    });

    return suite;
}
