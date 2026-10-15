import { TestSuite, assert } from './TestRunner';
import {
    SCENE_GAMBIT_MAX_RATE,
    canTriggerSceneGambit,
    sceneGambitSuccessRate,
} from '../assets/scripts/battle/shared/SceneGambitTrigger';

export function createSceneGambitTriggerSuite(): TestSuite {
    const suite = new TestSuite('SceneGambitTrigger (場景戰法發動判定 SCN-03)');

    suite.test('INT 等於門檻時成功率為 50%，每高 1 點 +2%', () => {
        assert.equals(0.5, sceneGambitSuccessRate(60, 60));
        assert.equals(0.52, sceneGambitSuccessRate(61, 60));
        assert.equals(0.7, sceneGambitSuccessRate(70, 60));
    });

    suite.test('成功率上限 95%', () => {
        assert.equals(0.95, SCENE_GAMBIT_MAX_RATE);
        assert.equals(0.95, sceneGambitSuccessRate(90, 60));
        assert.equals(0.95, sceneGambitSuccessRate(999, 0));
    });

    suite.test('INT 未達門檻時成功率為 0', () => {
        assert.equals(0, sceneGambitSuccessRate(59, 60));
    });

    suite.test('情報未達門檻時不可發動', () => {
        assert.equals(0, canTriggerSceneGambit(80, 60, 9, 10));
    });

    suite.test('INT 與情報都達門檻時回傳成功率', () => {
        assert.equals(0.7, canTriggerSceneGambit(70, 60, 10, 10));
        assert.equals(0, canTriggerSceneGambit(59, 60, 99, 10));
    });

    return suite;
}
