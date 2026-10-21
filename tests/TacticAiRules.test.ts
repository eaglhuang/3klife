/**
 * TacticAiRules.test.ts — 戰法 AI 選技規則 headless 測試（TAC-15，PROG-2-0907）
 * 規格：單體傷害看斬殺線；Buff / Heal 看我方危險值；Tile / Scene 看 choke point、密集區、天氣相容。
 */
import { TestSuite, assert } from './TestRunner';
import {
    pickTacticByAiRule,
    scoreTacticCandidate,
    TACTIC_AI_DANGER_BONUS,
    TACTIC_AI_IDLE_DEMOTE,
    TACTIC_AI_KILL_BONUS,
    type TacticAiCandidate,
    type TacticAiSituation,
} from '../assets/scripts/battle/shared/TacticAiRules';

const HEALTHY: TacticAiSituation = { enemyHp: [500, 500], allyLowestHpRate: 1 };

export function createTacticAiRulesSuite(): TestSuite {
    const suite = new TestSuite('TacticAiRules (戰法 AI 選技 TAC-15)');

    suite.test('單體傷害：能斬殺敵方單位時加斬殺分，高於同傷害但不能斬殺者', () => {
        const dmg: TacticAiCandidate = { tacticId: 'dmg', category: 'single-damage', estimatedDamage: 300 };
        const lowEnemy: TacticAiSituation = { enemyHp: [200, 500], allyLowestHpRate: 1 };
        assert.equals(300 + TACTIC_AI_KILL_BONUS, scoreTacticCandidate(dmg, lowEnemy));
        assert.equals(300, scoreTacticCandidate(dmg, HEALTHY));
    });

    suite.test('單體傷害：斬殺加分讓能斬殺的戰法勝過傷害略高但無法斬殺者', () => {
        const killer: TacticAiCandidate = { tacticId: 'kill', category: 'single-damage', estimatedDamage: 300 };
        const nonKill: TacticAiCandidate = { tacticId: 'non-kill', category: 'single-damage', estimatedDamage: 250 };
        const situation: TacticAiSituation = { enemyHp: [300, 900], allyLowestHpRate: 1 };
        assert.equals('kill', pickTacticByAiRule([nonKill, killer], situation));
    });

    suite.test('Buff / Heal：我方危險（≤35%）時加危險分，非危險時降權讓單體傷害反超', () => {
        const heal: TacticAiCandidate = { tacticId: 'heal', category: 'buff-heal', effectValue: 200 };
        const dmg: TacticAiCandidate = { tacticId: 'dmg', category: 'single-damage', estimatedDamage: 150 };
        const danger: TacticAiSituation = { enemyHp: [500], allyLowestHpRate: 0.3 };
        assert.equals(200 + TACTIC_AI_DANGER_BONUS, scoreTacticCandidate(heal, danger));
        assert.equals(200 * TACTIC_AI_IDLE_DEMOTE, scoreTacticCandidate(heal, HEALTHY));
        assert.equals('heal', pickTacticByAiRule([dmg, heal], danger));
        assert.equals('dmg', pickTacticByAiRule([heal, dmg], HEALTHY));
    });

    suite.test('Buff / Heal：我方危險線邊界（剛好 35% 算危險）', () => {
        const heal: TacticAiCandidate = { tacticId: 'heal', category: 'buff-heal', effectValue: 100 };
        const edge: TacticAiSituation = { enemyHp: [], allyLowestHpRate: 0.35 };
        assert.equals(100 + TACTIC_AI_DANGER_BONUS, scoreTacticCandidate(heal, edge));
    });

    suite.test('Tile / Scene：天氣不相容直接不選，即使有 choke point', () => {
        const scene: TacticAiCandidate = {
            tacticId: 'fire-rain', category: 'tile-scene', hasChokePoint: true, denseArea: true, weatherCompatible: false,
        };
        assert.equals(0, scoreTacticCandidate(scene, HEALTHY));
        assert.equals(null, pickTacticByAiRule([scene], HEALTHY));
    });

    suite.test('Tile / Scene：choke point 與密集區各加分，兩者都有最高', () => {
        const both: TacticAiCandidate = { tacticId: 'both', category: 'tile-scene', hasChokePoint: true, denseArea: true, weatherCompatible: true };
        const one: TacticAiCandidate = { tacticId: 'one', category: 'tile-scene', hasChokePoint: true, weatherCompatible: true };
        assert.equals('both', pickTacticByAiRule([one, both], HEALTHY));
    });

    suite.test('沒有候選、或全部 0 分時回 null；同分取先出現者', () => {
        assert.equals(null, pickTacticByAiRule([], HEALTHY));
        const zero: TacticAiCandidate = { tacticId: 'zero', category: 'single-damage', estimatedDamage: 0 };
        assert.equals(null, pickTacticByAiRule([zero], HEALTHY));
        const a: TacticAiCandidate = { tacticId: 'a', category: 'single-damage', estimatedDamage: 200 };
        const b: TacticAiCandidate = { tacticId: 'b', category: 'single-damage', estimatedDamage: 200 };
        assert.equals('a', pickTacticByAiRule([a, b], HEALTHY));
    });

    return suite;
}
