/**
 * TallyScriptKeys — 兵種／虎符 §G 劇本與 §H 補缺 Key（TRP-19，PROG-2-1986）
 *
 * 鎖住：新增的 20 個 key 在四個語系都存在、佔位符一致；
 * 繁中模板套入參數後，與現行寫死文字的函式（TallyScripts／TallySlotView）輸出一致，日後換成讀 i18n 不會變字。
 */
import * as fs from 'fs';
import * as path from 'path';
import { tallyLegendDeployLine, tallyProducedLine, tallyStarUpLine } from '../assets/scripts/core/systems/TallyScripts';
import { tallyEquipLine, tallyLoyaltyDropLine, tallyUnequipLine } from '../assets/scripts/core/systems/TallySlotView';
import { assert, TestSuite } from './TestRunner';

const I18N_DIR = path.join(__dirname, '..', 'assets', 'resources', 'i18n');
const LOCALES = ['zh-TW', 'zh-CN', 'en', 'ja'] as const;

const NEW_KEYS = [
    'UI_LOYALTY_DROP', 'UI_LOYALTY_WARNING', 'UI_COUNTER', 'UI_EFFICIENCY', 'UI_SPIRIT_TALLY_CAST', 'UI_BLOODLINE_FACE_REVEAL',
    'SCRIPT_TALLY_PRODUCED', 'SCRIPT_TALLY_EQUIP', 'SCRIPT_TALLY_UNEQUIP', 'SCRIPT_TALLY_STAR_UP', 'SCRIPT_TALLY_BREAKTHROUGH',
    'SCRIPT_TALLY_BREAKTHROUGH_FAIL', 'SCRIPT_TALLY_CLAN_RESONANCE', 'SCRIPT_TALLY_TERRAIN', 'SCRIPT_TALLY_LOYALTY_DROP',
    'SCRIPT_TALLY_BAI_MA', 'SCRIPT_TALLY_XIAN_ZHEN', 'SCRIPT_TALLY_COUNTER_CAVALRY', 'SCRIPT_TALLY_COUNTER_INFANTRY',
    'SCRIPT_TALLY_BLOODLINE_RESONANCE',
];

function loadLocale(locale: string): Record<string, string> {
    return JSON.parse(fs.readFileSync(path.join(I18N_DIR, `${locale}.json`), 'utf8')) as Record<string, string>;
}

function fill(template: string, ...args: Array<string | number>): string {
    return template.replace(/\{(\d+)\}/g, (_, i: string) => String(args[Number(i)]));
}

const placeholdersOf = (text: string) => [...text.matchAll(/\{(\d+)\}/g)].map((m) => m[1]).sort().join(',');

export function createTallyScriptKeysSuite(): TestSuite {
    const suite = new TestSuite('TallyScriptKeys（TRP-19 劇本 Key PROG-2-1986）');
    suite.test('20 個新 key 四語系都有且佔位符一致', () => {
        const tables = LOCALES.map(loadLocale);
        for (const key of NEW_KEYS) {
            for (let i = 0; i < tables.length; i += 1) {
                assert.isTrue(typeof tables[i][key] === 'string' && tables[i][key].length > 0, `${LOCALES[i]} 缺少 ${key}`);
                assert.equals(placeholdersOf(tables[0][key]), placeholdersOf(tables[i][key]), `${LOCALES[i]} ${key} 佔位符不一致`);
            }
        }
    });
    suite.test('繁中模板與現行寫死文字一致', () => {
        const zh = loadLocale('zh-TW');
        assert.equals(tallyProducedLine('呂布', '虎符：陷陣'), fill(zh.SCRIPT_TALLY_PRODUCED, '呂布', '陷陣'));
        assert.equals(tallyStarUpLine('虎符：白馬', 3, '白馬義從'), fill(zh.SCRIPT_TALLY_STAR_UP, '虎符：白馬', 3, '白馬義從'));
        assert.equals(tallyEquipLine('趙雲', '虎符：白馬', '白馬義從'), fill(zh.SCRIPT_TALLY_EQUIP, '趙雲', '虎符：白馬', '白馬義從'));
        assert.equals(tallyUnequipLine('趙雲', '虎符：白馬'), fill(zh.SCRIPT_TALLY_UNEQUIP, '趙雲', '虎符：白馬'));
        assert.equals(tallyLoyaltyDropLine('趙雲'), fill(zh.SCRIPT_TALLY_LOYALTY_DROP, '趙雲'));
        assert.equals(tallyLegendDeployLine('tiger-tally-bai-ma'), zh.SCRIPT_TALLY_BAI_MA);
        assert.equals(tallyLegendDeployLine('tiger-tally-xian-zhen'), zh.SCRIPT_TALLY_XIAN_ZHEN);
    });
    return suite;
}
