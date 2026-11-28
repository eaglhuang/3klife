/**
 * KinComboRelations.test.ts — 戰場合攻的史實關係來源（KIN-09 接線，PROG-2-1065）headless 測試
 *
 * 鎖住：用真實的 historical-relations.json 查得義兄弟（劉備、關羽）有關係並帶 ×1.3；
 * 無關係的武將、缺模板 id、或沒有配對表都回傳空陣列，不觸發合攻。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { HistoricalPairTable } from '../assets/scripts/core/systems/HistoricalPairs';
import { comboChanceOfLevel } from '../assets/scripts/core/systems/ComboAttackKin';
import { kinLevelBetween } from '../assets/scripts/core/systems/KinBattleEffects';

const ROOT = path.resolve(__dirname, '..');
const TABLE = HistoricalPairTable.load(JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/data/historical-relations.json'), 'utf8'))).table;

export function createKinComboRelationsSuite(): TestSuite {
    const suite = new TestSuite('KinComboRelations (戰場合攻史實關係來源 PROG-2-1065)');

    suite.test('義兄弟（劉備、關羽）順序無關都查得到，合攻觸發率 26%', () => {
        assert.equals('SWORN', kinLevelBetween(TABLE, [], 'guan-yu', 'liu-bei'));
        assert.isTrue(Math.abs(comboChanceOfLevel(kinLevelBetween(TABLE, [], 'guan-yu', 'liu-bei')) - 0.26) < 1e-9);
    });

    suite.test('沒有史實關係的武將對不觸發（NONE，觸發率 0）；史實夫妻等級為 SPOUSE、合攻 26%', () => {
        assert.equals('NONE', kinLevelBetween(TABLE, [], 'lu-bu', 'diao-chan'));
        assert.equals(0, comboChanceOfLevel('NONE'));
        assert.equals('SPOUSE', kinLevelBetween(TABLE, [], 'zhou-yu', 'xiao-qiao'));
        assert.isTrue(Math.abs(comboChanceOfLevel(kinLevelBetween(TABLE, [], 'zhou-yu', 'xiao-qiao')) - 0.26) < 1e-9);
    });

    suite.test('缺模板 id、或沒有配對表時為 NONE', () => {
        assert.equals('NONE', kinLevelBetween(TABLE, [], null, 'liu-bei'));
        assert.equals('NONE', kinLevelBetween(TABLE, [], 'guan-yu', null));
        assert.equals('NONE', kinLevelBetween(null, [], 'guan-yu', 'liu-bei'));
    });

    return suite;
}
