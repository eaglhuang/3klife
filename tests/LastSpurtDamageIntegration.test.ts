/**
 * 殘局傷害接線（FORM-06，PROG-2-1992）：進入破釜沉舟後，普攻與戰法傷害套 √(STR/500)；未進入時傷害不變。
 * - 普攻：用 BattleController 真的跑回合進入殘局，前後各打一擊比較傷害。
 * - 戰法：BattleSkillDamageResolver 用旗標前後比較；派發器的 context.isLastSpurt 跟著 BattleState 走。
 */
import { Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { BattleState } from '../assets/scripts/battle/models/BattleState';
import { BattleSkillDispatcher } from '../assets/scripts/battle/runtime/BattleSkillDispatcher';
import { BattleSkillDamageResolver } from '../assets/scripts/battle/skills/BattleSkillDamageResolver';
import { resolveBattleSkillProfile } from '../assets/scripts/battle/skills/BattleSkillProfiles';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { LAST_SPURT_GENERAL_STR_SCALE, lastSpurtAdjustedDamage, lastSpurtStrFactor } from '../assets/scripts/core/systems/LastSpurt';
import { TestSuite, assert } from './TestRunner';
import { createBattleSkillTestContext, createTestGeneral, createTestUnit } from './BattleSkillTestUtils';

function general(id: string, faction: Faction, str: number): GeneralUnit {
    return new GeneralUnit({
        id, name: id, faction, hp: 100000, maxSp: 100, initialSp: 0, str, int: 60, lea: 60,
        tacticSlots: [], rebirthCount: 1,
    });
}

function troop(id: string, faction: Faction, lane: number, depth: number, attack: number): TroopUnit {
    const unit = new TroopUnit(id, TroopType.Infantry, faction, { hp: 100000, attack, defense: 10, moveRange: 0, attackRange: 0 });
    unit.moveTo(lane, depth);
    return unit;
}

/** 讓 attacker 對全新的 defender 打一擊，回傳造成的傷害（命中必中、不暴擊的固定亂數） */
function hitOnce(ctrl: BattleController, attacker: TroopUnit, lane: number): number {
    const defender = troop(`d-${lane}`, Faction.Enemy, lane, 2, 10);
    ctrl.state.addUnit(defender);
    const resolver = (ctrl as unknown as { combatResolver: { hitRandom: () => number; resolveHit(a: TroopUnit, d: TroopUnit, s: unknown): void } }).combatResolver;
    resolver.hitRandom = () => 0.5;
    const before = defender.currentHp;
    resolver.resolveHit(attacker, defender, services());
    return before - defender.currentHp;
}

export function createLastSpurtDamageIntegrationSuite(): TestSuite {
    const suite = new TestSuite('LastSpurtDamageIntegration（殘局傷害接線 FORM-06 PROG-2-1992）');

    suite.test('換算：武將 STR 100 → 1000，係數 √2；STR 50 剛好是基準 1.0；取整且至少 1', () => {
        assert.equals(10, LAST_SPURT_GENERAL_STR_SCALE);
        assert.equals(Math.floor(100 * Math.sqrt(2)), lastSpurtAdjustedDamage(100, 100));
        assert.equals(100, lastSpurtAdjustedDamage(100, 50));
        assert.equals(1, lastSpurtAdjustedDamage(1, 0));
        assert.isTrue(Math.abs(lastSpurtStrFactor(1000) - Math.sqrt(2)) < 1e-9);
    });

    suite.test('普攻：第 1 回合傷害不變，跑到第 5 回合進入殘局後傷害 ×√(STR/500)', () => {
        services().initialize();
        services().session.setRandomSource(() => 0.99);
        const ctrl = new BattleController();
        ctrl.initBattle(general('p', Faction.Player, 100), general('e', Faction.Enemy, 60));
        ctrl.placeGeneralOnBoard(2, 2);
        const attacker = troop('p-troop', Faction.Player, 0, 1, 100);
        ctrl.state.addUnit(attacker);

        assert.isFalse(ctrl.state.lastSpurtMode);
        const normal = hitOnce(ctrl, attacker, 1);
        assert.isTrue(normal > 0);
        assert.equals(normal, hitOnce(ctrl, attacker, 3), '未進入殘局，同一擊傷害固定');

        (ctrl as unknown as { turnManager: { enemyFood: number } }).turnManager.enemyFood = 0;
        for (let cycle = 0; cycle < 4; cycle++) {
            ctrl.resolvePlayerTurn();
            ctrl.resolveEnemyTurn();
            ctrl.finalizeEnemyTurn();
        }
        assert.isTrue(ctrl.state.lastSpurtMode, '第 5 回合進入殘局');
        // 回合推進可能帶來其他加成，所以同一刻把旗標關掉當對照，只看殘局這一項
        ctrl.state.lastSpurtMode = false;
        const control = hitOnce(ctrl, attacker, 4);
        ctrl.state.lastSpurtMode = true;
        const spurt = hitOnce(ctrl, attacker, 0);
        assert.equals(Math.max(1, Math.floor(control * Math.sqrt(2))), spurt);
        assert.isTrue(spurt > normal);
    });

    suite.test('戰法：旗標未開傷害不變，殘局旗標開啟後 ×√(STR/500)', () => {
        const resolver = new BattleSkillDamageResolver();
        const profile = resolveBattleSkillProfile('cao-cao-tactics')!;
        const caster = createTestGeneral('caster', Faction.Player, { str: 100, lea: 80 });
        const target = createTestUnit('enemy', Faction.Enemy, 2, 3, { defense: 10 });
        const bundle = createBattleSkillTestContext({
            playerGeneral: caster,
            enemyGeneral: createTestGeneral('enemy-general', Faction.Enemy),
            units: [target],
        });
        const normal = resolver.resolveDamage(profile, caster, target, bundle.context, 0);
        assert.equals(normal, resolver.resolveDamage(profile, caster, target, { ...bundle.context, isLastSpurt: () => false }, 0));
        const spurt = resolver.resolveDamage(profile, caster, target, { ...bundle.context, isLastSpurt: () => true }, 0);
        assert.equals(lastSpurtAdjustedDamage(normal, 100), spurt);
        assert.isTrue(spurt > normal);
    });

    suite.test('派發器的技能 context：isLastSpurt 跟著 BattleState.lastSpurtMode', () => {
        const state = new BattleState();
        const dispatcher = new BattleSkillDispatcher({ state, getPlayerGeneralUnitId: () => null, getEnemyGeneralUnitId: () => null, combatResolver: { getFactionUnits: () => [] } } as never, {} as never);
        const ctx = dispatcher.buildBattleSkillExecutionContext();
        assert.equals(false, ctx.isLastSpurt?.());
        state.lastSpurtMode = true;
        assert.equals(true, ctx.isLastSpurt?.());
    });

    return suite;
}
