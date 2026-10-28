/**
 * AiAdaptiveDifficulty.test.ts — 玩家連勝／連敗的 AI 難度自適應（AIS-11 / E-8、G-2）
 *
 * 鎖住：連 3 場才觸發、每次 ±0.1、夾在 0.7~2.5；平手打斷連勝連敗；
 * 存檔缺欄位、非整數、負數一律視為 0；上調與下調各有提示文案。
 *
 * Unity 對照：像 Difficulty Director 記下玩家最近幾場勝負，超過門檻才把敵人的 Stat 倍率往上或往下推一小步。
 */
import { assert, TestSuite } from './TestRunner';
import {
    ADAPTIVE_SCALE_MAX,
    ADAPTIVE_SCALE_MIN,
    EMPTY_AI_ADAPTIVE_STREAK,
    adaptiveHintOf,
    adaptiveScaleOf,
    nextAiAdaptiveStreak,
    normalizeAiAdaptiveStreak,
} from '../assets/scripts/core/systems/AiAdaptiveDifficulty';

export function createAiAdaptiveDifficultySuite(): TestSuite {
    const suite = new TestSuite('AiAdaptiveDifficulty (連勝連敗自適應 AIS-11 / E-8)');

    suite.test('沒有連勝連敗時維持基礎倍率', () => {
        assert.equals(1.0, adaptiveScaleOf(1.0, EMPTY_AI_ADAPTIVE_STREAK));
    });

    suite.test('連續 3 場勝利才上調 0.1；2 場不動', () => {
        assert.equals(1.1, adaptiveScaleOf(1.0, { consecutiveWins: 3, consecutiveLosses: 0 }));
        assert.equals(1.0, adaptiveScaleOf(1.0, { consecutiveWins: 2, consecutiveLosses: 0 }));
    });

    suite.test('連續 3 場失敗才下調 0.1（依註解與 G-2 文案：下調）', () => {
        assert.equals(0.9, adaptiveScaleOf(1.0, { consecutiveWins: 0, consecutiveLosses: 3 }));
        assert.equals(1.0, adaptiveScaleOf(1.0, { consecutiveWins: 0, consecutiveLosses: 2 }));
    });

    suite.test('結果夾在 0.7~2.5', () => {
        assert.equals(ADAPTIVE_SCALE_MAX, adaptiveScaleOf(2.5, { consecutiveWins: 9, consecutiveLosses: 0 }));
        assert.equals(ADAPTIVE_SCALE_MIN, adaptiveScaleOf(0.7, { consecutiveWins: 0, consecutiveLosses: 9 }));
    });

    suite.test('四捨五入到小數兩位，不會出現 1.1000000000000001 這類浮點誤差', () => {
        assert.equals(1.4, adaptiveScaleOf(1.3, { consecutiveWins: 3, consecutiveLosses: 0 }));
    });

    suite.test('勝利累加連勝並清掉連敗；失敗反之；平手兩者皆歸零', () => {
        const afterWin = nextAiAdaptiveStreak({ consecutiveWins: 2, consecutiveLosses: 0 }, 'player-win');
        assert.equals(3, afterWin.consecutiveWins);
        assert.equals(0, afterWin.consecutiveLosses);
        const afterLoss = nextAiAdaptiveStreak(afterWin, 'enemy-win');
        assert.equals(0, afterLoss.consecutiveWins);
        assert.equals(1, afterLoss.consecutiveLosses);
        const afterDraw = nextAiAdaptiveStreak({ consecutiveWins: 4, consecutiveLosses: 0 }, 'draw');
        assert.equals(0, afterDraw.consecutiveWins);
        assert.equals(0, afterDraw.consecutiveLosses);
    });

    suite.test('存檔讀回：缺值、null、非整數、負數一律視為 0；合法值保留', () => {
        assert.equals(0, normalizeAiAdaptiveStreak(undefined).consecutiveWins);
        assert.equals(0, normalizeAiAdaptiveStreak(null).consecutiveLosses);
        assert.equals(0, normalizeAiAdaptiveStreak({ consecutiveWins: -2, consecutiveLosses: 1.5 }).consecutiveWins);
        assert.equals(0, normalizeAiAdaptiveStreak({ consecutiveWins: -2, consecutiveLosses: 1.5 }).consecutiveLosses);
        const kept = normalizeAiAdaptiveStreak({ consecutiveWins: 4, consecutiveLosses: 0 });
        assert.equals(4, kept.consecutiveWins);
    });

    suite.test('提示文案：上調、下調各一句，沒有變化不給文案', () => {
        assert.equals('敵軍增援抵達，敵方士氣高漲！', adaptiveHintOf(1.0, 1.1)!);
        assert.equals('敵軍糧草不濟，士氣低落。', adaptiveHintOf(1.0, 0.9)!);
        assert.equals(null, adaptiveHintOf(1.0, 1.0));
    });

    return suite;
}
