/**
 * 七進七出接入移動流程 headless 測試（PROG-2-0776，暫定）
 * 規格：Ghost_Move，移動穿透敵格；路徑上每個敵軍各受一次傷害；岩石與友軍擋下；終點必須空。
 */
import { TestSuite, assert } from './TestRunner';
import { Faction, TroopType, EVENT_NAMES } from '../assets/scripts/core/config/Constants';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { BattleState } from '../assets/scripts/battle/models/BattleState';
import { executeBattleAutoMovePhase, type BattleAutoMovePhaseContext } from '../assets/scripts/battle/runtime/phases/BattleAutoMovePhase';
import { TALLY_PASSIVE_BY_TEMPLATE, hasGhostMove } from '../assets/scripts/battle/shared/TallyPassive';
import { services } from '../assets/scripts/core/managers/ServiceLoader';

const GHOST_TEMPLATE = 'tiger-tally-long-dan';

function makeUnit(id: string, faction: Faction, lane: number, depth: number, ghost: boolean, moveRange = 3): TroopUnit {
    const unit = new TroopUnit(id, TroopType.Cavalry, faction, { hp: 100, attack: 30, defense: 5, moveRange, attackRange: 1 });
    unit.moveTo(lane, depth);
    if (ghost) unit.tallyTemplateId = GHOST_TEMPLATE;
    return unit;
}

interface Scene {
    state: BattleState;
    mover: TroopUnit;
    damaged: Array<{ id: string; damage: number }>;
    blockedDepths: Set<number>;
}

/** 在同一條 lane 上擺單位與岩石；mover 在 depth 0，玩家向前（depth 增加） */
function scene(ghost: boolean, others: TroopUnit[], rockDepths: number[] = [], moveRange = 3): Scene {
    services().initialize();
    const state = new BattleState();
    const mover = makeUnit('mover', Faction.Player, 2, 0, ghost, moveRange);
    state.addUnit(mover);
    for (const unit of others) state.addUnit(unit);
    return { state, mover, damaged: [], blockedDepths: new Set(rockDepths) };
}

function run(sc: Scene): void {
    const context: BattleAutoMovePhaseContext = {
        state: sc.state,
        actingFaction: Faction.Player,
        turnManager: { markUnitMoved: () => undefined } as unknown as BattleAutoMovePhaseContext['turnManager'],
        consumeTileBuff: () => undefined,
        getFactionUnits: (faction) => [...sc.state.units.values()].filter((unit) => unit.faction === faction),
        isCellMovementBlocked: (lane, depth) => lane === 2 && sc.blockedDepths.has(depth),
        isGeneralUnit: () => false,
        applyGhostPassDamage: (target, damage) => { sc.damaged.push({ id: target.id, damage }); },
    };
    executeBattleAutoMovePhase(context);
}

export function createGhostMoveWiringSuite(): TestSuite {
    const suite = new TestSuite('GhostMoveWiring (七進七出接移動流程 PROG-2-0776)');

    suite.test('龍膽符表項存在且帶 Ghost_Move；一般部隊不帶', () => {
        assert.isTrue(TALLY_PASSIVE_BY_TEMPLATE[GHOST_TEMPLATE]?.ghostMove === true);
        assert.isTrue(hasGhostMove(makeUnit('g', Faction.Player, 0, 0, true)));
        assert.isFalse(hasGhostMove(makeUnit('n', Faction.Player, 0, 0, false)));
    });

    suite.test('沒有 Ghost_Move 的部隊仍被敵軍擋下，不穿透、不扣血', () => {
        const enemy = makeUnit('e1', Faction.Enemy, 2, 1, false);
        const sc = scene(false, [enemy]);
        run(sc);
        assert.equals(0, sc.mover.depth);
        assert.equals(0, sc.damaged.length);
    });

    suite.test('七進七出穿過一名敵軍，落在空格，敵軍受一次傷害', () => {
        const enemy = makeUnit('e1', Faction.Enemy, 2, 1, false);
        const sc = scene(true, [enemy], [], 2);
        run(sc);
        assert.equals(2, sc.mover.depth, '穿過 depth 1 落在 depth 2');
        assert.equals('mover', sc.state.getCell(2, 2)!.occupantId);
        assert.isTrue(sc.state.getCell(2, 0)!.occupantId === null, '起點已清空');
        assert.equals(1, sc.damaged.length);
        assert.equals('e1', sc.damaged[0].id);
        assert.isTrue(sc.damaged[0].damage > 0);
        assert.equals(1, enemy.depth, '敵軍不移動');
    });

    suite.test('穿過兩名敵軍，各受一次傷害', () => {
        const e1 = makeUnit('e1', Faction.Enemy, 2, 1, false);
        const e2 = makeUnit('e2', Faction.Enemy, 2, 2, false);
        const sc = scene(true, [e1, e2]);
        run(sc);
        assert.equals(3, sc.mover.depth);
        assert.equals(2, sc.damaged.length);
        assert.equals('e1', sc.damaged[0].id);
        assert.equals('e2', sc.damaged[1].id);
    });

    suite.test('路徑上有岩石：整段無效，原地不動、不扣血', () => {
        const enemy = makeUnit('e1', Faction.Enemy, 2, 1, false);
        const sc = scene(true, [enemy], [2]);
        run(sc);
        assert.equals(0, sc.mover.depth);
        assert.equals(0, sc.damaged.length);
    });

    suite.test('路徑上有友軍：整段無效，原地不動', () => {
        const ally = makeUnit('ally', Faction.Player, 2, 1, false, 0);
        const sc = scene(true, [ally], [], 2);
        run(sc);
        assert.equals(0, sc.mover.depth);
        assert.equals(0, sc.damaged.length);
    });

    suite.test('終點有敵軍：不可停在敵軍身上，退回到較近的空格，且不扣血', () => {
        const enemy = makeUnit('e1', Faction.Enemy, 2, 2, false);
        const sc = scene(true, [enemy], [], 2);
        run(sc);
        assert.equals(1, sc.mover.depth, '終點 depth 2 有敵，退到 depth 1');
        assert.equals(0, sc.damaged.length, '沒有穿過敵軍，不扣血');
    });

    suite.test('移動事件帶 ghostMove 旗標', () => {
        const enemy = makeUnit('e1', Faction.Enemy, 2, 1, false);
        const sc = scene(true, [enemy], [], 2);
        const seen: Array<Record<string, unknown>> = [];
        const off = services().event.on(EVENT_NAMES.UnitMoved, (data?: Record<string, unknown>) => { if (data) seen.push(data); });
        run(sc);
        off();
        assert.equals(1, seen.length);
        assert.isTrue(seen[0].ghostMove === true);
    });

    return suite;
}
