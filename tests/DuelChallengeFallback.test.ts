/**
 * DuelChallengeFallback.test.ts — 單挑後備彈窗的文字組字（純函式）
 *
 * 鎖住：標題格式（敵將 X 向 Y 發起單挑）、勝算百分比四捨五入與夾值、NaN 視為 0。
 * 節點建立依賴 cc 執行期，不在單元測試內建立。
 */
import { assert, TestSuite } from './TestRunner';
import {
    formatDuelChallengeTitle,
    formatDuelWinRateText,
} from '../assets/scripts/battle/views/DuelChallengeFallback';

export function createDuelChallengeFallbackSuite(): TestSuite {
    const suite = new TestSuite('DuelChallengeFallback (單挑後備彈窗文字)');

    suite.test('標題格式為「敵將 X 向 Y 發起單挑！」', () => {
        assert.equals('敵將 呂布 向 關羽 發起單挑！', formatDuelChallengeTitle('呂布', '關羽'));
    });

    suite.test('勝算百分比四捨五入', () => {
        assert.equals('我方勝算約 65%', formatDuelWinRateText(0.65));
        assert.equals('我方勝算約 50%', formatDuelWinRateText(0.5));
        assert.equals('我方勝算約 33%', formatDuelWinRateText(1 / 3));
    });

    suite.test('勝算超出 0~1 時夾住，NaN 視為 0', () => {
        assert.equals('我方勝算約 100%', formatDuelWinRateText(1.5));
        assert.equals('我方勝算約 0%', formatDuelWinRateText(-0.2));
        assert.equals('我方勝算約 0%', formatDuelWinRateText(Number.NaN));
    });

    return suite;
}
