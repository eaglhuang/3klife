import { TestSuite, assert } from './TestRunner';
import {
    SCENE_GAMBIT_MAX_RATE,
    SCENE_GAMBIT_GATES,
    canTriggerSceneGambit,
    sceneGambitChanceFor,
    sceneGambitGateOf,
    sceneGambitSuccessRate,
} from '../assets/scripts/battle/shared/SceneGambitTrigger';
import { BattleTactic } from '../assets/scripts/core/config/Constants';
import { buildSceneGambitSummary } from '../assets/scripts/battle/views/BattleSceneGambitSummary';

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

    suite.test('六場景門檻照規格 B-3；一般戰鬥沒有門檻（PROG-2-1749）', () => {
        assert.equals(6, Object.keys(SCENE_GAMBIT_GATES).length);
        assert.equals(75, sceneGambitGateOf(BattleTactic.AmbushAttack)!.intThreshold);
        assert.equals(45, sceneGambitGateOf(BattleTactic.AmbushAttack)!.intelThreshold);
        assert.equals(40, sceneGambitGateOf(BattleTactic.NightRaid)!.intelThreshold);
        assert.equals(80, sceneGambitGateOf(BattleTactic.FloodAttack)!.intThreshold);
        assert.equals('SCENE_SIEGE', sceneGambitGateOf(BattleTactic.Siege)!.sceneId);
        assert.equals(null, sceneGambitGateOf(BattleTactic.Normal));
    });

    suite.test('查表判定：森林埋伏 INT 80、情報 45 → 60%；情報 44 → 0；一般戰鬥 → 0', () => {
        assert.equals(0.6, sceneGambitChanceFor(BattleTactic.AmbushAttack, 80, 45));
        assert.equals(0, sceneGambitChanceFor(BattleTactic.AmbushAttack, 80, 44));
        assert.equals(0.5, sceneGambitChanceFor(BattleTactic.Siege, 60, 0));
        assert.equals(0, sceneGambitChanceFor(BattleTactic.Normal, 99, 99));
    });

    suite.test('攻城戰有自己的摘要名稱', () => {
        assert.equals('攻城戰', buildSceneGambitSummary(BattleTactic.Siege)!.label);
    });

    return suite;
}
