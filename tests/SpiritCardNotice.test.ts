/**
 * 英靈卡死亡結算提示句（SPI-12 雙卡結算；PROG-2-2082）
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { spiritCardNoticeSpec } from '../assets/scripts/core/systems/SpiritCardDeathSettlement';
import { formatTallyLine } from '../assets/scripts/core/systems/TallyLineSpec';

const I18N_DIR = path.join(__dirname, '..', 'assets', 'resources', 'i18n');
const KEYS = ['SCRIPT_SPIRIT_CARD_PRODUCED', 'SCRIPT_SPIRIT_CARD_MERGED'];

export function createSpiritCardNoticeSuite(): TestSuite {
    const suite = new TestSuite('SpiritCardNotice (英靈卡結算提示 PROG-2-2082)');

    suite.test('新卡與覆蓋各用一個 key，繁中保底帶入名將名', () => {
        assert.equals('SCRIPT_SPIRIT_CARD_PRODUCED', spiritCardNoticeSpec('趙雲', false).key);
        assert.equals('SCRIPT_SPIRIT_CARD_MERGED', spiritCardNoticeSpec('趙雲', true).key);
        assert.isTrue(formatTallyLine(spiritCardNoticeSpec('趙雲', false)).includes('【英靈卡：趙雲】'));
        assert.isTrue(formatTallyLine(spiritCardNoticeSpec('趙雲', true)).startsWith('趙雲 的英靈'));
    });

    suite.test('四語系都有兩個 key，繁中與保底同文', () => {
        const zh = JSON.parse(fs.readFileSync(path.join(I18N_DIR, 'zh-TW.json'), 'utf8')) as Record<string, string>;
        for (const loc of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const table = JSON.parse(fs.readFileSync(path.join(I18N_DIR, `${loc}.json`), 'utf8')) as Record<string, string>;
            for (const key of KEYS) assert.isTrue(typeof table[key] === 'string' && table[key].includes('{0}'), `${loc} 缺 ${key}`);
        }
        const translate = (key: string, ...args: string[]) => (zh[key] ?? key).replace(/\{(\d+)\}/g, (_, i: string) => args[Number(i)]);
        for (const merged of [false, true]) {
            const spec = spiritCardNoticeSpec('關羽', merged);
            assert.equals(formatTallyLine(spec), formatTallyLine(spec, translate));
        }
    });

    suite.test('GameSession：死亡結算把英靈卡提示推進提示佇列', () => {
        const src = fs.readFileSync(path.join(__dirname, '../assets/scripts/core/managers/GameSession.ts'), 'utf8');
        assert.isTrue(src.includes('spiritCardNoticeSpec(nameOfTemplate(id), false)'));
        assert.isTrue(src.includes('spiritCardNoticeSpec(nameOfTemplate(id), true)'));
    });

    return suite;
}
