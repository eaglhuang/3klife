/**
 * StatusKindsE2E.test.ts — 定身（root）與緩速（slow）在真實回合中的效果（PROG-2-0650）
 *
 * Unity 對照：像 PlayMode 測試——放技能、跑回合，看敵軍這一回合有沒有被擋住、下一回合有沒有恢復。
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

function enemy(id: string, moveRange: number, lane: number, depth: number): TroopUnit {
    const unit = new TroopUnit(id, TroopType.Infantry, Faction.Enemy, { hp: 1000, attack: 1, defense: 10, moveRange, attackRange: 1 });
    unit.moveTo(lane, depth);
    return unit;
}

function quietBattle(): BattleController {
    services().initialize();
    services().session.setRandomSource(() => 0);
    const ctrl = new BattleController();
    const player = general('caster', Faction.Player);
    const foe = general('foe', Faction.Enemy);
    ctrl.initBattle(player, foe);
    player.currentSp = player.maxSp;
    foe.currentSp = 0;
    (ctrl as unknown as { turnManager: { enemyFood: number } }).turnManager.enemyFood = 0;
    return ctrl;
}

function playTurn(ctrl: BattleController): void {
    ctrl.advanceTurn();
    ctrl.finalizeAdvanceTurn();
}

export function createStatusKindsE2ESuite(): TestSuite {
    const suite = new TestSuite('StatusKindsE2E (定身／緩速 真實回合)');

    suite.test('緩速：被緩速的敵軍該回合少走 1 格，下一回合恢復', () => {
        const ctrl = quietBattle();
        const slowed = enemy('slowed', 2, 1, 6);
        const normal = enemy('normal', 2, 3, 6);
        ctrl.state.addUnit(slowed);
        ctrl.state.addUnit(normal);
        const startDepth = slowed.depth;

        assert.isTrue(ctrl.triggerPlayerBattleSkill('mentor-slow', SkillSourceType.Mentor, {
            targetMode: BattleSkillTargetMode.EnemySingle,
            targetUnitUid: 'slowed',
        }));
        assert.isTrue(services().buff.hasBuff('slowed', 'slow' as never));

        playTurn(ctrl);
        const normalStep = Math.abs(normal.depth - 6);
        const slowedStep = Math.abs(slowed.depth - startDepth);
        assert.equals(normalStep - 1, slowedStep, '緩速單位少走 1 格');
        assert.isFalse(services().buff.hasBuff('slowed', 'slow' as never), '1 回合後緩速結束');

        const before = slowed.depth;
        const normalBefore = normal.depth;
        playTurn(ctrl);
        assert.equals(Math.abs(normal.depth - normalBefore), Math.abs(slowed.depth - before), '下一回合恢復正常');
    });

    suite.test('定身：施放者 3x3 內的敵軍該回合不動、3x3 外照常走，下一回合恢復', () => {
        const ctrl = quietBattle();
        assert.equals('ok', ctrl.startGeneralDuel());
        const casterUnit = ctrl.placeGeneralOnBoard(2, 2);
        assert.isDefined(casterUnit);
        const near = enemy('near', 1, 1, 3);
        const far = enemy('far', 1, 0, 7);
        ctrl.state.addUnit(near);
        ctrl.state.addUnit(far);
        const farStart = far.depth;

        assert.isTrue(ctrl.triggerPlayerBattleSkill('tally-changban-root', SkillSourceType.TigerTally, {
            targetMode: BattleSkillTargetMode.Self,
        }));
        assert.isTrue(services().buff.hasBuff('near', 'rooted' as never));
        assert.isFalse(services().buff.hasBuff('far', 'rooted' as never), '3x3 外不受影響');

        const nearStart = near.depth;
        playTurn(ctrl);
        assert.equals(nearStart, near.depth, '定身中不移動');
        assert.isTrue(far.depth !== farStart, '3x3 外照常移動');
        assert.isFalse(services().buff.hasBuff('near', 'rooted' as never), '1 回合後解除');

        playTurn(ctrl);
        assert.isTrue(near.depth !== nearStart, '下一回合恢復移動');
    });

    return suite;
}
