/**
 * GeneralListSort.test.ts — 武將列表欄位排序（UI技術規格書 doc_ui_0049，PROG-2-1882）
 *
 * Unity 對照：EditMode 測試自訂 IComparer 的排序結果。
 */
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { bestTroopRank, sortGenerals } from '../assets/scripts/ui/core/GeneralListSort';
import { TestSuite, assert } from './TestRunner';

function gen(id: string, fields: Record<string, unknown>): GeneralConfig {
    return { id, name: id, ...fields } as unknown as GeneralConfig;
}

const ids = (list: GeneralConfig[]) => list.map(g => g.id).join(',');

export function createGeneralListSortSuite(): TestSuite {
    const suite = new TestSuite('GeneralListSort (武將列表排序 PROG-2-1882)');

    suite.test('數字欄位：降冪與升冪', () => {
        const list = [gen('a', { str: 80 }), gen('b', { str: 95 }), gen('c', { str: 60 })];
        assert.equals('b,a,c', ids(sortGenerals(list, 'str', false)));
        assert.equals('c,a,b', ids(sortGenerals(list, 'str', true)));
    });

    suite.test('缺值不論升降冪都排最後，且數字仍依大小排列', () => {
        const list = [gen('a', { age: 45 }), gen('x', {}), gen('b', { age: 120 }), gen('c', { age: 9 })];
        assert.equals('b,a,c,x', ids(sortGenerals(list, 'age', false)));
        assert.equals('c,a,b,x', ids(sortGenerals(list, 'age', true)));
    });

    suite.test('最強兵種：依最高適性排序，沒有適性的排最後', () => {
        const list = [
            gen('a', { troopAptitude: { CAVALRY: 'B', ARCHER: 'A' } }),
            gen('n', {}),
            gen('b', { troopAptitude: { INFANTRY: 'S' } }),
            gen('c', { troopAptitude: { NAVY: 'C' } }),
        ];
        assert.equals(4, bestTroopRank(list[0]));
        assert.equals(0, bestTroopRank(list[1]));
        assert.equals('b,a,c,n', ids(sortGenerals(list, 'troop', false)));
        assert.equals('c,a,b,n', ids(sortGenerals(list, 'troop', true)));
    });

    suite.test('文字欄位與同值穩定排序，不改動原陣列', () => {
        const list = [gen('p1', { faction: 'player' }), gen('e1', { faction: 'enemy' }), gen('p2', { faction: 'player' })];
        assert.equals('e1,p1,p2', ids(sortGenerals(list, 'faction', true)));
        assert.equals('p1,p2,e1', ids(sortGenerals(list, 'faction', false)));
        assert.equals('p1,e1,p2', ids(list));
    });

    return suite;
}
