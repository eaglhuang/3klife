/**
 * ScenePresetDeploy — 場景 preset 對精銳部署上限的影響（PROG-2-0926，DEP-12）
 *
 * 攻城戰（遭遇戰 battleKind = siege）→ SCENE_SIEGE → 精銳部署上限 +1（保留器械槽）。
 * 野戰或未設定 → 不影響部署上限。
 *
 * Unity 對照：像 Scene 的 SceneConfig 掛一個 preset 欄位，載入場景時把它餵給部署系統的 Rule。
 */
import { Faction } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { getEliteDeployCap, SCENE_PRESET_SIEGE, scenePresetIdOf } from '../assets/scripts/core/systems/SortieDeploy';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { TestSuite, assert } from './TestRunner';

function general(id: string, faction: Faction): GeneralUnit {
    return new GeneralUnit({
        id, name: id, faction, hp: 1000, maxSp: 100, initialSp: 0, str: 80, int: 80, lea: 80,
        skillId: 'cao-cao-tactics', battlePrimarySkillId: 'cao-cao-tactics',
    });
}

function sortieInput(scenePresetId: string | null) {
    return { commandCapacity: 9000, cityTroops: 9000, stageSortieCap: 9000, food: 2000, scenePresetId };
}

export function createScenePresetDeploySuite(): TestSuite {
    const suite = new TestSuite('ScenePresetDeploy (場景 preset 部署上限 DEP-12)');

    suite.test('遭遇戰種類推場景：攻城 → SCENE_SIEGE，野戰或未設定 → null', () => {
        assert.equals(SCENE_PRESET_SIEGE, scenePresetIdOf('siege'));
        assert.equals(null, scenePresetIdOf('field'));
        assert.equals(null, scenePresetIdOf(undefined));
        assert.equals(null, scenePresetIdOf(null));
    });

    suite.test('精銳部署上限：攻城場景 +1（4 → 5），其他場景不變', () => {
        assert.equals(4, getEliteDeployCap(null));
        assert.equals(5, getEliteDeployCap(SCENE_PRESET_SIEGE));
    });

    suite.test('出征軍勢：攻城場景的 eliteCap 為 5，野戰為 4', () => {
        services().initialize();
        const siegeCtrl = new BattleController();
        siegeCtrl.initBattle(general('p', Faction.Player), general('e', Faction.Enemy));
        assert.equals(5, siegeCtrl.configureSortie(sortieInput(scenePresetIdOf('siege'))).eliteCap);

        const fieldCtrl = new BattleController();
        fieldCtrl.initBattle(general('p', Faction.Player), general('e', Faction.Enemy));
        assert.equals(4, fieldCtrl.configureSortie(sortieInput(scenePresetIdOf('field'))).eliteCap);
    });

    return suite;
}
