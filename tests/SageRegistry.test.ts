/**
 * SageRegistry.test.ts — 名士表載入與 schema 驗證（ORAC-01，PROG-2-1067）headless 測試
 *
 * 鎖住：真實的 sages.json 有六位名士且全部通過驗證；準確率超界、面向未知、代碼重複、缺解鎖條件都會被回報。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { parseSageTable } from '../assets/scripts/core/systems/SageRegistry';

const ROOT = path.resolve(__dirname, '..');
const REAL = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/data/master/sages.json'), 'utf8'));

const valid = { sageId: 'SAGE_TEST', name: '測試', biasType: 'BALANCED', accuracyBase: 0.5, unlockCondition: { type: 'default' } };

export function createSageRegistrySuite(): TestSuite {
    const suite = new TestSuite('SageRegistry (名士表 schema ORAC-01 PROG-2-1067)');

    suite.test('真實名士表有六位名士，全部通過驗證', () => {
        const result = parseSageTable(REAL);
        assert.equals(0, result.errors.length);
        assert.equals(6, result.sages.length);
    });

    suite.test('準確率超出 (0, 1] 或面向未知會被回報', () => {
        const result = parseSageTable({ data: [{ ...valid, accuracyBase: 1.2 }, { ...valid, sageId: 'SAGE_X', biasType: 'NOPE' }] });
        assert.equals(0, result.sages.length);
        assert.equals(2, result.errors.length);
    });

    suite.test('代碼重複只保留第一筆並回報；缺解鎖條件會被回報', () => {
        const result = parseSageTable({ data: [valid, { ...valid, name: '重複' }, { ...valid, sageId: 'SAGE_Y', unlockCondition: undefined }] });
        assert.equals(1, result.sages.length);
        assert.equals(2, result.errors.length);
    });

    return suite;
}
