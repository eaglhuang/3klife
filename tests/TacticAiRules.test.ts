/**
 * TacticAiRules.test.ts — 戰法 AI 選技規則 headless 測試（TAC-15，PROG-2-0907）
 * 規格：單體傷害看斬殺線；Buff / Heal 看我方危險值；Tile / Scene 看 choke point、密集區、天氣相容。
 */
import { TestSuite, assert } from './TestRunner';
import { estimateTacticHitCount } from '../assets/scripts/battle/shared/TacticDamageEstimate';
import { BattleSkillTargetMode } from '../assets/scripts/shared/SkillRuntimeContract';
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

    suite.test('Buff / Heal：35%~70% 之間不降權也不加分，高於 70% 才折半', () => {
        const heal: TacticAiCandidate = { tacticId: 'heal', category: 'buff-heal', effectValue: 200 };
        assert.equals(200, scoreTacticCandidate(heal, { enemyHp: [], allyLowestHpRate: 0.5 }));
        assert.equals(200, scoreTacticCandidate(heal, { enemyHp: [], allyLowestHpRate: 0.7 }));
        assert.equals(100, scoreTacticCandidate(heal, { enemyHp: [], allyLowestHpRate: 0.71 }));
    });

    suite.test('Buff / Heal：我方危險線邊界（剛好 35% 算危險）', () => {
        const heal: TacticAiCandidate = { tacticId: 'heal', category: 'buff-heal', effectValue: 100 };
        const edge: TacticAiSituation = { enemyHp: [], allyLowestHpRate: 0.35 };
        assert.equals(100 + TACTIC_AI_DANGER_BONUS, scoreTacticCandidate(heal, edge));
    });

    suite.test('群傷（PROG-2-9852）：單目標傷害 × 命中數計分，多人戰法勝過同傷害單體', () => {
        const single: TacticAiCandidate = { tacticId: 'single', category: 'single-damage', estimatedDamage: 100 };
        const aoe: TacticAiCandidate = { tacticId: 'aoe', category: 'single-damage', estimatedDamage: 100, hitCount: 3 };
        const s: TacticAiSituation = { enemyHp: [900], allyLowestHpRate: 1 };
        assert.equals(300, scoreTacticCandidate(aoe, s));
        assert.equals('aoe', pickTacticByAiRule([single, aoe], s));
    });

    suite.test('群傷：estimateTacticHitCount 全體／範圍／單體', () => {
        const cells = [{ lane: 1, depth: 1 }, { lane: 1, depth: 2 }, { lane: 4, depth: 4 }];
        assert.equals(3, estimateTacticHitCount(BattleSkillTargetMode.EnemyAll, cells));
        assert.equals(2, estimateTacticHitCount(BattleSkillTargetMode.EnemyAll, cells, { maxTargets: 2 }));
        assert.equals(2, estimateTacticHitCount(BattleSkillTargetMode.Area, cells, { areaRadius: 1 }));
        assert.equals(1, estimateTacticHitCount(BattleSkillTargetMode.EnemySingle, cells));
        assert.equals(1, estimateTacticHitCount(BattleSkillTargetMode.EnemyAll, []));
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
