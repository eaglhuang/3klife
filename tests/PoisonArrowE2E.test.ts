/**
 * PoisonArrowE2E.test.ts — 毒箭（dot）在戰術階段扣血的端到端測試（PROG-2-0766 的缺口，PROG-2-0649）
 *
 * Unity 對照：像 PlayMode 測試——放一發毒箭，真的跑幾個回合，看血條怎麼掉、DoT 何時消失。
 */
import { Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { BattleSkillTargetMode, SkillSourceType } from '../shared/skill-runtime';
import { TestSuite, assert } from './TestRunner';

function general(id: string, faction: Faction): GeneralUnit {
    return new GeneralUnit({
        id, name: id, faction, hp: 1000, maxSp: 100, initialSp: 100, str: 100, int: 90, lea: 90,
        skillId: 'cao-cao-tactics', battlePrimarySkillId: 'cao-cao-tactics',
    });
}

function enemyUnit(id: string, hp: number, lane = 2, depth = 3): TroopUnit {
    const unit = new TroopUnit(id, TroopType.Infantry, Faction.Enemy, { hp, attack: 10, defense: 10, moveRange: 0, attackRange: 1 });
    unit.moveTo(lane, depth);
    return unit;
}

/** 固定亂數並讓敵方不再部署，戰場上只有測試放的單位 */
function quietBattle(): BattleController {
    services().initialize();
    services().session.setRandomSource(() => 0);
    const ctrl = new BattleController();
    const player = general('archer', Faction.Player);
    const foe = general('foe', Faction.Enemy);
    ctrl.initBattle(player, foe);
    player.currentSp = player.maxSp;
    foe.currentSp = 0;
    (ctrl as unknown as { turnManager: { enemyFood: number } }).turnManager.enemyFood = 0;
    return ctrl;
}

/** 走完一整回合（結算＋收尾），下一回合才會開始 */
function playTurn(ctrl: BattleController): void {
    ctrl.advanceTurn();
    ctrl.finalizeAdvanceTurn();
}

function castPoison(ctrl: BattleController, targetUid: string): boolean {
    return ctrl.triggerPlayerBattleSkill('tally-poison-arrow', SkillSourceType.TigerTally, {
        targetMode: BattleSkillTargetMode.EnemySingle,
        targetUnitUid: targetUid,
    });
}

export function createPoisonArrowE2ESuite(): TestSuite {
    const suite = new TestSuite('PoisonArrowE2E (毒箭 dot 戰術階段扣血)');

    suite.test('施放當下不扣血；之後每回合扣最大 HP 10%，共 2 回合，第三回合不再扣', () => {
        const ctrl = quietBattle();
        const target = enemyUnit('poisoned', 1000);
        ctrl.state.addUnit(target);

        assert.isTrue(castPoison(ctrl, 'poisoned'));
        assert.equals(1000, target.currentHp, '施放當下不造成傷害');
        assert.isTrue(ctrl.state.unitDots.has('poisoned'));

        playTurn(ctrl);
        assert.equals(900, target.currentHp, '第 1 回合 -10%');
        playTurn(ctrl);
        assert.equals(800, target.currentHp, '第 2 回合 -10%');
        assert.isFalse(ctrl.state.unitDots.has('poisoned'), '2 回合後毒效移除');
        playTurn(ctrl);
        assert.equals(800, target.currentHp, '毒效結束後不再扣血');
    });

    suite.test('每回合至少扣 1 點：低最大 HP 的目標也會掉血', () => {
        const ctrl = quietBattle();
        const target = enemyUnit('tiny', 5);
        ctrl.state.addUnit(target);
        assert.isTrue(castPoison(ctrl, 'tiny'));
        playTurn(ctrl);
        assert.equals(4, target.currentHp);
    });

    suite.test('毒死目標：單位陣亡、毒效記錄被清掉，不會再對屍體結算', () => {
        const ctrl = quietBattle();
        const target = enemyUnit('weak', 10);
        ctrl.state.addUnit(target);
        assert.isTrue(castPoison(ctrl, 'weak'));
        target.currentHp = 1;
        playTurn(ctrl);
        assert.isTrue(target.isDead());
        playTurn(ctrl);
        assert.isFalse(ctrl.state.unitDots.has('weak'));
    });

    suite.test('重新開戰會清空毒效；沒有目標時不施放也不留記錄', () => {
        const ctrl = quietBattle();
        const target = enemyUnit('poisoned', 1000);
        ctrl.state.addUnit(target);
        assert.isTrue(castPoison(ctrl, 'poisoned'));
        assert.equals(1, ctrl.state.unitDots.size);
        ctrl.initBattle(general('archer', Faction.Player), general('foe', Faction.Enemy));
        assert.equals(0, ctrl.state.unitDots.size);
        assert.isFalse(castPoison(ctrl, 'nobody'));
        assert.equals(0, ctrl.state.unitDots.size);
    });

    return suite;
}
