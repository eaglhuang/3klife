/**
 * PlaytestEndTurnFallback.test.ts — QA 腳本 endTurnFallbacks 計數規則（PROG-2-9803）
 * 推進中、單挑／奧義演出中、等待出陣、戰鬥結束時不計 fallback；只有可操作卻停住才計入。
 */
import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';

const { decideEndTurnAction } = require('../tools_node/playtest-end-turn-fallback') as {
    decideEndTurnAction: (input: { autoPlay: boolean; stalled: boolean; state: Record<string, unknown> | null }) => {
        click: boolean; count: boolean; unknownState: boolean; reason: string;
    };
};

const actionable = {
    advancing: false, duelPanel: false, ultCutin: false, waitingDuel: false,
    battleEnded: false, canAdvance: true, thinking: false,
};

export function createPlaytestEndTurnFallbackSuite(): TestSuite {
    const suite = new TestSuite('PlaytestEndTurnFallback (QA endTurnFallbacks 計數 PROG-2-9803)');

    suite.test('推進中停住也不計入 fallback，也不按結束回合', () => {
        const r = decideEndTurnAction({ autoPlay: true, stalled: true, state: { ...actionable, advancing: true, canAdvance: false } });
        assert.isFalse(r.click);
        assert.isFalse(r.count);
        assert.equals('turn-advancing', r.reason);
    });

    suite.test('自動代打未停住時不動作', () => {
        const r = decideEndTurnAction({ autoPlay: true, stalled: false, state: actionable });
        assert.isFalse(r.click);
        assert.isFalse(r.count);
    });

    suite.test('可操作卻停住超過門檻：補按並計入 fallback', () => {
        const r = decideEndTurnAction({ autoPlay: true, stalled: true, state: actionable });
        assert.isTrue(r.click);
        assert.isTrue(r.count);
        assert.equals('stalled-actionable', r.reason);
    });

    suite.test('單挑、奧義演出、等待出陣、戰鬥結束都不計入', () => {
        const busy: Array<[Record<string, unknown>, string]> = [
            [{ ...actionable, duelPanel: true }, 'duel-panel'],
            [{ ...actionable, ultCutin: true }, 'ult-cutin'],
            [{ ...actionable, waitingDuel: true }, 'waiting-duel-placement'],
            [{ ...actionable, battleEnded: true }, 'battle-ended'],
            [{ ...actionable, canAdvance: false }, 'cannot-advance'],
        ];
        for (const [state, reason] of busy) {
            const r = decideEndTurnAction({ autoPlay: true, stalled: true, state });
            assert.isFalse(r.count);
            assert.equals(reason, r.reason);
        }
    });

    suite.test('讀不到戰場狀態：仍按一次以免卡死，但不計 fallback，改記 unknownState', () => {
        const r = decideEndTurnAction({ autoPlay: true, stalled: true, state: null });
        assert.isTrue(r.click);
        assert.isFalse(r.count);
        assert.isTrue(r.unknownState);
    });

    suite.test('沒開自動代打時逐回合手按，不計 fallback', () => {
        const r = decideEndTurnAction({ autoPlay: false, stalled: false, state: null });
        assert.isTrue(r.click);
        assert.isFalse(r.count);
    });

    suite.test('playtest-online.js 接上新決策且保留「絕不再按自動鈕」規則', () => {
        const src = fs.readFileSync(path.join(__dirname, '..', 'tools_node', 'playtest-online.js'), 'utf8');
        assert.contains(src, "require('./playtest-end-turn-fallback')");
        assert.contains(src, 'decideEndTurnAction({ autoPlay, stalled, state: battleState })');
        assert.contains(src, 'presentation-timing.json');
        assert.contains(src, '絕不再按自動鈕');
    });

    return suite;
}
