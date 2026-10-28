/**
 * UltControlReviveCrossFlow.test.ts — 挾天子令與唯才是舉跨系統流程（QA，PROG-2-1482）
 *
 * 控制中的敵兵陣營暫時改成我方；若它在控制期間陣亡，陣亡紀錄必須保留原陣營，
 * 否則之後玩家施放唯才是舉會把敵兵永久復活成我方。
 *
 * Unity 對照：像暫時把敵方 Unit 的 Team 切到我方；Unit 被 Destroy 進回收池時若 Team 還是我方，
 * 之後「復活我方陣亡單位」就會把這隻敵人撿回來。
 */
import { Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { SkillSourceType } from '../assets/scripts/shared/SkillRuntimeContract';
import { TestSuite, assert } from './TestRunner';

const CONTROL = { skill: 'cao-cao-ult-control', ultimate: 'ult-cao-cao-3' };
const REVIVE = { skill: 'cao-cao-ult-revive', ultimate: 'ult-cao-cao-2' };

function caoCao(faction: Faction): GeneralUnit {
    return new GeneralUnit({
        id: faction === Faction.Player ? 'p' : 'e', name: 'cao-cao', faction, hp: 100000, maxSp: 100, initialSp: 100,
        skillId: 'cao-cao-tactics', battlePrimarySkillId: 'cao-cao-tactics',
        str: 60, int: 90, lea: 60, pol: 90, tacticSlots: [],
        ultimateSlots: [
            { slot: 2, ultimateId: REVIVE.ultimate, unlockReincarnation: 1 },
            { slot: 3, ultimateId: CONTROL.ultimate, unlockReincarnation: 1 },
        ],
        rebirthCount: 3,
    });
}

function troop(id: string, faction: Faction, lane: number, depth: number): TroopUnit {
    const unit = new TroopUnit(id, TroopType.Infantry, faction, { hp: 100, attack: 1, defense: 1, moveRange: 0, attackRange: 0 });
    unit.moveTo(lane, depth);
    return unit;
}

function battle(): BattleController {
    services().initialize();
    services().session.setRandomSource(() => 0.99);
    const ctrl = new BattleController();
    ctrl.initBattle(caoCao(Faction.Player), caoCao(Faction.Enemy));
    ctrl.placeGeneralOnBoard(2, 2);
    return ctrl;
}

function cast(ctrl: BattleController, def: { skill: string; ultimate: string }): boolean {
    ctrl.state.getGeneral(Faction.Player)!.currentSp = 100;
    return ctrl.triggerPlayerBattleSkill(def.skill, SkillSourceType.Ultimate, { ultimateId: def.ultimate });
}

function kill(ctrl: BattleController, unit: TroopUnit): void {
    unit.currentHp = 0;
    ctrl.state.removeUnit(unit.id);
}

function runCycle(ctrl: BattleController): void {
    (ctrl as unknown as { turnManager: { enemyFood: number } }).turnManager.enemyFood = 100000;
    ctrl.resolvePlayerTurn();
    ctrl.resolveEnemyTurn();
    ctrl.finalizeEnemyTurn();
}

export function createUltControlReviveCrossFlowSuite(): TestSuite {
    const suite = new TestSuite('UltControlReviveCrossFlow (挾天子令×唯才是舉 PROG-2-1482)');

    suite.test('受控敵兵控制期間陣亡：陣亡紀錄回到敵方，唯才是舉不會把它復活成我方', () => {
        const stolen = troop('e-stolen', Faction.Enemy, 0, 6);
        const ctrl = battle();
        ctrl.state.addUnit(stolen);
        assert.isTrue(cast(ctrl, CONTROL));
        assert.equals(Faction.Player, stolen.faction);
        runCycle(ctrl);
        kill(ctrl, stolen);
        assert.equals(Faction.Enemy, stolen.faction, '陣亡後回到原陣營');
        assert.isFalse(cast(ctrl, REVIVE), '我方沒有真正的陣亡友軍，唯才是舉不應生效');
        assert.isFalse(ctrl.state.units.has(stolen.id), '敵兵不會被復活成我方');
    });

    suite.test('真正的我方陣亡兵與受控敵兵同時陣亡：只復活我方那隻', () => {
        const ally = troop('p-ally', Faction.Player, 1, 1);
        const stolen = troop('e-stolen', Faction.Enemy, 0, 6);
        const ctrl = battle();
        ctrl.state.addUnit(ally);
        ctrl.state.addUnit(stolen);
        assert.isTrue(cast(ctrl, CONTROL));
        kill(ctrl, stolen);
        kill(ctrl, ally);
        assert.isTrue(cast(ctrl, REVIVE));
        assert.isTrue(ctrl.state.units.has(ally.id), '我方陣亡兵復活');
        assert.isFalse(ctrl.state.units.has(stolen.id), '敵兵不被復活');
        assert.equals(Faction.Player, ally.faction);
    });

    return suite;
}
