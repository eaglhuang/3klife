/**
 * ZocOverlayCells — 棋盤要標示哪些 ZOC 格（PROG-2-2135）
 */
import { TestSuite, assert } from './TestRunner';
import { BattleTactic, Faction } from '../assets/scripts/core/config/Constants';
import { zocOverlayCells, type ZocOverlayState } from '../assets/scripts/battle/shared/ZoneOfControl';

const LANES = 5;
const DEPTHS = 8;

function unit(id: string, faction: Faction, lane: number, depth: number, dead = false) {
    return { id, faction, lane, depth, isDead: () => dead };
}

function battle(
    units: ReadonlyArray<ReturnType<typeof unit>>,
    playerStr: number,
    enemyStr: number,
    battleTactic: BattleTactic = BattleTactic.Normal,
): ZocOverlayState {
    return {
        battleTactic,
        units: new Map(units.map((u) => [u.id, u])),
        getGeneral: (faction) => (faction === Faction.Player ? { str: playerStr, int: 0 } : { str: enemyStr, int: 0 }),
    };
}

const isGeneral = (id: string): boolean => id === 'pg' || id === 'eg';
const keys = (cells: ReadonlyArray<{ lane: number; depth: number }>): string => cells.map((c) => `${c.lane},${c.depth}`).sort().join(' ');

export function createZocOverlayCellsSuite(): TestSuite {
    const suite = new TestSuite('ZocOverlayCells');

    suite.test('玩家主將壓制達不可通行：標出上下左右四格', () => {
        const cells = zocOverlayCells(battle([unit('pg', Faction.Player, 2, 3)], 100, 50), isGeneral, LANES, DEPTHS);
        assert.equals('1,3 2,2 2,4 3,3', keys(cells));
        assert.isTrue(cells.every((c) => c.level === 'impassable' && c.presser === Faction.Player));
    });

    suite.test('達高移動成本倍率時標示等級也跟著變', () => {
        const cells = zocOverlayCells(battle([unit('pg', Faction.Player, 2, 3)], 75, 50), isGeneral, LANES, DEPTHS);
        assert.equals(4, cells.length);
        assert.isTrue(cells.every((c) => c.level === 'high-cost'));
    });

    suite.test('壓制不足、主將陣亡、小兵都不產生標示', () => {
        assert.equals(0, zocOverlayCells(battle([unit('pg', Faction.Player, 2, 3)], 60, 50), isGeneral, LANES, DEPTHS).length);
        assert.equals(0, zocOverlayCells(battle([unit('pg', Faction.Player, 2, 3, true)], 100, 50), isGeneral, LANES, DEPTHS).length);
        assert.equals(0, zocOverlayCells(battle([unit('t1', Faction.Player, 2, 3)], 100, 50), isGeneral, LANES, DEPTHS).length);
    });

    suite.test('棋盤邊緣不會標到界外', () => {
        const cells = zocOverlayCells(battle([unit('pg', Faction.Player, 0, 0)], 100, 50), isGeneral, LANES, DEPTHS);
        assert.equals('0,1 1,0', keys(cells));
    });

    suite.test('敵將壓制玩家時標記來源是敵方', () => {
        const cells = zocOverlayCells(battle([unit('eg', Faction.Enemy, 2, 3)], 50, 100), isGeneral, LANES, DEPTHS);
        assert.equals(4, cells.length);
        assert.isTrue(cells.every((c) => c.presser === Faction.Enemy));
    });

    suite.test('水攻關與移動邏輯一致，不標示', () => {
        const state = battle([unit('pg', Faction.Player, 2, 3)], 100, 50, BattleTactic.FloodAttack);
        assert.equals(0, zocOverlayCells(state, isGeneral, LANES, DEPTHS).length);
    });

    return suite;
}
