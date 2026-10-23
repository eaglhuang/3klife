/**
 * PersonRegistry.test.ts — 人物登冊去重與副本語意（TERM-06，PROG-2-1023）
 *
 * 鎖住：每個 uid 只有一筆、重複登記不覆蓋、非法欄位拒絕、讀取回傳副本。
 */
import { TestSuite, assert } from './TestRunner';
import { PersonRegistry, type PersonRecord } from '../assets/scripts/core/services/PersonRegistry';

function person(uid: string, extra: Partial<PersonRecord> = {}): PersonRecord {
    return { uid, template_id: 'tpl-' + uid, name: uid, gene_refs: ['g1'], ep_base: 10, faction: 'player', is_virtual: false, ...extra };
}

export function createPersonRegistrySuite(): TestSuite {
    const suite = new TestSuite('PersonRegistry (人物登冊 TERM-06)');

    suite.test('登記後可依 uid 讀回，數量正確', () => {
        const registry = new PersonRegistry();
        assert.isTrue(registry.register(person('p1')).ok);
        assert.isTrue(registry.has('p1'));
        assert.equals(1, registry.size);
        assert.equals('tpl-p1', registry.get('p1')?.template_id ?? '');
    });

    suite.test('重複 uid 回 DUPLICATE_UID，且不覆蓋原紀錄', () => {
        const registry = new PersonRegistry();
        registry.register(person('p1', { name: '原名' }));
        const again = registry.register(person('p1', { name: '新名' }));
        assert.isFalse(again.ok);
        if (!again.ok) assert.equals('DUPLICATE_UID', again.reason);
        assert.equals('原名', registry.get('p1')?.name ?? '');
        assert.equals(1, registry.size);
    });

    suite.test('非法欄位回 INVALID_RECORD：空 uid、負的 ep_base、非布林的 is_virtual、基因非字串', () => {
        const registry = new PersonRegistry();
        const cases: Array<Partial<PersonRecord>> = [
            { uid: '' },
            { ep_base: -1 },
            { ep_base: Number.NaN },
            { is_virtual: 'no' as unknown as boolean },
            { gene_refs: [1 as unknown as string] },
        ];
        for (const extra of cases) {
            const result = registry.register(person('bad', extra));
            assert.isFalse(result.ok);
            if (!result.ok) assert.equals('INVALID_RECORD', result.reason);
        }
        assert.equals(0, registry.size);
    });

    suite.test('讀取回傳副本：改動 gene_refs 不影響登冊內容', () => {
        const registry = new PersonRegistry();
        registry.register(person('p1'));
        const copy = registry.get('p1');
        if (copy) copy.gene_refs.push('hacked');
        assert.equals(1, registry.get('p1')?.gene_refs.length ?? 0);
    });

    suite.test('登記時複製輸入：之後改動原物件不影響登冊', () => {
        const registry = new PersonRegistry();
        const source = person('p1');
        registry.register(source);
        source.gene_refs.push('late');
        assert.equals(1, registry.get('p1')?.gene_refs.length ?? 0);
    });

    suite.test('list 依 uid 排序，順序固定', () => {
        const registry = new PersonRegistry();
        registry.register(person('b'));
        registry.register(person('a'));
        assert.equals('a', registry.list()[0].uid);
        assert.equals('b', registry.list()[1].uid);
    });

    return suite;
}
