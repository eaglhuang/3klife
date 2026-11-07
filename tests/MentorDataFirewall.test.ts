/**
 * MentorDataFirewall — 精力別名與教官邊界（doc_spec_0325；PROG-2-2000）
 */
import { assert, TestSuite } from './TestRunner';
import {
    assertMentorPatchAllowed, assertMentorUnchanged, findVitalityAliasPaths, forbiddenMentorWrites,
    SecurityBoundaryViolationError,
} from '../assets/scripts/core/systems/MentorDataFirewall';

function throwsBoundary(fn: () => void): boolean {
    try { fn(); return false; } catch (e) { return e instanceof SecurityBoundaryViolationError; }
}

export function createMentorDataFirewallSuite(): TestSuite {
    const suite = new TestSuite('MentorDataFirewall (教官邊界 doc_spec_0325 PROG-2-2000)');

    suite.test('廢止精力別名偵測（含巢狀與陣列）', () => {
        assert.equals(0, findVitalityAliasPaths({ Vitality: 50, Vitality_Max: 100 }).length);
        const paths = findVitalityAliasPaths({ Generals: { g1: { VIT_Max: 100 } }, list: [{ vit: 3 }] });
        assert.equals(2, paths.length);
        assert.isTrue(paths.includes('Generals.g1.VIT_Max'));
        assert.isTrue(paths.includes('list[0].vit'));
    });

    suite.test('TeachingOnly 禁寫九欄；一般武將不擋', () => {
        assert.equals(2, forbiddenMentorWrites('TeachingOnly', { Genes: [], Prowess_Stats: {}, Vitality: 5 }).length);
        assert.equals(0, forbiddenMentorWrites('Normal', { Genes: [] }).length);
        assert.isTrue(throwsBoundary(() => assertMentorPatchAllowed('TeachingOnly', { Ancestors_JSON: {} })));
        assertMentorPatchAllowed('TeachingOnly', { Vitality: 80 });
    });

    suite.test('修業前後教官資料不可變（鍵順序無關）', () => {
        assertMentorUnchanged({ a: 1, b: { c: 2 } }, { b: { c: 2 }, a: 1 });
        assert.isTrue(throwsBoundary(() => assertMentorUnchanged({ a: 1 }, { a: 2 })));
    });

    return suite;
}
