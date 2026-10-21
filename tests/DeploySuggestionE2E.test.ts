/**
 * DeploySuggestionE2E — 改派建議在真實 BattleController 部署流程的整合（QA，PROG-2-0636）
 *
 * Unity 對照：像在 PlayMode 裡真的點「部署」直到糧草不夠，看彈出的「可改派」建議，
 * 再真的點那個建議，確認它真的派得出去，而不是只在純函式裡成立。
 */
import { Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { TestSuite, assert } from './TestRunner';

function general(id: string, faction: Faction): GeneralUnit {
    return new GeneralUnit({
        id, name: id, faction, hp: 1000, maxSp: 100, initialSp: 0, str: 100, int: 60, lea: 90,
        skillId: 'cao-cao-tactics', battlePrimarySkillId: 'cao-cao-tactics',
    });
}

function battle(food: number): BattleController {
    services().initialize();
    services().session.setRandomSource(() => 0.99);
    const ctrl = new BattleController();
    ctrl.initBattle(general('p', Faction.Player), general('e', Faction.Enemy));
    (ctrl as unknown as { turnManager: { enemyFood: number } }).turnManager.enemyFood = 0;
    assert.equals('ok', ctrl.startGeneralDuel());
    assert.isDefined(ctrl.placeGeneralOnBoard(2, 2));
    ctrl.configureSortie({ commandCapacity: 9000, cityTroops: 9000, food });
    return ctrl;
}

export function createDeploySuggestionE2ESuite(): TestSuite {
    const suite = new TestSuite('DeploySuggestionE2E (改派建議 真實部署流程 PROG-2-0636)');

    suite.test('糧草只夠低耗兵種：騎兵被擋時建議的兵種，真的能在同一場部署出去', () => {
        // 騎兵糧耗 18、步兵 10（SortieDeploy BASE_DEPLOY_FOOD_COST）；糧草 17 只夠步兵
        const ctrl = battle(17);
        const denied = ctrl.tryDeployTroop(TroopType.Cavalry, 0);
        assert.isFalse(denied.ok);
        assert.isTrue(!!denied.reason, '有失敗原因');
        assert.isTrue(!!denied.suggestion, `應有改派建議：${JSON.stringify(denied)}`);
        assert.isFalse(denied.suggestion === TroopType.Cavalry, '不建議被擋的兵種');
        const retry = ctrl.tryDeployTroop(denied.suggestion as TroopType, 0);
        assert.isTrue(retry.ok, '建議的兵種真的能部署');
    });

    suite.test('糧草為 0：沒有任何可派兵種，建議為 null，不亂推薦', () => {
        const ctrl = battle(0);
        const denied = ctrl.tryDeployTroop(TroopType.Infantry, 0);
        assert.isFalse(denied.ok);
        assert.equals(null, denied.suggestion ?? null);
    });

    return suite;
}
