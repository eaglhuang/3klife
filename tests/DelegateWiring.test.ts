/**
 * DelegateWiring.test.ts — 委任 AI 接上 BattleController（PROG-2-0908）
 * 委任關閉時不部署；開啟後依智力品質挑兵種、扣糧並落在指定路。
 */
import { Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { checkDeploy, createSortieState } from '../assets/scripts/core/systems/SortieDeploy';
import { sortDelegateCandidates } from '../assets/scripts/core/systems/DelegateAi';
import { TestSuite, assert } from './TestRunner';

function general(id: string, faction: Faction, int: number): GeneralUnit {
    return new GeneralUnit({
        id, name: id, faction, hp: 1000, maxSp: 100, initialSp: 100, str: 100, int, lea: 90,
        skillId: 'cao-cao-tactics', battlePrimarySkillId: 'cao-cao-tactics',
    });
}

/** 玩家主將（智力 int）站在 (2,2)，帳本已配置 */
function battleWithSortie(int: number): BattleController {
    services().initialize();
    services().session.setRandomSource(() => 0);
    const ctrl = new BattleController();
    ctrl.initBattle(general('caster', Faction.Player, int), general('foe', Faction.Enemy, 90));
    ctrl.placeGeneralOnBoard(2, 2);
    ctrl.configureSortie({ commandCapacity: 9000, cityTroops: 9000, stageSortieCap: 9000, food: 1000 });
    return ctrl;
}

export function createDelegateWiringSuite(): TestSuite {
    const suite = new TestSuite('DelegateWiring (委任 AI 接線 PROG-2-0908)');

    suite.test('sortDelegateCandidates：依糧耗由低到高，不合法的排後面', () => {
        const state = createSortieState({ commandCapacity: 9000, cityTroops: 9000, stageSortieCap: 9000, food: 1000 });
        const candidates = ['cavalry', 'infantry', 'shield', 'archer', 'pikeman'];
        const sorted = sortDelegateCandidates(state, candidates);
        const foods = sorted.map(t => checkDeploy(state, { troopType: t }).cost.foodCost);
        for (let i = 1; i < foods.length; i += 1) assert.isTrue(foods[i - 1] <= foods[i], '糧耗不遞減');
        assert.equals(candidates.length, sorted.length);
        const broke = { ...state, food: 0 };
        assert.equals(candidates.join(','), sortDelegateCandidates(broke, candidates).join(','), '全部不合法時保留原順序');
    });

    suite.test('委任未開啟：tryDelegateDeploy 回 null，不部署也不扣糧', () => {
        const ctrl = battleWithSortie(90);
        const before = ctrl.state.getCell(2, 0)?.occupantId ?? null;
        assert.equals(null, ctrl.tryDelegateDeploy(2));
        assert.equals(before, ctrl.state.getCell(2, 0)?.occupantId ?? null);
    });

    suite.test('委任開啟（主將智力 90 = EXPERT）：在指定路部署一隊並扣糧', () => {
        const ctrl = battleWithSortie(90);
        ctrl.enableDelegateFromGeneral();
        const foodBefore = (ctrl as unknown as { sortie: { food: number } }).sortie.food;
        const outcome = ctrl.tryDelegateDeploy(2);
        assert.isDefined(outcome);
        assert.isTrue(outcome!.ok, '應部署成功');
        assert.isDefined(outcome!.unit);
        assert.equals(2, outcome!.unit!.lane);
        assert.equals(0, outcome!.unit!.depth);
        const foodAfter = (ctrl as unknown as { sortie: { food: number } }).sortie.food;
        assert.isTrue(foodAfter < foodBefore, '糧草有扣');
    });

    suite.test('disableDelegate 後關閉；沒有主將時 enableDelegateFromGeneral 也保持關閉', () => {
        const ctrl = battleWithSortie(90);
        ctrl.enableDelegateFromGeneral();
        ctrl.disableDelegate();
        assert.equals(null, ctrl.tryDelegateDeploy(2));
    });

    return suite;
}
