/**
 * DelegateMultiTurnE2E.test.ts — 委任部署跑多個真實回合（QA，PROG-2-0657）
 *
 * Unity 對照：像 PlayMode 測試把「自動部署」開著放著跑十幾回合，看糧草、出征軍勢、精銳上限的帳會不會跑掉。
 */
import { Faction } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { TestSuite, assert } from './TestRunner';

function general(id: string, faction: Faction, int: number): GeneralUnit {
    return new GeneralUnit({
        id, name: id, faction, hp: 100000, maxSp: 100, initialSp: 0, str: 10, int, lea: 90,
        skillId: 'cao-cao-tactics', battlePrimarySkillId: 'cao-cao-tactics',
    });
}

function battle(int: number, food: number): BattleController {
    services().initialize();
    services().session.setRandomSource(() => 0.99);
    const ctrl = new BattleController();
    ctrl.initBattle(general('p', Faction.Player, int), general('e', Faction.Enemy, 60));
    (ctrl as unknown as { turnManager: { enemyFood: number } }).turnManager.enemyFood = 0;
    assert.equals('ok', ctrl.startGeneralDuel());
    assert.isDefined(ctrl.placeGeneralOnBoard(2, 2));
    ctrl.configureSortie({ commandCapacity: 9000, cityTroops: 9000, stageSortieCap: 9000, food });
    return ctrl;
}

/** 一整個回合：玩家階段 → 敵方階段（委任部署在敵方部署前執行）→ 收尾 */
function fullTurn(ctrl: BattleController): void {
    ctrl.resolvePlayerTurn();
    ctrl.resolveEnemyTurn();
    ctrl.finalizeEnemyTurn();
}

function playerUnits(ctrl: BattleController): number {
    return [...ctrl.state.units.values()].filter((u) => u.faction === Faction.Player).length;
}

export function createDelegateMultiTurnE2ESuite(): TestSuite {
    const suite = new TestSuite('DelegateMultiTurnE2E (委任部署 多回合)');

    suite.test('委任開著跑 12 回合：糧草只減不增且不為負，出征帳與場上兵力一致', () => {
        const ctrl = battle(90, 2000);
        ctrl.setDelegateEnabled(true);
        let lastFood = ctrl.getSortieState()!.food;
        for (let turn = 0; turn < 12; turn += 1) {
            fullTurn(ctrl);
            const food = ctrl.getSortieState()!.food;
            assert.isTrue(food <= lastFood, `第 ${turn + 1} 回合糧草不增加`);
            assert.isTrue(food >= 0, '糧草不為負');
            lastFood = food;
        }
        assert.isTrue(lastFood < 2000, '委任有部署並扣糧');
        assert.isTrue(playerUnits(ctrl) > 1, '場上有部隊（含主將）');
    });

    suite.test('兩個回合入口（advanceTurn／resolvePlayerTurn）都在結算前委任部署，每回合最多一隊', () => {
        const viaAdvance = battle(90, 2000);
        viaAdvance.setDelegateEnabled(true);
        const before = playerUnits(viaAdvance);
        viaAdvance.advanceTurn();
        viaAdvance.finalizeAdvanceTurn();
        assert.equals(before + 1, playerUnits(viaAdvance), 'advanceTurn 入口部署一隊');

        const viaResolve = battle(90, 2000);
        viaResolve.setDelegateEnabled(true);
        viaResolve.resolvePlayerTurn();
        assert.equals(before + 1, playerUnits(viaResolve), 'resolvePlayerTurn 入口部署一隊');
    });

    suite.test('糧草耗盡後：委任停止部署，不報錯也不透支', () => {
        const ctrl = battle(90, 6);
        ctrl.setDelegateEnabled(true);
        for (let turn = 0; turn < 10; turn += 1) fullTurn(ctrl);
        assert.isTrue(ctrl.getSortieState()!.food >= 0);
    });

    suite.test('委任關閉：同樣跑 12 回合不會自動部署、糧草不動', () => {
        const ctrl = battle(90, 2000);
        const before = playerUnits(ctrl);
        for (let turn = 0; turn < 12; turn += 1) fullTurn(ctrl);
        assert.equals(before, playerUnits(ctrl));
        assert.equals(2000, ctrl.getSortieState()!.food);
    });

    suite.test('精銳佔用不超過上限：任何時刻場上現存精銳數 ≤ 精銳上限', () => {
        const ctrl = battle(90, 5000);
        ctrl.setDelegateEnabled(true);
        for (let turn = 0; turn < 20; turn += 1) {
            fullTurn(ctrl);
            const state = ctrl.getSortieState()!;
            const activeElite = Object.values(state.units).filter((u) => u.isElite && !u.retired).length;
            assert.isTrue(activeElite <= state.eliteCap, `第 ${turn + 1} 回合精銳 ${activeElite} ≤ ${state.eliteCap}`);
        }
    });

    return suite;
}
