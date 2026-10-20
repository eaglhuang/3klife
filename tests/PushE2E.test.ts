/**
 * PushE2E.test.ts — 位移（push）在真實戰場的效果（QA，PROG-2-0653）
 *
 * Unity 對照：像 PlayMode 測試——真的放技能，看敵軍有沒有被推開、格子佔位有沒有同步、受阻有沒有扣血。
 */
import { Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { BattleSkillTargetMode, SkillSourceType } from '../shared/skill-runtime';
import { TestSuite, assert } from './TestRunner';

function general(id: string, faction: Faction, int: number): GeneralUnit {
    return new GeneralUnit({
        id, name: id, faction, hp: 1000, maxSp: 100, initialSp: 100, str: 100, int, lea: 90,
        skillId: 'cao-cao-tactics', battlePrimarySkillId: 'cao-cao-tactics',
    });
}

function enemy(id: string, lane: number, depth: number): TroopUnit {
    const unit = new TroopUnit(id, TroopType.Infantry, Faction.Enemy, { hp: 1000, attack: 1, defense: 10, moveRange: 1, attackRange: 1 });
    unit.moveTo(lane, depth);
    return unit;
}

/** 玩家主將站在 (2,2)；玩家智力 / 敵將智力可指定 */
function battle(playerInt = 90, foeInt = 90): { ctrl: BattleController } {
    services().initialize();
    services().session.setRandomSource(() => 0);
    const ctrl = new BattleController();
    const player = general('caster', Faction.Player, playerInt);
    const foe = general('foe', Faction.Enemy, foeInt);
    ctrl.initBattle(player, foe);
    player.currentSp = player.maxSp;
    foe.currentSp = 0;
    (ctrl as unknown as { turnManager: { enemyFood: number } }).turnManager.enemyFood = 0;
    assert.equals('ok', ctrl.startGeneralDuel());
    assert.isDefined(ctrl.placeGeneralOnBoard(2, 2));
    return { ctrl };
}

function addEnemy(ctrl: BattleController, unit: TroopUnit): TroopUnit {
    ctrl.state.addUnit(unit);
    ctrl.state.getCell(unit.lane, unit.depth)!.occupantId = unit.id;
    return unit;
}

export function createPushE2ESuite(): TestSuite {
    const suite = new TestSuite('PushE2E (位移 真實戰場)');

    suite.test('長坂後退：3x3 內敵軍被推離 1 格，格子佔位同步，3x3 外不動', () => {
        const { ctrl } = battle();
        const near = addEnemy(ctrl, enemy('near', 2, 3));
        const far = addEnemy(ctrl, enemy('far', 0, 6));
        assert.isTrue(ctrl.triggerPlayerBattleSkill('tally-changban-push', SkillSourceType.TigerTally, { targetMode: BattleSkillTargetMode.Self }));
        assert.equals(4, near.depth);
        assert.equals(null, ctrl.state.getCell(2, 3)!.occupantId);
        assert.equals('near', ctrl.state.getCell(2, 4)!.occupantId);
        assert.equals(6, far.depth);
    });

    suite.test('受阻：後方有人推不動，依未走完步數扣最大 HP 5%', () => {
        const { ctrl } = battle();
        const blocked = addEnemy(ctrl, enemy('blocked', 2, 3));
        addEnemy(ctrl, enemy('wall', 2, 4));
        assert.isTrue(ctrl.triggerPlayerBattleSkill('tally-changban-push', SkillSourceType.TigerTally, { targetMode: BattleSkillTargetMode.Self }));
        assert.equals(3, blocked.depth);
        assert.equals(950, blocked.currentHp);
    });

    suite.test('空城計：施放者智力高於敵將才後退 2 格；不高於則不動', () => {
        const win = battle(100, 80);
        const a = addEnemy(win.ctrl, enemy('a', 2, 3));
        assert.isTrue(win.ctrl.triggerPlayerBattleSkill('empty-fort', SkillSourceType.Mentor, { targetMode: BattleSkillTargetMode.Self }));
        assert.equals(5, a.depth);

        const lose = battle(80, 100);
        const b = addEnemy(lose.ctrl, enemy('b', 2, 3));
        lose.ctrl.triggerPlayerBattleSkill('empty-fort', SkillSourceType.Mentor, { targetMode: BattleSkillTargetMode.Self });
        assert.equals(3, b.depth);
    });

    return suite;
}
