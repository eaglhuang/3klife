/**
 * UltCaoCao3ControlFlow.test.ts — 挾天子令（ult-cao-cao-3）控制敵兵接進真實戰場流程（PROG-2-1335）
 *
 * 用 BattleController 真實的 triggerPlayerBattleSkill（奧義來源）施放，並跑完整回合，鎖住：
 * - 施放後自動瞄準的一名敵兵改為我方陣營；另一名敵兵不受影響。
 * - 控制持續 2 回合：第 1 回合結束仍受控，第 2 回合結束換回原陣營。
 * - 沒有敵兵時不施放，精力不動。
 * - 受控兵陣亡時控制紀錄一併清除，不會留下殘值。
 *
 * Unity 對照：像暫時把敵方 Unit 的 Team 切到我方，過兩個回合再切回去；計時器由回合結束事件推進。
 */
import { Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { SkillSourceType } from '../assets/scripts/shared/SkillRuntimeContract';
import { TestSuite, assert } from './TestRunner';

const CONTROL_SKILL_ID = 'cao-cao-ult-control';
const ULTIMATE_ID = 'ult-cao-cao-3';

function caoCao(faction: Faction): GeneralUnit {
    return new GeneralUnit({
        id: faction === Faction.Player ? 'p' : 'e', name: 'cao-cao', faction, hp: 100000, maxSp: 100, initialSp: 100,
        skillId: 'cao-cao-tactics', battlePrimarySkillId: 'cao-cao-tactics',
        str: 60, int: 90, lea: 60, pol: 60, tacticSlots: [],
        ultimateSlots: [{ slot: 3, ultimateId: ULTIMATE_ID, unlockReincarnation: 1 }],
        rebirthCount: 3,
    });
}

function troop(id: string, faction: Faction, lane: number, depth: number): TroopUnit {
    const unit = new TroopUnit(id, TroopType.Infantry, faction, {
        hp: 100000, attack: 1, defense: 1, moveRange: 0, attackRange: 0,
    });
    unit.moveTo(lane, depth);
    return unit;
}

function battle(enemyTroops: TroopUnit[]): BattleController {
    services().initialize();
    services().session.setRandomSource(() => 0.99);
    const ctrl = new BattleController();
    ctrl.initBattle(caoCao(Faction.Player), caoCao(Faction.Enemy));
    ctrl.placeGeneralOnBoard(2, 2);
    ctrl.state.getGeneral(Faction.Player)!.currentSp = 100;
    enemyTroops.forEach(unit => ctrl.state.addUnit(unit));
    return ctrl;
}

function castControl(ctrl: BattleController): boolean {
    return ctrl.triggerPlayerBattleSkill(CONTROL_SKILL_ID, SkillSourceType.Ultimate, { ultimateId: ULTIMATE_ID });
}

function runCycle(ctrl: BattleController): void {
    (ctrl as unknown as { turnManager: { enemyFood: number } }).turnManager.enemyFood = 100000;
    ctrl.resolvePlayerTurn();
    ctrl.resolveEnemyTurn();
    ctrl.finalizeEnemyTurn();
}

export function createUltCaoCao3ControlFlowSuite(): TestSuite {
    const suite = new TestSuite('UltCaoCao3ControlFlow (挾天子令控制接進戰場 PROG-2-1335)');

    suite.test('施放後自動瞄準的一名敵兵改為我方，另一名不受影響', () => {
        const a = troop('e-a', Faction.Enemy, 0, 6);
        const b = troop('e-b', Faction.Enemy, 4, 6);
        const ctrl = battle([a, b]);
        assert.isTrue(castControl(ctrl));
        const controlled = [a, b].filter(unit => unit.faction === Faction.Player);
        assert.equals(1, controlled.length);
        assert.equals(1, ctrl.state.controlledUnits.size);
        assert.isTrue(ctrl.state.controlledUnits.has(controlled[0].id));
    });

    suite.test('控制 2 回合：第 1 回合結束仍受控，第 2 回合結束換回原陣營', () => {
        const a = troop('e-a', Faction.Enemy, 0, 6);
        const ctrl = battle([a]);
        assert.isTrue(castControl(ctrl));
        assert.equals(Faction.Player, a.faction);

        runCycle(ctrl);
        assert.equals(2, services().battle.getSnapshot().turn);
        assert.equals(Faction.Player, a.faction);
        assert.equals(1, ctrl.state.controlledUnits.size);

        runCycle(ctrl);
        assert.equals(3, services().battle.getSnapshot().turn);
        assert.equals(Faction.Enemy, a.faction);
        assert.equals(0, ctrl.state.controlledUnits.size);
    });

    suite.test('沒有敵兵：不施放，精力不動', () => {
        const ctrl = battle([]);
        const sp = ctrl.state.getGeneral(Faction.Player)!.currentSp;
        assert.isFalse(castControl(ctrl));
        assert.equals(sp, ctrl.state.getGeneral(Faction.Player)!.currentSp);
    });

    suite.test('受控兵陣亡：控制紀錄一併清除', () => {
        const a = troop('e-a', Faction.Enemy, 0, 6);
        const ctrl = battle([a]);
        assert.isTrue(castControl(ctrl));
        a.currentHp = 0;
        ctrl.state.removeUnit(a.id);
        assert.equals(0, ctrl.state.controlledUnits.size);
        runCycle(ctrl);
        runCycle(ctrl);
        assert.isFalse(ctrl.state.units.has(a.id));
    });

    return suite;
}
