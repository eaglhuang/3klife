/**
 * EnemyTacticNumbers.test.ts — 敵方戰法數值填入與選技（PROG-2-0914 第 2 段純邏輯）
 */
import { TestSuite, assert } from './TestRunner';
import { fillTacticNumbers, pickEnemyTactic } from '../assets/scripts/battle/shared/EnemyTacticNumbers';
import type { TacticAiCandidate } from '../assets/scripts/battle/shared/TacticAiRules';

const CANDIDATES: TacticAiCandidate[] = [
    { tacticId: 't-dmg', category: 'single-damage' },
    { tacticId: 't-heal', category: 'buff-heal' },
];
const HEALTHY = { enemyHp: [500], allyLowestHpRate: 1 };

export function createEnemyTacticNumbersSuite(): TestSuite {
    const suite = new TestSuite('EnemyTacticNumbers (敵方戰法數值 PROG-2-0914)');

    suite.test('fillTacticNumbers：只填對應戰法，缺數值的戰法保留空欄位', () => {
        const filled = fillTacticNumbers(CANDIDATES, { 't-dmg': { estimatedDamage: 200 } });
        assert.equals(200, filled[0].estimatedDamage);
        assert.equals(undefined, filled[1].effectValue);
        assert.equals('buff-heal', filled[1].category);
    });

    suite.test('fillTacticNumbers：不改原陣列與原物件', () => {
        const before = JSON.stringify(CANDIDATES);
        fillTacticNumbers(CANDIDATES, { 't-dmg': { estimatedDamage: 200 } });
        assert.equals(before, JSON.stringify(CANDIDATES));
    });

    suite.test('pickEnemyTactic：斬殺線的單體傷害優先於無數值的戰法', () => {
        const situation = { enemyHp: [150], allyLowestHpRate: 1 };
        assert.equals('t-dmg', pickEnemyTactic(CANDIDATES, { 't-dmg': { estimatedDamage: 200 } }, situation));
    });

    suite.test('pickEnemyTactic：我方危險時治療戰法勝出；沒有數值或沒有候選回 null', () => {
        const danger = { enemyHp: [500], allyLowestHpRate: 0.2 };
        assert.equals('t-heal', pickEnemyTactic(CANDIDATES, { 't-heal': { effectValue: 100 } }, danger));
        assert.equals(null, pickEnemyTactic(CANDIDATES, {}, HEALTHY));
        assert.equals(null, pickEnemyTactic([], {}, HEALTHY));
    });

    return suite;
}
