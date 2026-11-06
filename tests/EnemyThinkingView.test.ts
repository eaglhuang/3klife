/**
 * EnemyThinkingView — 敵方回合「敵軍行動中…」提示（doc_ui_0001 §4.5，PROG-2-1891）
 *
 * 覆蓋：句尾點數循環、無效時間輸入保護、呼吸透明度範圍合理。
 *
 * Unity 對照：像測 Loading 指示器的 ViewModel，不需要場景或 UI。
 */
import { assert, TestSuite } from './TestRunner';
import {
    ENEMY_THINKING_BREATH, ENEMY_THINKING_DOT_STEP_SEC, enemyThinkingText,
} from '../assets/scripts/core/systems/EnemyThinkingView';

export function createEnemyThinkingViewSuite(): TestSuite {
    const suite = new TestSuite('EnemyThinkingView (敵軍行動中提示 doc_ui_0001 §4.5)');

    suite.test('句尾點數一、二、三點循環', () => {
        assert.equals('敵軍行動中.', enemyThinkingText(0));
        assert.equals('敵軍行動中..', enemyThinkingText(ENEMY_THINKING_DOT_STEP_SEC));
        assert.equals('敵軍行動中...', enemyThinkingText(ENEMY_THINKING_DOT_STEP_SEC * 2));
        assert.equals('敵軍行動中.', enemyThinkingText(ENEMY_THINKING_DOT_STEP_SEC * 3));
    });

    suite.test('負數或 NaN 視為剛開始', () => {
        assert.equals('敵軍行動中.', enemyThinkingText(-5));
        assert.equals('敵軍行動中.', enemyThinkingText(NaN));
    });

    suite.test('呼吸透明度範圍在 0~255 且最低值仍看得見', () => {
        assert.equals(true, ENEMY_THINKING_BREATH.minOpacity >= 100);
        assert.equals(true, ENEMY_THINKING_BREATH.maxOpacity <= 255);
        assert.equals(true, ENEMY_THINKING_BREATH.minOpacity < ENEMY_THINKING_BREATH.maxOpacity);
    });

    return suite;
}
