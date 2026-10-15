import { TestSuite, assert } from './TestRunner';
import { BattleCombatResolver } from '../assets/scripts/battle/runtime/BattleCombatResolver';
import { BattleTactic, Faction, TerrainType, TroopType } from '../assets/scripts/shared/CommonEnums';
import { GAME_CONFIG } from '../assets/scripts/core/config/Constants';

interface StubUnit {
    id: string;
    faction: Faction;
    type: TroopType;
    lane: number;
    depth: number;
    attackRange: number;
    currentHp: number;
    isDead(): boolean;
}

function unit(id: string, faction: Faction, lane: number, depth: number, attackRange: number): StubUnit {
    return {
        id,
        faction,
        type: TroopType.Infantry,
        lane,
        depth,
        attackRange,
        currentHp: 100,
        isDead: () => false,
    };
}

/** 最小戰場狀態：只提供 canAttackGeneral 會用到的欄位 */
function buildResolver(enemyGeneral: StubUnit, ambushAt: { lane: number; depth: number } | null) {
    const units = new Map<string, StubUnit>([[enemyGeneral.id, enemyGeneral]]);
    const state = {
        units,
        battleTactic: BattleTactic.Normal,
        getCell: () => ({ terrain: TerrainType.Plain, occupantId: null }),
        getTileEffect: (lane: number, depth: number) =>
            ambushAt && ambushAt.lane === lane && ambushAt.depth === depth
                ? { id: 'ambush', lane, depth, state: 'ambush-field' }
                : null,
    };
    const context = {
        state,
        getPlayerGeneralUnitId: () => null,
        getEnemyGeneralUnitId: () => enemyGeneral.id,
        setPlayerGeneralUnitId: () => {},
        setEnemyGeneralUnitId: () => {},
    };
    return new BattleCombatResolver(context as any);
}

export function createGeneralStealthBehaviorSuite(): TestSuite {
    const suite = new TestSuite('GeneralStealthBehavior (掩體格對武將直接攻擊的行為 GRD-04)');

    const enemyGeneralAt = (lane: number, depth: number) =>
        unit('enemy-general', Faction.Enemy, lane, depth, 1);

    suite.test('敵方武將站在掩體格：遠程（射程 2）不可直接攻擊', () => {
        const general = enemyGeneralAt(2, 7);
        const resolver = buildResolver(general, { lane: 2, depth: 7 });
        const archer = unit('archer', Faction.Player, 3, GAME_CONFIG.GRID_DEPTH - 2, 2);
        assert.isFalse((resolver as any).canAttackGeneral(archer));
    });

    suite.test('敵方武將站在掩體格：近戰（射程 1）仍可直接攻擊', () => {
        const general = enemyGeneralAt(2, 7);
        const resolver = buildResolver(general, { lane: 2, depth: 7 });
        const soldier = unit('soldier', Faction.Player, 3, GAME_CONFIG.GRID_DEPTH - 1, 1);
        assert.isTrue((resolver as any).canAttackGeneral(soldier));
    });

    suite.test('敵方武將不在掩體格：遠程也可直接攻擊', () => {
        const general = enemyGeneralAt(2, 7);
        const resolver = buildResolver(general, null);
        const archer = unit('archer', Faction.Player, 3, GAME_CONFIG.GRID_DEPTH - 2, 2);
        assert.isTrue((resolver as any).canAttackGeneral(archer));
    });

    return suite;
}
