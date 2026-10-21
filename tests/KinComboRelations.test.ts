/**
 * KinComboRelations.test.ts — 戰場合攻的史實關係來源（KIN-09 接線，PROG-2-1065）headless 測試
 *
 * 鎖住：用真實的 historical-relations.json 查得義兄弟（劉備、關羽）有關係並帶 ×1.3；
 * 無關係的武將、缺模板 id、或沒有配對表都回傳空陣列，不觸發合攻。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { HistoricalPairTable, combatRelationsBetween } from '../assets/scripts/core/systems/HistoricalPairs';
import { comboChanceOfPair } from '../assets/scripts/core/systems/ComboAttackKin';

const ROOT = path.resolve(__dirname, '..');
const TABLE = HistoricalPairTable.load(JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/data/historical-relations.json'), 'utf8'))).table;

export function createKinComboRelationsSuite(): TestSuite {
    const suite = new TestSuite('KinComboRelations (戰場合攻史實關係來源 PROG-2-1065)');

    suite.test('義兄弟（劉備、關羽）順序無關都查得到，合攻觸發率 26%', () => {
        const relations = combatRelationsBetween(TABLE, 'guan-yu', 'liu-bei');
        assert.equals(1, relations.length);
        assert.isTrue(Math.abs(comboChanceOfPair(relations) - 0.26) < 1e-9);
    });

    suite.test('沒有史實關係的武將對不觸發（回傳空陣列，觸發率 0）', () => {
        const relations = combatRelationsBetween(TABLE, 'lu-bu', 'diao-chan');
        assert.equals(0, relations.length);
        assert.equals(0, comboChanceOfPair(relations));
    });

    suite.test('缺模板 id、或沒有配對表時回傳空陣列', () => {
        assert.equals(0, combatRelationsBetween(TABLE, null, 'liu-bei').length);
        assert.equals(0, combatRelationsBetween(TABLE, 'guan-yu', null).length);
        assert.equals(0, combatRelationsBetween(null, 'guan-yu', 'liu-bei').length);
    });

    return suite;
}
