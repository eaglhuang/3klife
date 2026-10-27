/**
 * ServerSchemaNum17 — 數值配置 Server 列與熱更新比對（NUM-17 / PROG-2-0980）
 *
 * 驗證重點：
 *   1. 合法列沒有問題；鍵名格式、小數位、範圍、類別、版本號的壞列會被擋下
 *   2. 熱更新比對：新鍵套用、版本較新套用、版本較舊略過、同版本同值略過、同版本異值衝突
 */
import { assert, TestSuite } from './TestRunner';
import {
    NumericalConfigRow,
    planNumericalConfigSync,
    validateNumericalConfigRow,
} from '../server/schema/num17-config-row';

function row(overrides: Partial<NumericalConfigRow> = {}): NumericalConfigRow {
    return {
        config_id: 'CFG_0001',
        config_key: 'COUNTER_BONUS',
        config_value: 1.3,
        category: 'BATTLE',
        description: '剋制倍率',
        updated_at: '2026-10-27T00:00:00Z',
        version: 2,
        ...overrides,
    };
}

function paths(overrides: Partial<NumericalConfigRow>): string[] {
    return validateNumericalConfigRow(row(overrides)).map((issue) => issue.path);
}

export function createServerSchemaNum17Suite(): TestSuite {
    const suite = new TestSuite('ServerSchemaNum17 (數值配置 Server 列與熱更新 NUM-17)');

    suite.test('合法列沒有任何問題', () => {
        assert.equals(0, validateNumericalConfigRow(row()).length);
    });

    suite.test('鍵名必須為大寫英文與底線', () => {
        assert.isTrue(paths({ config_key: 'counter_bonus' }).includes('config_key'));
        assert.isTrue(paths({ config_key: '1ST' }).includes('config_key'));
        assert.isTrue(paths({ config_key: 'X'.repeat(65) }).includes('config_key'));
    });

    suite.test('數值超出 DECIMAL(10,4) 或小數超過 4 位會被擋下', () => {
        assert.isTrue(paths({ config_value: 1000000 }).includes('config_value'));
        assert.isTrue(paths({ config_value: 1.23456 }).includes('config_value'));
        assert.isTrue(paths({ config_value: Number.NaN }).includes('config_value'));
        assert.equals(0, validateNumericalConfigRow(row({ config_value: 999999.9999 })).length);
    });

    suite.test('類別必須為列舉值；版本號必須為 1 以上整數', () => {
        assert.isTrue(paths({ category: 'OTHER' as NumericalConfigRow['category'] }).includes('category'));
        assert.isTrue(paths({ version: 0 }).includes('version'));
        assert.isTrue(paths({ version: 1.5 }).includes('version'));
    });

    suite.test('熱更新：客戶端沒有的鍵與版本較新的列會套用', () => {
        const local = new Map([['COUNTER_BONUS', { version: 1, value: 1.2 }]]);
        const decisions = planNumericalConfigSync(local, [
            row({ config_key: 'COUNTER_BONUS', version: 2, config_value: 1.3 }),
            row({ config_id: 'CFG_0002', config_key: 'NEW_KEY', version: 1 }),
        ]);
        assert.equals('apply', decisions[0].action);
        assert.equals('apply', decisions[1].action);
    });

    suite.test('熱更新：版本較舊略過；同版本同值略過', () => {
        const local = new Map([
            ['COUNTER_BONUS', { version: 3, value: 1.3 }],
            ['RAIN_BONUS', { version: 2, value: 0.5 }],
        ]);
        const decisions = planNumericalConfigSync(local, [
            row({ config_key: 'COUNTER_BONUS', version: 2, config_value: 1.2 }),
            row({ config_id: 'CFG_0003', config_key: 'RAIN_BONUS', version: 2, config_value: 0.5 }),
        ]);
        assert.equals('skip-older', decisions[0].action);
        assert.equals('skip-same', decisions[1].action);
    });

    suite.test('熱更新：同版本但數值不同標為衝突，並帶回本地值', () => {
        const local = new Map([['COUNTER_BONUS', { version: 2, value: 1.3 }]]);
        const decisions = planNumericalConfigSync(local, [row({ version: 2, config_value: 1.4 })]);
        assert.equals('conflict', decisions[0].action);
        assert.equals(1.3, decisions[0].action === 'conflict' ? decisions[0].localValue : 0);
    });

    return suite;
}
