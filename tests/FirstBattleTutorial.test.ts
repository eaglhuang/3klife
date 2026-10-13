/**
 * FirstBattleTutorial — 首戰教學戰提示順序的 headless 測試（PROG-2-0240，WBS OPEN-07）
 */
import { assert, TestSuite } from './TestRunner';
import {
    FIRST_BATTLE_BOARD,
    FRESH_FIRST_BATTLE_PROGRESS,
    currentFirstBattleHint,
    isFirstBattleTeachingDone,
    recordFirstBattleEvent,
} from '../assets/scripts/core/systems/FirstBattleTutorial';

export function createFirstBattleTutorialSuite(): TestSuite {
    const suite = new TestSuite('FirstBattleTutorial (首戰教學提示 OPEN-07)');

    suite.test('教學棋盤為 5 路 x 8 格（與正式戰場相同）', () => {
        assert.equals(5, FIRST_BATTLE_BOARD.lanes);
        assert.equals(8, FIRST_BATTLE_BOARD.depth);
    });

    suite.test('提示依序為部署 → 推進 → 對推，全部完成後為 null', () => {
        let p = FRESH_FIRST_BATTLE_PROGRESS;
        assert.equals('deploy', currentFirstBattleHint(p)?.step ?? '');
        p = recordFirstBattleEvent(p, 'deploy');
        assert.equals('advance', currentFirstBattleHint(p)?.step ?? '');
        p = recordFirstBattleEvent(p, 'advance');
        assert.equals('clash', currentFirstBattleHint(p)?.step ?? '');
        p = recordFirstBattleEvent(p, 'clash');
        assert.equals(null, currentFirstBattleHint(p));
        assert.isTrue(isFirstBattleTeachingDone(p));
    });

    suite.test('提示 key 為暫定格式 UI_TUTORIAL_HINT_<步驟>', () => {
        assert.equals('UI_TUTORIAL_HINT_DEPLOY', currentFirstBattleHint(FRESH_FIRST_BATTLE_PROGRESS)?.key ?? '');
    });

    suite.test('記錄事件不改原進度；重複事件不出錯', () => {
        const once = recordFirstBattleEvent(FRESH_FIRST_BATTLE_PROGRESS, 'deploy');
        const twice = recordFirstBattleEvent(once, 'deploy');
        assert.isFalse(FRESH_FIRST_BATTLE_PROGRESS.deployed, '原進度不被改寫');
        assert.isTrue(twice.deployed);
        assert.equals('advance', currentFirstBattleHint(twice)?.step ?? '');
    });

    suite.test('亂序事件仍記錄旗標，但提示只指向第一個未完成步驟', () => {
        const p = recordFirstBattleEvent(FRESH_FIRST_BATTLE_PROGRESS, 'clash');
        assert.isTrue(p.clashed);
        assert.equals('deploy', currentFirstBattleHint(p)?.step ?? '');
    });

    return suite;
}
