/**
 * 設為主卡成功後的主卡提示（doc_spec_0632 §4；SPI-12；PROG-2-2085）
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';

const ROOT = path.join(__dirname, '..');

export function createSpiritMainCardHintSuite(): TestSuite {
    const suite = new TestSuite('SpiritMainCardHint (主卡提示 SPI-12 PROG-2-2085)');

    suite.test('四語系都有 UI_SPIRIT_MAIN_CARD_ACTIVE，繁中照規格', () => {
        for (const loc of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const table = JSON.parse(fs.readFileSync(path.join(ROOT, `assets/resources/i18n/${loc}.json`), 'utf8')) as Record<string, string>;
            assert.isTrue(typeof table['UI_SPIRIT_MAIN_CARD_ACTIVE'] === 'string', `${loc} 缺 UI_SPIRIT_MAIN_CARD_ACTIVE`);
        }
        const zh = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/i18n/zh-TW.json'), 'utf8')) as Record<string, string>;
        assert.equals('當前主奉先祖，獨享家族香火', zh['UI_SPIRIT_MAIN_CARD_ACTIVE']);
    });

    suite.test('命槽「設為主卡」成功才跳提示', () => {
        const src = fs.readFileSync(path.join(ROOT, 'assets/scripts/ui/components/general-detail/GeneralDetailBloodlineChild.ts'), 'utf8');
        assert.isTrue(src.includes("if (result.ok) services().event.emit('SHOW_TOAST', { message: this.t('UI_SPIRIT_MAIN_CARD_ACTIVE'), duration: 2 });"));
    });

    return suite;
}
