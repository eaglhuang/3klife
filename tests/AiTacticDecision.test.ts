/**
 * AiTacticDecision.test.ts — 敵方戰法依 AI 智力分級（PROG-2-1466）
 *
 * 覆蓋：低 IQ 30% 出手與隨機挑技、中 IQ 挑最高傷害、高 IQ 走情境打分、
 * 未套難度表維持既有行為、難度表 canUseTactics=false 不出手，以及真實回合接線。
 *
 * Unity 對照：像 EditMode 測 AI 決策節點，再用 PlayMode 跑幾回合看 IQ 有沒有影響出手。
 */
import { Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import type { AiDifficultyEntry, AiIqLevel } from '../assets/scripts/core/systems/AiDifficultyTable';
import type { TacticAiCandidate, TacticAiSituation } from '../assets/scripts/battle/shared/TacticAiRules';
import { AI_LOW_IQ_TACTIC_RATE, aiHoldsTactic, pickTacticByIq } from '../assets/scripts/battle/shared/AiTacticDecision';
import { TestSuite, assert } from './TestRunner';

const TEST_TACTIC_ID = 'test-ranged-tactic';
const TEST_BATTLE_SKILL_ID = 'cao-cao-tactics';

const candidates: TacticAiCandidate[] = [
    { tacticId: 'heal', category: 'buff-heal', effectValue: 500 },
    { tacticId: 'small', category: 'single-damage', estimatedDamage: 30 },
    { tacticId: 'big', category: 'single-damage', estimatedDamage: 80 },
];
const danger: TacticAiSituation = { enemyHp: [1000], allyLowestHpRate: 0.1 };

function difficulty(aiIq: AiIqLevel, canUseTactics = true): AiDifficultyEntry {
    return {
        difficultyId: 'normal', statScale: 1, aiIq, difficultyBonus: 0, canUseTactics,
        canUseUltimate: false, spGainModifier: 1, duelAcceptThreshold: 0.58,
    };
}

function general(id: string, faction: Faction, tacticSlots: GeneralUnit['tacticSlots'] = []): GeneralUnit {
    return new GeneralUnit({
        id, name: id, faction, hp: 100000, maxSp: 100, initialSp: 100, str: 60, int: 90, lea: 90,
        skillId: TEST_BATTLE_SKILL_ID, battlePrimarySkillId: TEST_BATTLE_SKILL_ID, tacticSlots,
    });
}

function battle(roll: number): BattleController {
    services().initialize();
    services().session.setRandomSource(() => roll);
    const ctrl = new BattleController();
    ctrl.initBattle(
        general('p', Faction.Player),
        general('e', Faction.Enemy, [{ slotId: 's1', tacticId: TEST_TACTIC_ID, source: 'bloodline' }]),
    );
    ctrl.placeGeneralOnBoard(2, 2);
    const target = new TroopUnit('player-foot', TroopType.Infantry, Faction.Player, {
        hp: 100, attack: 30, defense: 10, moveRange: 1, attackRange: 1,
    });
    target.moveTo(2, 3);
    ctrl.state.addUnit(target);
    ctrl.configureSortie({ commandCapacity: 9000, cityTroops: 9000, stageSortieCap: 9000, food: 2000 });
    (ctrl as unknown as { tacticDefinitionMap: Map<string, unknown> }).tacticDefinitionMap.set(TEST_TACTIC_ID, {
        id: TEST_TACTIC_ID, displayName: '測試遠程', category: 'ranged', battleSkillId: TEST_BATTLE_SKILL_ID,
    });
    return ctrl;
}

function enemyCastsIn6Turns(ctrl: BattleController): number {
    let count = 0;
    const original = ctrl.castBattleSkill.bind(ctrl);
    ctrl.castBattleSkill = (faction, options, sourceType) => {
        if (faction === Faction.Enemy) count += 1;
        return original(faction, options, sourceType);
    };
    ctrl.state.enemyGeneral!.currentSp = ctrl.state.enemyGeneral!.maxSp;
    for (let turn = 0; turn < 6; turn += 1) {
        ctrl.resolvePlayerTurn();
        ctrl.resolveEnemyTurn();
        ctrl.finalizeEnemyTurn();
    }
    return count;
}

export function createAiTacticDecisionSuite(): TestSuite {
    const suite = new TestSuite('AiTacticDecision (敵方戰法依 AI 智力 PROG-2-1466)');

    suite.test('低 IQ：抽中 30% 以內才出手，其他 IQ 與未套難度表一律不按兵不動', () => {
        assert.isFalse(aiHoldsTactic('LOW', () => AI_LOW_IQ_TACTIC_RATE - 0.01));
        assert.isTrue(aiHoldsTactic('LOW', () => AI_LOW_IQ_TACTIC_RATE));
        for (const iq of ['MEDIUM', 'HIGH', 'EXTREME', 'PERFECT', null] as const) {
            assert.isFalse(aiHoldsTactic(iq, () => 0.99), String(iq));
        }
    });

    suite.test('低 IQ：依亂數隨機挑一招，不看分數', () => {
        assert.equals('heal', pickTacticByIq('LOW', candidates, danger, () => 0));
        assert.equals('small', pickTacticByIq('LOW', candidates, danger, () => 0.4));
        assert.equals('big', pickTacticByIq('LOW', candidates, danger, () => 0.999));
    });

    suite.test('中 IQ：挑預估傷害最高的戰法，不因我方危險改選治療', () => {
        assert.equals('big', pickTacticByIq('MEDIUM', candidates, danger, () => 0));
        assert.equals(null, pickTacticByIq('MEDIUM', [candidates[0]], danger, () => 0), '沒有傷害戰法時退回主技能');
    });

    suite.test('高 IQ 以上與未套難度表：走情境打分，我方危險時選治療', () => {
        for (const iq of ['HIGH', 'EXTREME', 'PERFECT', null] as const) {
            assert.equals('heal', pickTacticByIq(iq, candidates, danger, () => 0), String(iq));
        }
    });

    suite.test('沒有候選時回 null', () => {
        assert.equals(null, pickTacticByIq('LOW', [], danger, () => 0));
    });

    suite.test('BattleController：套難度表寫入 IQ 與 canUseTactics；未套時為 null／true', () => {
        const ctrl = battle(0.99);
        assert.equals(null, ctrl.state.aiTacticIq);
        assert.isFalse(ctrl.shouldEnemyHoldTactic());
        ctrl.configureAiDifficulty(difficulty('LOW'));
        assert.equals('LOW', ctrl.state.aiTacticIq);
        assert.isTrue(ctrl.shouldEnemyHoldTactic(), '亂數 0.99 ≥ 30%，不出手');
        ctrl.configureAiDifficulty(difficulty('HIGH', false));
        assert.isTrue(ctrl.shouldEnemyHoldTactic(), 'canUseTactics=false 不出手');
    });

    suite.test('真實回合 6 回合：低 IQ 沒抽中時敵方不放技，SP 保留', () => {
        const ctrl = battle(0.99);
        ctrl.configureAiDifficulty(difficulty('LOW'));
        assert.equals(0, enemyCastsIn6Turns(ctrl));
        assert.equals(ctrl.state.enemyGeneral!.maxSp, ctrl.state.enemyGeneral!.currentSp);
    });

    suite.test('真實回合 6 回合：中 IQ 會以戰法出手', () => {
        const ctrl = battle(0.99);
        ctrl.configureAiDifficulty(difficulty('MEDIUM'));
        assert.isTrue(enemyCastsIn6Turns(ctrl) >= 1);
    });

    return suite;
}
