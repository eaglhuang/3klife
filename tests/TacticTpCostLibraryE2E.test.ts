/**
 * TacticTpCostLibraryE2E.test.ts — 戰場戰法庫 id 也能查到 TP 成本（#816 後續，QA，PROG-2-0666）
 *
 * Unity 對照：像確認 ScriptableObject 裡的 skillId 真的對得上價目表，而不是表和資料各用一套 key，
 * 結果所有技能都落到預設價。
 */
import { assert, TestSuite } from './TestRunner';
import { getTacticTpCost, TACTIC_LIBRARY_TO_SPEC_ID, TACTIC_TP_COST_OVERRIDE, DEFAULT_TACTIC_TP_COST } from '../assets/scripts/core/systems/SortieDeploy';
import * as fs from 'fs';
import * as path from 'path';

function libraryIds(): string[] {
    const file = path.resolve(__dirname, '../assets/resources/data/master/tactic-library.json');
    const json = JSON.parse(fs.readFileSync(file, 'utf8')) as { data: { id: string }[] };
    return json.data.map((t) => t.id);
}

export function createTacticTpCostLibraryE2ESuite(): TestSuite {
    const suite = new TestSuite('TacticTpCostLibraryE2E (戰法庫 id 對 TP 表 PROG-2-0666)');

    suite.test('戰法庫每一招都有對照，且對到規格表內的 TAC_* id', () => {
        for (const id of libraryIds()) {
            const spec = TACTIC_LIBRARY_TO_SPEC_ID[id];
            assert.isTrue(spec !== undefined, `${id} 缺對照`);
            assert.isTrue(TACTIC_TP_COST_OVERRIDE[spec] !== undefined, `${id} → ${spec} 不在規格表`);
        }
    });

    suite.test('戰場 id 查價等於對照後的規格價（不再全部落到預設 30）', () => {
        assert.equals(30, getTacticTpCost('tactic-cavalry-shock'));
        assert.equals(35, getTacticTpCost('tactic-fire-scheme'));
        assert.equals(50, getTacticTpCost('tactic-archer-volley'));
        assert.equals(50, getTacticTpCost('tactic-dragon-pierce'));
        assert.equals(15, getTacticTpCost('tactic-battle-roar'));
        const distinct = new Set(libraryIds().map((id) => getTacticTpCost(id)));
        assert.isTrue(distinct.size > 1, '不應全部同價');
    });

    suite.test('規格 id 與未知 id 行為不變', () => {
        assert.equals(55, getTacticTpCost('TAC_EMPTY_FORT'));
        assert.equals(DEFAULT_TACTIC_TP_COST, getTacticTpCost('tactic-unknown'));
    });

    return suite;
}
