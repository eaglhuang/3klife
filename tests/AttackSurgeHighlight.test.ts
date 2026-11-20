// @spec-source → PROG-2-9422（Q-C1 選 A）
/**
 * AttackSurgeHighlight.test.ts — 高倍率攻擊頭頂數字分級：≥2 倍金、≥4 倍紅，門檻可由 JSON 調整。
 */
import {
    DEFAULT_ATTACK_SURGE_CONFIG,
    attackSurgeRatio,
    attackSurgeTier,
    parseAttackSurgeConfig,
} from '../assets/scripts/battle/shared/AttackSurgeHighlight';
import { TestSuite, assert } from './TestRunner';

export function createAttackSurgeHighlightSuite(): TestSuite {
    const suite = new TestSuite('AttackSurgeHighlight');

    suite.test('門檻邊界：未滿 2 倍不提示、剛好 2 倍金、剛好 4 倍紅', () => {
        assert.equals('none', attackSurgeTier(19, 10));
        assert.equals('gold', attackSurgeTier(20, 10));
        assert.equals('gold', attackSurgeTier(39, 10));
        assert.equals('red', attackSurgeTier(40, 10));
        assert.equals('red', attackSurgeTier(500, 10));
    });

    suite.test('減益與無變化不提示；基礎攻擊 0 或非數字視為 1 倍', () => {
        assert.equals('none', attackSurgeTier(5, 10));
        assert.equals('none', attackSurgeTier(10, 10));
        assert.equals(1, attackSurgeRatio(50, 0));
        assert.equals(1, attackSurgeRatio(Number.NaN, 10));
        assert.equals('none', attackSurgeTier(50, 0));
    });

    suite.test('設定檔：合法值照用，可調門檻', () => {
        const cfg = parseAttackSurgeConfig({ goldRatio: 3, redRatio: 6, pulsePeriodSec: 2 });
        assert.equals(3, cfg.goldRatio);
        assert.equals(6, cfg.redRatio);
        assert.equals(2, cfg.pulsePeriodSec);
        assert.equals('none', attackSurgeTier(25, 10, cfg));
        assert.equals('gold', attackSurgeTier(30, 10, cfg));
        assert.equals('red', attackSurgeTier(60, 10, cfg));
    });

    suite.test('設定檔：缺欄位、不合法、紅門檻不大於金門檻時退回預設', () => {
        const empty = parseAttackSurgeConfig(null);
        assert.equals(DEFAULT_ATTACK_SURGE_CONFIG.goldRatio, empty.goldRatio);
        assert.equals(DEFAULT_ATTACK_SURGE_CONFIG.redRatio, empty.redRatio);
        assert.equals(DEFAULT_ATTACK_SURGE_CONFIG.pulsePeriodSec, empty.pulsePeriodSec);
        const bad = parseAttackSurgeConfig({ goldRatio: 'x', redRatio: -1, pulsePeriodSec: 0 });
        assert.equals(2, bad.goldRatio);
        assert.equals(4, bad.redRatio);
        assert.equals(1.6, bad.pulsePeriodSec);
        const inverted = parseAttackSurgeConfig({ goldRatio: 5, redRatio: 3 });
        assert.equals(2, inverted.goldRatio);
        assert.equals(4, inverted.redRatio);
        const tooLow = parseAttackSurgeConfig({ goldRatio: 1, redRatio: 3 });
        assert.equals(2, tooLow.goldRatio);
    });

    suite.test('實際設定檔與預設一致（2／4／1.6）', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const raw = require('../assets/resources/data/attack-surge-highlight.json');
        const cfg = parseAttackSurgeConfig(raw);
        assert.equals(2, cfg.goldRatio);
        assert.equals(4, cfg.redRatio);
        assert.equals(1.6, cfg.pulsePeriodSec);
    });

    return suite;
}
