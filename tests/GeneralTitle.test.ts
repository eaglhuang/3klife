/**
 * GeneralTitle — 稱號顯示格式與同名辨識（WBS GEN-10，PROG-2-0551）
 *
 * 第一組用 generals.json 的真實資料；其餘用手拉的資料測格式與錯誤路徑。
 */
import { assert, TestSuite } from './TestRunner';
import {
    formatGeneralDisplayName,
    needsTitleToTell,
    TitledGeneral,
    validateGeneralTitles,
} from '../assets/scripts/core/models/GeneralTitle';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');

export function createGeneralTitleSuite(): TestSuite {
    const suite = new TestSuite('GeneralTitle (稱號系統 GEN-10)');

    suite.test('真實資料：235 筆武將都有稱號、Template_ID 不重複', () => {
        const generals = JSON.parse(fs.readFileSync('assets/resources/data/generals.json', 'utf8')) as TitledGeneral[];
        assert.isTrue(generals.length > 0);
        const errors = validateGeneralTitles(generals);
        assert.equals(0, errors.length, errors.slice(0, 3).join('; '));
    });

    suite.test('顯示格式：有稱號為「名稱・稱號」，沒有稱號只顯示名稱', () => {
        assert.equals('曹操・【魏武】', formatGeneralDisplayName('曹操', '【魏武】'));
        assert.equals('曹操', formatGeneralDisplayName('曹操', null));
        assert.equals('曹操', formatGeneralDisplayName('曹操', '   '));
    });

    suite.test('同名辨識：同名的武將需要稱號來分開，不同名的不需要', () => {
        const all: TitledGeneral[] = [
            { id: 'a', name: '趙雲', templateId: 'T1', title: '[常山]' },
            { id: 'b', name: '趙雲', templateId: 'T2', title: '[白馬]' },
            { id: 'c', name: '關羽', templateId: 'T3', title: '【武聖】' },
        ];
        assert.isTrue(needsTitleToTell(all[0], all));
        assert.isFalse(needsTitleToTell(all[2], all));
    });

    suite.test('錯誤路徑：空稱號、Template_ID 重複、同名稱號相同都會回報', () => {
        const errors = validateGeneralTitles([
            { id: 'a', name: '趙雲', templateId: 'T1', title: '' },
            { id: 'b', name: '趙雲', templateId: 'T1', title: '[白馬]' },
            { id: 'c', name: '呂布', templateId: 'T3', title: '【飛將】' },
            { id: 'd', name: '呂布', templateId: 'T4', title: '【飛將】' },
        ]);
        assert.isTrue(errors.some((e) => e.startsWith('a: 缺少稱號')));
        assert.isTrue(errors.some((e) => e.includes('Template_ID「T1」重複')));
        assert.isTrue(errors.some((e) => e.startsWith('呂布: 同名武將的稱號有重複')));
    });

    return suite;
}
