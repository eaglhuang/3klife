/**
 * SageTableConsistency.test.ts — 名士常數 SAGES 與名士表 sages.json 數值一致（名士預言系統 doc_spec_0006 §F，PROG-2-1887）
 *
 * 執行期用 SAGES 常數擲骰與判斷解鎖，sages.json 是 Server 端名士表；兩份任一改了另一份沒跟上就會失敗。
 *
 * Unity 對照：EditMode 測試比對 ScriptableObject 與匯出表格。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { parseSageTable } from '../assets/scripts/core/systems/SageRegistry';
import { SAGES, SageId } from '../assets/scripts/core/systems/SageDivination';

const ROOT = path.resolve(__dirname, '..');
const REAL = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/data/master/sages.json'), 'utf8'));

const ID_BY_TABLE: Readonly<Record<string, SageId>> = {
    SAGE_ZHUGE: 'zhuge-liang',
    SAGE_HUATUO: 'hua-tuo',
    SAGE_SIMAHUI: 'sima-hui',
    SAGE_XUSHAO: 'xu-shao',
    SAGE_PANGTONG: 'pang-tong',
    SAGE_ZUOCI: 'zuo-ci',
};

export function createSageTableConsistencySuite(): TestSuite {
    const suite = new TestSuite('SageTableConsistency (名士常數與名士表一致 PROG-2-1887)');
    const table = parseSageTable(REAL).sages;

    suite.test('名士表與常數涵蓋同一批名士', () => {
        assert.equals(Object.keys(SAGES).length, table.length);
        for (const row of table) assert.equals(true, ID_BY_TABLE[row.sageId] !== undefined);
    });

    suite.test('名稱與基準準確率一致', () => {
        for (const row of table) {
            const sage = SAGES[ID_BY_TABLE[row.sageId]];
            assert.equals(sage.name, row.name);
            assert.equals(sage.accuracy, row.accuracyBase);
        }
    });

    suite.test('解鎖條件一致：default 為 0 次，divination-count 為表上次數', () => {
        for (const row of table) {
            const sage = SAGES[ID_BY_TABLE[row.sageId]];
            const cond = row.unlockCondition;
            const expected = cond.type === 'default' ? 0 : cond.type === 'divination-count' ? Number(cond.count) : NaN;
            assert.equals(sage.unlockDivinations, expected);
        }
    });

    return suite;
}
