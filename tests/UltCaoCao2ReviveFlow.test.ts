/**
 * UltCaoCao2ReviveFlow.test.ts — 唯才是舉（ult-cao-cao-2）復活陣亡友軍接進真實戰場流程（PROG-2-1334）
 *
 * 用 BattleController 真實的 triggerPlayerBattleSkill（奧義來源）施放，鎖住：
 * - 陣亡友軍（血量歸零後被移出戰場）施放後回到原格，血量為最大 HP 的 50%，陣亡紀錄移除。
 * - 原格被占：放到最近的空格。
 * - 沒有陣亡友軍：不施放，精力與奧義次數都不動。
 * - 撤退脫離（血量 > 0 被移出）不進陣亡紀錄，不能被復活。
 * - 陣營隔離：敵方陣亡不會被玩家的唯才是舉復活。
 * - 多回合：復活後跑三個完整回合，復活兵持續在場；同一奧義一場只能用一次。
 *
 * Unity 對照：像 PlayMode 裡 Pool 回收的單位，在指定位置 Instantiate 回來並把 HP 設成一半，之後每幀都照常運作。
 */
import { EVENT_NAMES, Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { SkillSourceType } from '../assets/scripts/shared/SkillRuntimeContract';
import { TestSuite, assert } from './TestRunner';

const REVIVE_SKILL_ID = 'cao-cao-ult-revive';
const ULTIMATE_ID = 'ult-cao-cao-2';

function caoCao(faction: Faction): GeneralUnit {
    return new GeneralUnit({
        id: faction === Faction.Player ? 'p' : 'e', name: 'cao-cao', faction, hp: 100000, maxSp: 100, initialSp: 100,
        skillId: 'cao-cao-tactics', battlePrimarySkillId: 'cao-cao-tactics',
        str: 60, int: 60, lea: 60, pol: 90, tacticSlots: [],
        ultimateSlots: [{ slot: 2, ultimateId: ULTIMATE_ID, unlockReincarnation: 1 }],
        rebirthCount: 2,
    });
}

function troop(id: string, faction: Faction, lane: number, depth: number, hp = 100): TroopUnit {
    const unit = new TroopUnit(id, TroopType.Infantry, faction, {
        hp, attack: 1, defense: 1, moveRange: 0, attackRange: 0,
    });
    unit.moveTo(lane, depth);
    return unit;
}

function battle(): BattleController {
    services().initialize();
    services().session.setRandomSource(() => 0.99);
    const ctrl = new BattleController();
    ctrl.initBattle(caoCao(Faction.Player), caoCao(Faction.Enemy));
    ctrl.placeGeneralOnBoard(2, 2);
    // 開戰時精力歸零，測試直接灌滿（與 AiEnemyUltimateFlow 同做法）
    ctrl.state.getGeneral(Faction.Player)!.currentSp = 100;
    return ctrl;
}

/** 模擬陣亡：血量歸零後經由 removeUnit 移出戰場（與 onUnitKilled 的路徑相同） */
function killUnit(ctrl: BattleController, unit: TroopUnit): void {
    unit.currentHp = 0;
    ctrl.state.removeUnit(unit.id);
}

function castRevive(ctrl: BattleController): boolean {
    return ctrl.triggerPlayerBattleSkill(REVIVE_SKILL_ID, SkillSourceType.Ultimate, { ultimateId: ULTIMATE_ID });
}

function runCycle(ctrl: BattleController): void {
    (ctrl as unknown as { turnManager: { enemyFood: number } }).turnManager.enemyFood = 100000;
    ctrl.resolvePlayerTurn();
    ctrl.resolveEnemyTurn();
    ctrl.finalizeEnemyTurn();
}

export function createUltCaoCao2ReviveFlowSuite(): TestSuite {
    const suite = new TestSuite('UltCaoCao2ReviveFlow (唯才是舉復活接進戰場 PROG-2-1334)');

    suite.test('陣亡友軍施放後回到原格，血量為 50%，陣亡紀錄移除', () => {
        const ctrl = battle();
        const fallen = troop('p-fallen', Faction.Player, 0, 1, 100);
        ctrl.state.addUnit(fallen);
        killUnit(ctrl, fallen);
        assert.equals(1, ctrl.state.fallenUnits.length);
        assert.isFalse(ctrl.state.units.has(fallen.id));

        assert.isTrue(castRevive(ctrl));
        assert.isTrue(ctrl.state.units.has(fallen.id));
        assert.equals(0, fallen.lane);
        assert.equals(1, fallen.depth);
        assert.equals(50, fallen.currentHp);
        assert.equals(0, ctrl.state.fallenUnits.length);
    });

    suite.test('原格被占：放到最近的空格', () => {
        const ctrl = battle();
        const fallen = troop('p-fallen', Faction.Player, 0, 1, 100);
        ctrl.state.addUnit(fallen);
        killUnit(ctrl, fallen);
        ctrl.state.addUnit(troop('p-blocker', Faction.Player, 0, 1, 100));

        assert.isTrue(castRevive(ctrl));
        assert.isTrue(!(fallen.lane === 0 && fallen.depth === 1));
        const distance = Math.abs(fallen.lane - 0) + Math.abs(fallen.depth - 1);
        assert.equals(1, distance);
        assert.equals(fallen.id, ctrl.state.getCell(fallen.lane, fallen.depth)?.occupantId);
    });

    suite.test('沒有陣亡友軍：不施放，精力不動', () => {
        const ctrl = battle();
        ctrl.state.addUnit(troop('p-alive', Faction.Player, 0, 1, 100));
        const sp = ctrl.state.getGeneral(Faction.Player)!.currentSp;
        assert.isFalse(castRevive(ctrl));
        assert.equals(sp, ctrl.state.getGeneral(Faction.Player)!.currentSp);
    });

    suite.test('撤退脫離（血量 > 0 被移出）不進陣亡紀錄，不能被復活', () => {
        const ctrl = battle();
        const retreated = troop('p-retreated', Faction.Player, 0, 1, 100);
        ctrl.state.addUnit(retreated);
        ctrl.state.removeUnit(retreated.id);
        assert.equals(0, ctrl.state.fallenUnits.length);
        assert.isFalse(castRevive(ctrl));
    });

    suite.test('陣營隔離：敵方陣亡不會被玩家的唯才是舉復活', () => {
        const ctrl = battle();
        const enemyFallen = troop('e-fallen', Faction.Enemy, 4, 6, 100);
        ctrl.state.addUnit(enemyFallen);
        killUnit(ctrl, enemyFallen);
        assert.isFalse(castRevive(ctrl));
        assert.isFalse(ctrl.state.units.has(enemyFallen.id));
    });

    suite.test('多回合：復活後跑三個完整回合仍在場；同一奧義一場只能用一次', () => {
        const ctrl = battle();
        const fallen = troop('p-fallen', Faction.Player, 0, 1, 100);
        ctrl.state.addUnit(fallen);
        killUnit(ctrl, fallen);
        let casts = 0;
        const off = services().event.on(EVENT_NAMES.GeneralSkillUsed, (data?: { faction?: Faction; sourceType?: SkillSourceType }) => {
            if (data?.faction === Faction.Player && data.sourceType === SkillSourceType.Ultimate) casts++;
        });

        assert.isTrue(castRevive(ctrl));
        for (let cycle = 0; cycle < 3; cycle++) runCycle(ctrl);
        assert.isTrue(ctrl.state.units.has(fallen.id));
        assert.isTrue(fallen.currentHp > 0);

        ctrl.state.getGeneral(Faction.Player)!.currentSp = 100;
        killUnit(ctrl, fallen);
        assert.isFalse(castRevive(ctrl));
        off();
        assert.equals(1, casts);
    });

    return suite;
}
