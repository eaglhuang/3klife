/**
 * BloodlineTreeFlatten.test.ts — 嵌套基因樹一次遞迴成 14 位先祖 slot 表（PROG-2-1029，BUI-03）
 *
 * 鎖住：完整三代樹產出 14 個 slot 且代碼正確（F 父系、M 母系）；根節點不進結果；
 * 缺分支時只缺該分支；第四代以後忽略；空根回傳空表。
 */
import { TestSuite, assert } from './TestRunner';
import { PEDIGREE_SLOTS } from '../assets/scripts/core/services/BloodlineGraph';
import { flattenAncestorTree, type AncestorTreeNode } from '../assets/scripts/core/systems/BloodlineTreeFlatten';

/** 建一棵完整三代樹，每個節點的 data 就是它的 slot 代碼，方便比對。 */
function fullTree(path: string): AncestorTreeNode<string> {
    const node: AncestorTreeNode<string> = { data: 'self' + path };
    if (path.length < 3) {
        node.father = fullTree(path + 'F');
        node.mother = fullTree(path + 'M');
    }
    return node;
}

export function createBloodlineTreeFlattenSuite(): TestSuite {
    const suite = new TestSuite('BloodlineTreeFlatten (血統基因樹遞迴 PROG-2-1029)');

    suite.test('完整三代樹產出 14 個 slot，代碼與 PEDIGREE_SLOTS 一致', () => {
        const flat = flattenAncestorTree(fullTree(''));
        const keys = Object.keys(flat).sort();
        assert.equals(14, keys.length);
        assert.equals([...PEDIGREE_SLOTS].sort().join(','), keys.join(','));
    });

    suite.test('slot 代碼正確：F 為父系、M 為母系，FMF 是父的母的父', () => {
        const flat = flattenAncestorTree(fullTree(''));
        assert.equals('selfF', flat.F);
        assert.equals('selfM', flat.M);
        assert.equals('selfFM', flat.FM);
        assert.equals('selfMFF', flat.MFF);
        assert.equals('selfFMF', flat.FMF);
    });

    suite.test('根節點（子代本人）不放進結果', () => {
        const flat = flattenAncestorTree(fullTree(''));
        assert.isTrue(Object.values(flat).indexOf('self') === -1);
    });

    suite.test('缺分支時只缺該分支，不影響另一側', () => {
        const root: AncestorTreeNode<string> = {
            data: 'child',
            father: { data: 'F', father: null, mother: { data: 'FM' } },
            mother: null,
        };
        const flat = flattenAncestorTree(root);
        assert.equals('F', flat.F);
        assert.equals('FM', flat.FM);
        assert.isTrue(flat.FF === undefined);
        assert.isTrue(flat.M === undefined);
        assert.equals(2, Object.keys(flat).length);
    });

    suite.test('第四代以後的資料忽略，不會無限遞迴', () => {
        const deep: AncestorTreeNode<string> = {
            data: 'child',
            father: { data: 'F', father: { data: 'FF', father: { data: 'FFF', father: { data: 'FFFF' } } } },
        };
        const flat = flattenAncestorTree(deep);
        assert.equals('FFF', flat.FFF);
        assert.equals(3, Object.keys(flat).length);
        assert.isTrue(Object.values(flat).indexOf('FFFF') === -1);
    });

    suite.test('空根回傳空表', () => {
        assert.equals(0, Object.keys(flattenAncestorTree(null)).length);
        assert.equals(0, Object.keys(flattenAncestorTree(undefined)).length);
    });

    return suite;
}
