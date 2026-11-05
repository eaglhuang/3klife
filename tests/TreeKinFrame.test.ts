/**
 * TreeKinFrame.test.ts — 人物頁族譜的外戚同源判定（PROG-2-1845）
 */
import { TestSuite, assert } from './TestRunner';
import { BloodlineGraph, PEDIGREE_SLOTS } from '../assets/scripts/core/services/BloodlineGraph';
import { sharedAncestorUids } from '../assets/scripts/core/systems/BloodlineTreeSlots';
import type { PersonRecord } from '../assets/scripts/core/models/PersonRegistry';

const person = (uid: string) => ({ uid, name: uid }) as unknown as PersonRecord;

export function createTreeKinFrameSuite(): TestSuite {
    const suite = new TestSuite('TreeKinFrame');

    suite.test('沒有重複的祖先時為空', () => {
        assert.equals(0, sharedAncestorUids(['a', 'b', 'c']).size);
    });

    suite.test('出現兩次以上的祖先才算，只算一次', () => {
        const shared = sharedAncestorUids(['a', 'b', 'a', 'c', 'a', 'c']);
        assert.equals(2, shared.size);
        assert.isTrue(shared.has('a'));
        assert.isTrue(shared.has('c'));
        assert.isFalse(shared.has('b'));
    });

    suite.test('空格重複不算共祖', () => {
        assert.equals(0, sharedAncestorUids([null, null, undefined, undefined, '']).size);
    });

    suite.test('雙親同祖時，共同的祖父母被標出，雙親本人不算', () => {
        const graph = new BloodlineGraph();
        graph.registerChild(person('dad'), 'gf', 'gm');
        graph.registerChild(person('aunt'), 'gf', 'gm');
        graph.registerChild(person('kid'), 'dad', 'aunt');
        const pedigree = graph.getPedigree('kid');
        const shared = sharedAncestorUids(PEDIGREE_SLOTS.map((slot) => pedigree[slot]));
        assert.isTrue(shared.has('gf'));
        assert.isTrue(shared.has('gm'));
        assert.isFalse(shared.has('dad'));
        assert.isFalse(shared.has('aunt'));
    });

    return suite;
}
