/**
 * merge-generals-master.js 的合併規則（GDP-03 / PROG-2-0414）
 *
 * 規則：既有欄位優先，來源只補空值；重跑同一批來源不改動已合併的資料。
 */
import { assert, TestSuite } from './TestRunner';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { mergeIntoList } = require('../tools_node/merge-generals-master.js') as {
    mergeIntoList: (existing: Array<Record<string, unknown>>, incoming: Array<Record<string, unknown>>) => {
        merged: Array<Record<string, unknown>>;
        added: string[];
        updated: string[];
        untouched: string[];
    };
};

export function createMergeGeneralsMasterSuite(): TestSuite {
    const suite = new TestSuite('MergeGeneralsMaster (武將資料合併 GDP-03)');

    suite.test('既有非空欄位不被來源覆寫，來源只補空值', () => {
        const existing = [{ id: 'a', name: '甲', str: 50, alias: '' }];
        const incoming = [{ id: 'a', name: '乙', str: 70, alias: '別名', int: 60 }];
        const result = mergeIntoList(existing, incoming);
        const row = result.merged[0];
        assert.equals('甲', row.name as string);
        assert.equals(50, row.str as number);
        assert.equals('別名', row.alias as string);
        assert.equals(60, row.int as number);
        assert.equals(JSON.stringify(['a']), JSON.stringify(result.updated));
    });

    suite.test('來源的 undefined、null、空字串、空陣列不會覆寫或補入', () => {
        const existing = [{ id: 'b', name: '丙', tags: ['x'] }];
        const incoming = [{ id: 'b', name: '', tags: [], cha: null, pol: undefined }];
        const result = mergeIntoList(existing, incoming);
        assert.equals('丙', result.merged[0].name as string);
        assert.equals(JSON.stringify(['x']), JSON.stringify(result.merged[0].tags));
        assert.equals(false, 'cha' in result.merged[0]);
        assert.equals(JSON.stringify(['b']), JSON.stringify(result.untouched));
    });

    suite.test('新 id 會新增，缺 id 的來源記錄略過', () => {
        const result = mergeIntoList([], [{ id: 'c', name: '丁' }, { name: '沒有 id' }]);
        assert.equals(1, result.merged.length);
        assert.equals(JSON.stringify(['c']), JSON.stringify(result.added));
    });

    suite.test('重跑同一批來源不改動資料（冪等）', () => {
        const incoming = [{ id: 'd', name: '戊', str: 40 }, { id: 'e', name: '己', str: 30 }];
        const first = mergeIntoList([], incoming);
        const second = mergeIntoList(first.merged, incoming);
        assert.equals(JSON.stringify(first.merged), JSON.stringify(second.merged));
        assert.equals(0, second.added.length);
        assert.equals(0, second.updated.length);
        assert.equals(2, second.untouched.length);
    });

    suite.test('手改過的資料不會被後續合併還原', () => {
        const manual = [{ id: 'f', name: '庚', str: 99 }];
        const result = mergeIntoList(manual, [{ id: 'f', name: '舊資料', str: 10, int: 20 }]);
        assert.equals(99, result.merged[0].str as number);
        assert.equals('庚', result.merged[0].name as string);
        assert.equals(20, result.merged[0].int as number);
    });

    return suite;
}
