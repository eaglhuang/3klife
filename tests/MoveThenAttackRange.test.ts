/**
 * 同回合先移動再攻擊：攻擊射程用移動後的格位計算（騎射合一，PROG-2-0796 / PM 裁定）
 */
import { Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleState } from '../assets/scripts/battle/models/BattleState';
import { BattleCombatResolver } from '../assets/scripts/battle/runtime/BattleCombatResolver';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { TestSuite, assert } from './TestRunner';

function createResolver(state: BattleState): BattleCombatResolver {
    return new BattleCombatResolver({
        state,
        getPlayerGeneralUnitId: () => null,
        getEnemyGeneralUnitId: () => null,
        setPlayerGeneralUnitId: () => undefined,
        setEnemyGeneralUnitId: () => undefined,
    });
}

/** 與 advanceAfterKill 的移動寫法一致：清舊格佔用、搬到新格、佔用新格 */
function moveUnit(state: BattleState, unit: TroopUnit, lane: number, depth: number): void {
    const from = state.getCell(unit.lane, unit.depth);
    if (from) from.occupantId = null;
    unit.moveTo(lane, depth);
    const to = state.getCell(lane, depth);
    if (to) to.occupantId = unit.id;
}

export function createMoveThenAttackRangeSuite(): TestSuite {
    const suite = new TestSuite('MoveThenAttackRange (同回合移動後攻擊射程)');

    suite.test('移動前射程不到敵軍，移動後在射程內即可攻擊（射程以移動後格位計算）', () => {
        services().initialize();
        const state = new BattleState();

        const archer = new TroopUnit('p-archer', TroopType.Infantry, Faction.Player, {
            hp: 100, attack: 30, defense: 10, moveRange: 2, attackRange: 2,
        });
        archer.moveTo(2, 0);
        const enemy = new TroopUnit('e-target', TroopType.Infantry, Faction.Enemy, {
            hp: 100, attack: 30, defense: 10, moveRange: 0, attackRange: 1,
        });
        enemy.moveTo(2, 3);
        state.addUnit(archer);
        state.addUnit(enemy);

        const resolver = createResolver(state);
        assert.isTrue(resolver.buildAttackAction(archer) === null, '移動前距離 3，射程 2 不應有目標');

        moveUnit(state, archer, 2, 1);
        const action = resolver.buildAttackAction(archer);
        assert.isTrue(action !== null, '移動後距離 2，射程 2 應有目標');
        assert.equals(enemy.id, action!.targetId);
    });

    return suite;
}
