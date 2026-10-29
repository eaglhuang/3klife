/**
 * 森林埋伏 Tile 比例（SCENE_FOREST_AMBUSH 60/20/20，PROG-2-1590，暫定）headless 測試
 *
 * 覆蓋：林地格依比例分成陷阱／掩體／一般；陷阱放在最靠敵方的林地並每回合扣血；非林地不加格子。
 */
import { TestSuite, assert } from './TestRunner';
import {
    AMBUSH_TRAP_DAMAGE_PER_TURN,
    AMBUSH_TRAP_TILE_NOTE,
    resolveBattleTacticBehavior,
} from '../assets/scripts/battle/shared/BattleTacticBehavior';
import { BattleState } from '../assets/scripts/battle/models/BattleState';
import { BattleTactic, TerrainType } from '../assets/scripts/core/config/Constants';
import { tileStateKindOf } from '../assets/scripts/battle/shared/TileStateRules';

function forestState(): BattleState {
    const state = new BattleState();
    state.battleTactic = BattleTactic.AmbushAttack;
    // 10 格林地：depth 1、2 兩排各 5 格
    for (const cell of state.cells) {
        if ((cell.depth === 1 || cell.depth === 2) && cell.lane <= 4) cell.terrain = TerrainType.Forest;
    }
    resolveBattleTacticBehavior(BattleTactic.AmbushAttack).applyStartOfBattle(state, { casterGenes: [], random: () => 0 } as never);
    return state;
}

export function createForestAmbushTilesSuite(): TestSuite {
    const suite = new TestSuite('ForestAmbushTiles (森林埋伏 Tile 比例 PROG-2-1590)');

    suite.test('10 格林地 → 2 陷阱、6 掩體、2 一般', () => {
        const state = forestState();
        let traps = 0; let stealth = 0; let plain = 0;
        for (const cell of state.cells.filter((c) => c.terrain === TerrainType.Forest)) {
            const kind = tileStateKindOf(state.getTileEffect(cell.lane, cell.depth));
            if (kind === 'hazard') traps += 1;
            else if (kind === 'stealth') stealth += 1;
            else plain += 1;
        }
        assert.equals(2, traps);
        assert.equals(6, stealth);
        assert.equals(2, plain);
    });

    suite.test('陷阱放在最靠敵方的林地並每回合扣血', () => {
        const state = forestState();
        const trap = state.getTileEffect(0, 1);
        assert.equals(AMBUSH_TRAP_TILE_NOTE, trap?.notes);
        assert.equals(AMBUSH_TRAP_DAMAGE_PER_TURN, trap?.damagePerTurn);
        assert.isFalse(trap?.blocksMovement === true);
    });

    suite.test('非林地不加場景格', () => {
        const state = forestState();
        assert.equals(null, state.getTileEffect(2, 5) ?? null);
    });

    return suite;
}
