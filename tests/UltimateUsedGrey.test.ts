/**
 * UltimateUsedGrey.test.ts — 奧義選單灰化本場已用奧義（E-9，PROG-2-1512）
 */
import { markUsedUltimates } from '../assets/scripts/ui/core/UltimateUsage';
import { TestSuite, assert } from './TestRunner';

const SKILLS: Array<{ skillId: string; label: string; costSp: number; used?: boolean }> = [
    { skillId: 'a', label: '甲', costSp: 100 },
    { skillId: 'b', label: '乙', costSp: 100 },
];

export function createUltimateUsedGreySuite(): TestSuite {
    const suite = new TestSuite('UltimateUsedGrey (奧義選單灰化已用 PROG-2-1512)');

    suite.test('已施放的 skillId 標為 used，其餘不標', () => {
        const marked = markUsedUltimates(SKILLS, new Set(['b']));
        assert.isTrue(!marked[0].used);
        assert.isTrue(marked[1].used === true);
    });

    suite.test('沒有已用時全部可點，且不改動原陣列', () => {
        const marked = markUsedUltimates(SKILLS, new Set());
        assert.isTrue(marked.every((s) => !s.used));
        assert.isTrue(SKILLS.every((s) => s.used === undefined));
    });

    return suite;
}
