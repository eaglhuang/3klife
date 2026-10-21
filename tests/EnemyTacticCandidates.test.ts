/**
 * EnemyTacticCandidates.test.ts — 敵方戰法候選來源（PROG-2-0912 第 1 段）
 */
import { TestSuite, assert } from './TestRunner';
import { buildEnemyTacticCandidates, tacticAiCategoryOf } from '../assets/scripts/battle/shared/EnemyTacticCandidates';

const LIBRARY = [
    { id: 't-charge', category: 'charge' },
    { id: 't-support', category: 'support' },
    { id: 't-formation', category: 'formation' },
    { id: 't-unknown', category: 'mystery' },
];

export function createEnemyTacticCandidatesSuite(): TestSuite {
    const suite = new TestSuite('EnemyTacticCandidates (敵方戰法候選 PROG-2-0912)');

    suite.test('分類對照：support→buff-heal、formation→tile-scene、charge→single-damage，未知回 null', () => {
        assert.equals('buff-heal', tacticAiCategoryOf('support'));
        assert.equals('tile-scene', tacticAiCategoryOf('formation'));
        assert.equals('single-damage', tacticAiCategoryOf('charge'));
        assert.equals(null, tacticAiCategoryOf('mystery'));
        assert.equals(null, tacticAiCategoryOf(undefined));
    });

    suite.test('鎖定槽跳過，未解鎖的戰法不進候選', () => {
        const slots = [
            { tacticId: 't-charge', source: 'inborn' },
            { tacticId: 't-support', source: 'locked' },
        ];
        const result = buildEnemyTacticCandidates(slots, LIBRARY);
        assert.equals(1, result.length);
        assert.equals('t-charge', result[0].tacticId);
        assert.equals('single-damage', result[0].category);
    });

    suite.test('查不到的戰法與未知分類跳過；同一戰法只留一次', () => {
        const slots = [
            { tacticId: 't-missing' },
            { tacticId: 't-unknown' },
            { tacticId: 't-formation' },
            { tacticId: 't-formation' },
        ];
        const result = buildEnemyTacticCandidates(slots, LIBRARY);
        assert.equals(1, result.length);
        assert.equals('tile-scene', result[0].category);
    });

    suite.test('空槽回空陣列；候選只帶類別，數值欄位留空', () => {
        assert.equals(0, buildEnemyTacticCandidates([], LIBRARY).length);
        const [candidate] = buildEnemyTacticCandidates([{ tacticId: 't-support' }], LIBRARY);
        assert.equals('buff-heal', candidate.category);
        assert.equals(undefined, candidate.effectValue);
        assert.equals(undefined, candidate.estimatedDamage);
    });

    return suite;
}
