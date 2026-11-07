/**
 * TallyScenePreset — 場景部署權重與虎符糧耗（doc_spec_0313；PROG-2-2005）
 */
import { assert, TestSuite } from './TestRunner';
import {
    canAffordTallyDeploy, meetsSceneReservation, rankUnitsForScene, sceneReservedSlot, sceneUnitWeight, specTallyDeployGrainCost,
} from '../assets/scripts/core/systems/TallyScenePreset';

export function createTallyScenePresetSuite(): TestSuite {
    const suite = new TestSuite('TallyScenePreset (場景部署 preset doc_spec_0313 PROG-2-2005)');

    suite.test('場景權重 +30% / -20%；無場景為 1', () => {
        assert.equals(1.3, sceneUnitWeight('SCENE_SIEGE', 'shield'));
        assert.equals(0.8, sceneUnitWeight('SCENE_SIEGE', 'CAVALRY'));
        assert.equals(1.3, sceneUnitWeight('SCENE_PLAINS', 'CAVALRY'));
        assert.equals(0.8, sceneUnitWeight('SCENE_NAVAL', 'SHIELD'));
        assert.equals(1, sceneUnitWeight(null, 'CAVALRY'));
        assert.equals(1, sceneUnitWeight('SCENE_UNKNOWN', 'CAVALRY'));
    });

    suite.test('強制保留槽位與排序', () => {
        assert.equals('SIEGE', sceneReservedSlot('SCENE_SIEGE'));
        assert.equals(null, sceneReservedSlot('SCENE_PLAINS'));
        assert.isFalse(meetsSceneReservation('SCENE_NAVAL', ['CAVALRY', 'ARCHER']));
        assert.isTrue(meetsSceneReservation('SCENE_NAVAL', ['navy']));
        assert.isTrue(meetsSceneReservation('SCENE_MOUNTAIN', []));
        const r = rankUnitsForScene('SCENE_MOUNTAIN', ['CAVALRY', 'INFANTRY', 'ARCHER']);
        assert.equals('ARCHER,INFANTRY,CAVALRY', r.join(','));
    });

    suite.test('糧耗公式與糧草判定', () => {
        assert.equals(100, specTallyDeployGrainCost('R', 0));
        assert.equals(145, specTallyDeployGrainCost('R', 3));
        assert.equals(350, specTallyDeployGrainCost('SR', 5));
        assert.equals(507, specTallyDeployGrainCost('SSR', 3));
        assert.equals(612, specTallyDeployGrainCost('SSR', 5));
        assert.equals(null, specTallyDeployGrainCost('UR', 1));
        assert.isTrue(canAffordTallyDeploy(145, 145));
        assert.isFalse(canAffordTallyDeploy(144, 145));
        assert.isFalse(canAffordTallyDeploy(9999, null));
    });

    return suite;
}
