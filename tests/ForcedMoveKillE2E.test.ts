/**
 * ForcedMoveKillE2E — 強制位移受阻傷害致死走陣亡流程（QA，PROG-2-0635，暫定規則）
 *
 * Unity 對照：像 PlayMode 測試——地格把部隊往前推、前面被擋住就扣血，扣到 0 時單位必須真的從戰場消失，
 * 不能留一具 0 血的屍體佔格、還繼續被移動迴圈拿去走下一步。
 */
import { EVENT_NAMES, Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { TestSuite, assert } from './TestRunner';

function general(id: string, faction: Faction): GeneralUnit {
    return new GeneralUnit({
        id, name: id, faction, hp: 1000, maxSp: 100, initialSp: 0, str: 100, int: 60, lea: 90,
        skillId: 'cao-cao-tactics', battlePrimarySkillId: 'cao-cao-tactics',
    });
}

function troop(id: string, faction: Faction, lane: number, depth: number, moveRange = 3): TroopUnit {
    const unit = new TroopUnit(id, TroopType.Infantry, faction, { hp: 1000, attack: 40, defense: 5, moveRange, attackRange: 1 });
    unit.moveTo(lane, depth);
    return unit;
}

function battle(): BattleController {
    services().initialize();
    services().session.setRandomSource(() => 0.99);
    const ctrl = new BattleController();
    ctrl.initBattle(general('p', Faction.Player), general('e', Faction.Enemy));
    (ctrl as unknown as { turnManager: { enemyFood: number } }).turnManager.enemyFood = 0;
    return ctrl;
}

function put(ctrl: BattleController, unit: TroopUnit): TroopUnit {
    ctrl.state.addUnit(unit);
    ctrl.state.getCell(unit.lane, unit.depth)!.occupantId = unit.id;
    return unit;
}

/** (2,1) 是會把進入者再往前推 2 格的地格；(2,2) 站著敵軍，所以推不動、整段受阻 */
function pushTrap(ctrl: BattleController): void {
    ctrl.state.setTileEffect({
        id: 'trap', lane: 2, depth: 1, state: 'hazard-rock', forcedMoveDirection: 'forward', forcedMoveSteps: 2,
    } as never);
}

export function createForcedMoveKillE2ESuite(): TestSuite {
    const suite = new TestSuite('ForcedMoveKillE2E (強制位移受阻致死 PROG-2-0635)');

    suite.test('受阻傷害但沒死：照扣最大 HP 的比例，單位仍在戰場', () => {
        const ctrl = battle();
        pushTrap(ctrl);
        const mover = put(ctrl, troop('mover', Faction.Player, 2, 0));
        put(ctrl, troop('wall', Faction.Enemy, 2, 2));
        ctrl.resolvePlayerTurn();
        assert.isFalse(mover.isDead());
        assert.isTrue(mover.currentHp < mover.maxHp, '受阻有扣血');
        assert.isTrue(ctrl.state.units.has('mover'));
    });

    suite.test('受阻傷害致死：單位移出戰場、格子釋放、發一次 UnitDied，移動迴圈不再拿它走下一步', () => {
        const ctrl = battle();
        pushTrap(ctrl);
        const mover = put(ctrl, troop('mover', Faction.Player, 2, 0));
        mover.takeDamage(mover.maxHp - 1);
        put(ctrl, troop('wall', Faction.Enemy, 2, 2));
        const died: string[] = [];
        const off = services().event.on(EVENT_NAMES.UnitDied, (payload: { unitId: string }) => { died.push(payload.unitId); });
        const moved: number[] = [];
        const offMoved = services().event.on(EVENT_NAMES.UnitMoved, (payload: { unitId: string; depth: number }) => { if (payload.unitId === 'mover') moved.push(payload.depth); });
        ctrl.resolvePlayerTurn();
        off();
        offMoved();
        assert.isTrue(mover.isDead());
        assert.isFalse(ctrl.state.units.has('mover'), '陣亡後移出戰場');
        assert.equals(null, ctrl.state.getCell(2, 1)!.occupantId, '格子釋放');
        assert.equals(1, died.filter((id) => id === 'mover').length, '發一次 UnitDied');
        assert.equals(1, moved.length, '只走進陷阱格那一步，之後不再移動');
    });

    return suite;
}
