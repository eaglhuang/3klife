/**
 * BattleNumericStrings — 數值系統 UI 字串進 i18n（NUM-16 / PROG-2-0981）headless 測試
 *
 * 鎖住：H-1（數值顯示）與 H-2（彈出文字）規定的 24 個 key 在四個語系都存在且非空；
 * 繁中與英文的規格文字原樣對上（規格寫死的部分），其餘語系的翻譯為暫定。
 */
import * as fs from 'fs';
import * as path from 'path';
import { DEFAULT_VFX_EFFECTS } from '../assets/scripts/core/config/VfxEffectConfig';
import { assert, TestSuite } from './TestRunner';

const I18N_DIR = path.join(__dirname, '..', 'assets', 'resources', 'i18n');
const LOCALES = ['zh-TW', 'zh-CN', 'en', 'ja'] as const;

const NUMERIC_KEYS = [
    'STAT_STR', 'STAT_INT', 'STAT_LEA', 'STAT_POL', 'STAT_CHA', 'STAT_LUK',
    'STAT_LAYER_TALENT', 'STAT_LAYER_PROWESS',
    'VAL_EP', 'VAL_VITALITY', 'VAL_SP',
    'LABEL_COUNTER', 'LABEL_COUNTERED', 'LABEL_CRIT', 'LABEL_APTITUDE', 'LABEL_DAMAGE', 'LABEL_DEFENSE', 'LABEL_HEAL',
    'POPUP_CRIT', 'POPUP_COUNTER', 'POPUP_MISS', 'POPUP_IMMUNE', 'POPUP_WEAK', 'POPUP_REINCARNATE',
];

function loadLocale(locale: string): Record<string, string> {
    return JSON.parse(fs.readFileSync(path.join(I18N_DIR, `${locale}.json`), 'utf8')) as Record<string, string>;
}

export function createBattleNumericStringsSuite(): TestSuite {
    const suite = new TestSuite('BattleNumericStrings (數值系統 UI 字串 i18n NUM-16 PROG-2-0981)');

    suite.test('H-1／H-2 的 24 個 key 在四個語系都存在且非空', () => {
        for (const locale of LOCALES) {
            const table = loadLocale(locale);
            for (const key of NUMERIC_KEYS) {
                assert.isTrue(typeof table[key] === 'string' && table[key].length > 0, `${locale} 缺少 ${key}`);
            }
        }
    });

    suite.test('繁中文字與規格 H-1、H-2 一致', () => {
        const zhTW = loadLocale('zh-TW');
        assert.equals('爆發力', zhTW.VAL_EP);
        assert.equals('剋制', zhTW.LABEL_COUNTER);
        assert.equals('暴擊！', zhTW.POPUP_CRIT);
        assert.equals('轉生突破！', zhTW.POPUP_REINCARNATE);
    });

    suite.test('英文文字與規格 H-1 一致（STAT／VAL／LABEL）', () => {
        const en = loadLocale('en');
        assert.equals('Strength', en.STAT_STR);
        assert.equals('Explosive Power', en.VAL_EP);
        assert.equals('Counter', en.LABEL_COUNTER);
    });

    suite.test('戰場飄字的暴擊與未命中改用 i18n key，且繁中可解析', () => {
        const zhTW = loadLocale('zh-TW');
        const crit = DEFAULT_VFX_EFFECTS.crit_hit.notify?.textKey ?? '';
        const miss = DEFAULT_VFX_EFFECTS.hit_miss.notify?.textKey ?? '';
        assert.equals('POPUP_CRIT', crit);
        assert.equals('POPUP_MISS', miss);
        assert.equals('暴擊！', zhTW[crit]);
        assert.equals('未命中', zhTW[miss]);
    });

    suite.test('既有 key 不被覆寫', () => {
        const zhTW = loadLocale('zh-TW');
        assert.equals('返回', zhTW['ui.back']);
    });

    return suite;
}
