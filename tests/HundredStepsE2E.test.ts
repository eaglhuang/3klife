/**
 * HundredStepsE2E.test.ts — 百步穿楊在真實戰場的射程與爆擊（QA，PROG-2-0654）
 *
 * Unity 對照：像 PlayMode 測試——真的放技能，看射程外的敵軍打不到、射程內的目標有沒有依亂數爆擊。
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

function enemy(id: string, lane: number, depth: number): TroopUnit {
    const unit = new TroopUnit(id, TroopType.Infantry, Faction.Enemy, { hp: 100000, attack: 1, defense: 10, moveRange: 1, attackRange: 1 });
    unit.moveTo(lane, depth);
    return unit;
}

function battle(random: number): BattleController {
    services().initialize();
    services().session.setRandomSource(() => random);
    const ctrl = new BattleController();
    const player = general('caster', Faction.Player);
    const foe = general('foe', Faction.Enemy);
    ctrl.initBattle(player, foe);
    player.currentSp = player.maxSp;
    foe.currentSp = 0;
    (ctrl as unknown as { turnManager: { enemyFood: number } }).turnManager.enemyFood = 0;
    assert.equals('ok', ctrl.startGeneralDuel());
    assert.isDefined(ctrl.placeGeneralOnBoard(2, 2));
    return ctrl;
}

function addEnemy(ctrl: BattleController, unit: TroopUnit): TroopUnit {
    ctrl.state.addUnit(unit);
    ctrl.state.getCell(unit.lane, unit.depth)!.occupantId = unit.id;
    return unit;
}

function cast(ctrl: BattleController): boolean {
    return ctrl.triggerPlayerBattleSkill('tally-hundred-steps', SkillSourceType.TigerTally, { targetMode: BattleSkillTargetMode.EnemySingle });
}

export function createHundredStepsE2ESuite(): TestSuite {
    const suite = new TestSuite('HundredStepsE2E (百步穿楊 真實戰場)');

    suite.test('射程：射程內（攻擊射程＋2）的敵軍會被打，射程外沒有目標時不命中', () => {
        const near = battle(0.99);
        const inRange = addEnemy(near, enemy('in', 2, 4));
        cast(near);
        assert.isTrue(inRange.currentHp < inRange.maxHp, '射程內被命中');

        const far = battle(0.99);
        const outRange = addEnemy(far, enemy('out', 2, 7));
        cast(far);
        assert.equals(outRange.maxHp, outRange.currentHp, '射程外不命中');
    });

    suite.test('爆擊：擲骰低於爆擊率時傷害 ×1.5，高於時為普通傷害（同一目標位置）', () => {
        const crit = battle(0);
        const a = addEnemy(crit, enemy('a', 2, 4));
        cast(crit);
        const critDamage = a.maxHp - a.currentHp;

        const plain = battle(0.99);
        const b = addEnemy(plain, enemy('b', 2, 4));
        cast(plain);
        const plainDamage = b.maxHp - b.currentHp;

        assert.isTrue(plainDamage > 0);
        assert.isTrue(critDamage > plainDamage, '爆擊傷害較高');
        assert.equals(Math.floor(plainDamage * 1.5), critDamage);
    });

    return suite;
}
