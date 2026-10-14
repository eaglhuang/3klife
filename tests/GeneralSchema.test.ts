/**
 * GeneralSchema — 武將最小資料結構驗證（WBS MVP-01，PROG-2-0253）
 *
 * 第一組用 generals.json 的真實資料（JSON 載入測試）；其餘用手拉的假資料測錯誤路徑。
 */
import { assert, TestSuite } from './TestRunner';
import {
    GeneralSchemaRecord,
    validateGeneralList,
    validateGeneralSchema,
} from '../assets/scripts/core/models/GeneralSchema';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');

function validRecord(overrides: GeneralSchemaRecord = {}): GeneralSchemaRecord {
    return {
        id: 'cao-cao',
        templateId: 'GEN_WEI_CAO_CAO',
        bloodlineId: 'BL_WEI_CAO_CAO',
        vitality: 88,
        maxVitality: 100,
        role: 'Combat',
        status: 'Active',
        ...overrides,
    };
}

export function createGeneralSchemaSuite(): TestSuite {
    const suite = new TestSuite('GeneralSchema (武將最小資料結構 MVP-01)');

    suite.test('JSON 載入：generals.json 全部武將通過 schema 驗證', () => {
        const raw = fs.readFileSync('assets/resources/data/generals.json', 'utf8');
        const records = JSON.parse(raw) as GeneralSchemaRecord[];
        assert.isTrue(records.length > 0);
        const report = validateGeneralList(records);
        assert.equals(0, report.length, report.map((r) => `${r.id}: ${r.errors.join('; ')}`).join(' | '));
    });

    suite.test('完整的一筆武將通過驗證', () => {
        assert.equals(0, validateGeneralSchema(validRecord()).length);
    });

    suite.test('缺 UID、Template_ID、Bloodline_ID、Role 會逐一回報', () => {
        const errors = validateGeneralSchema({ vitality: 1, maxVitality: 1, status: 'Active' });
        assert.isTrue(errors.some((e) => e.startsWith('id:')));
        assert.isTrue(errors.some((e) => e.startsWith('templateId:')));
        assert.isTrue(errors.some((e) => e.startsWith('bloodlineId:')));
        assert.isTrue(errors.some((e) => e.startsWith('role:')));
    });

    suite.test('精力：負數、超過上限、上限為 0 或型別錯都會回報', () => {
        assert.isTrue(validateGeneralSchema(validRecord({ vitality: -1 })).some((e) => e.includes('不可為負')));
        assert.isTrue(validateGeneralSchema(validRecord({ vitality: 120 })).some((e) => e.includes('超過精力上限')));
        assert.isTrue(validateGeneralSchema(validRecord({ maxVitality: 0 })).some((e) => e.includes('大於 0')));
        assert.isTrue(validateGeneralSchema(validRecord({ vitality: '88' })).some((e) => e.startsWith('vitality:')));
    });

    suite.test('Status：規格 ENUM 四值都合法，其他值回報', () => {
        for (const status of ['Active', 'Training', 'Retired', 'Dead']) {
            assert.equals(0, validateGeneralSchema(validRecord({ status })).length, status);
        }
        assert.isTrue(validateGeneralSchema(validRecord({ status: 'Sleeping' })).some((e) => e.startsWith('status:')));
    });

    suite.test('整批：UID 重複與有錯的筆數會被列出', () => {
        const report = validateGeneralList([
            validRecord(),
            validRecord({ id: 'cao-cao' }),
            validRecord({ id: 'lu-bu', status: 'Gone' }),
        ]);
        assert.equals(2, report.length);
        assert.isTrue(report.some((r) => r.id === 'cao-cao' && r.errors.some((e) => e.includes('UID 重複'))));
        assert.isTrue(report.some((r) => r.id === 'lu-bu' && r.errors.some((e) => e.startsWith('status:'))));
    });

    return suite;
}
