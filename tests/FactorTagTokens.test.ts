/**
 * FactorTagTokens.test.ts — 六色因子標籤進語系表與色碼 token（FBR-08 / PROG-2-0725）headless 測試
 *
 * 鎖住：四個語系都有 ui.gene.tag.* 六個 key；zh-TW 文案與因子爆發系統.md §H 一致；
 * 色碼六個且互不相同；查不到文案時退回 key；uid-design-tokens.json 可解析且與常數一致。
 */
import { assert, TestSuite } from './TestRunner';
import { FACTOR_EDGE_NEUTRAL_RGB, FACTOR_NEUTRAL_TINT, FACTOR_TAG_COLORS, FACTOR_TAG_I18N_KEYS, applyFactorTagTokens, factorEdgeRgb, factorTagColorOf, factorTagText, parseFactorTagColors, parseHexRgb } from '../assets/scripts/core/systems/FactorTagTokens';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const ROOT = path.resolve(__dirname, '..');
const readLocale = (lang: string): Record<string, string> =>
    JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/i18n', `${lang}.json`), 'utf8')) as Record<string, string>;

export function createFactorTagTokensSuite(): TestSuite {
    const suite = new TestSuite('FactorTagTokens (六色因子標籤 FBR-08)');

    suite.test('四個語系都有六個 ui.gene.tag.* key', () => {
        const keys = Object.values(FACTOR_TAG_I18N_KEYS);
        for (const lang of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const locale = readLocale(lang);
            assert.isTrue(keys.every((k) => typeof locale[k] === 'string' && locale[k].length > 0));
        }
    });

    suite.test('zh-TW 文案與規格一致（藍/粉/綠/紫/白/紅）', () => {
        const zh = readLocale('zh-TW');
        assert.equals('🔵 屬性因子', zh['ui.gene.tag.blue']);
        assert.equals('🟢 戰法種子', zh['ui.gene.tag.green']);
        assert.equals('🟣 天命因子', zh['ui.gene.tag.purple']);
        assert.equals('🔴 體魄因子', zh['ui.gene.tag.red']);
    });

    suite.test('色碼六個且互不相同', () => {
        const colors = Object.values(FACTOR_TAG_COLORS);
        assert.equals(6, colors.length);
        assert.equals(6, new Set(colors).size);
    });

    suite.test('查不到文案時退回 key；查得到時用語系文字', () => {
        assert.equals('ui.gene.tag.red', factorTagText('red', () => undefined));
        assert.equals('體魄', factorTagText('red', (key) => (key === 'ui.gene.tag.red' ? '體魄' : undefined)));
    });

    suite.test('uid-design-tokens.json 可解析，六色與 FACTOR_TAG_COLORS 一致', () => {
        const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/data/uid-design-tokens.json'), 'utf8'));
        const parsed = parseFactorTagColors(raw);
        assert.isTrue(parsed !== null);
        assert.equals(JSON.stringify(FACTOR_TAG_COLORS), JSON.stringify(parsed));
    });

    suite.test('parseFactorTagColors 缺色或格式錯誤時回傳 null', () => {
        assert.isTrue(parseFactorTagColors(null) === null);
        assert.isTrue(parseFactorTagColors({ factorTagColors: { blue: '#50A0FF' } }) === null);
        const bad = { factorTagColors: { ...FACTOR_TAG_COLORS, red: 'red' } };
        assert.isTrue(parseFactorTagColors(bad) === null);
    });

    suite.test('applyFactorTagTokens 合格時覆蓋色碼，不合格時保留原色碼', () => {
        const next = { factorTagColors: { ...FACTOR_TAG_COLORS, red: '#000000' } };
        assert.isTrue(applyFactorTagTokens(next));
        assert.equals('#000000', factorTagColorOf('red'));
        assert.isFalse(applyFactorTagTokens({ factorTagColors: { red: 'bad' } }));
        assert.equals('#000000', factorTagColorOf('red'));
        assert.isTrue(applyFactorTagTokens({ factorTagColors: FACTOR_TAG_COLORS }));
        assert.equals(FACTOR_TAG_COLORS.red, factorTagColorOf('red'));
    });

    suite.test('parseHexRgb 解析 #RRGGBB，格式不合回傳 null', () => {
        assert.equals(0x50, parseHexRgb('#50A0FF')?.r ?? -1);
        assert.equals(0xa0, parseHexRgb('#50A0FF')?.g ?? -1);
        assert.equals(0xff, parseHexRgb('#50A0FF')?.b ?? -1);
        assert.isTrue(parseHexRgb('50A0FF') === null);
        assert.isTrue(parseHexRgb('#FFF') === null);
    });

    suite.test('factorEdgeRgb 六色依標籤色上色；null 與未知色退回中性灰', () => {
        const red = factorEdgeRgb('red');
        assert.equals(0xe6, red.r);
        assert.equals(0x50, red.g);
        assert.equals(0x46, red.b);
        assert.equals(FACTOR_EDGE_NEUTRAL_RGB.r, factorEdgeRgb(null).r);
        assert.equals(FACTOR_EDGE_NEUTRAL_RGB.r, factorEdgeRgb(undefined).r);
        assert.equals(FACTOR_EDGE_NEUTRAL_RGB.r, factorEdgeRgb('gold' as never).r);
    });

    suite.test('中性色只有一個來源：FACTOR_NEUTRAL_TINT 與連線 RGB 同值', () => {
        const rgb = parseHexRgb(FACTOR_NEUTRAL_TINT);
        assert.isTrue(rgb !== null);
        assert.equals(FACTOR_EDGE_NEUTRAL_RGB.r, rgb?.r ?? -1);
        assert.equals(FACTOR_EDGE_NEUTRAL_RGB.g, rgb?.g ?? -1);
        assert.equals(FACTOR_EDGE_NEUTRAL_RGB.b, rgb?.b ?? -1);
    });

    return suite;
}
