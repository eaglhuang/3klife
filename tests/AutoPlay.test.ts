/**
 * AutoPlay.test.ts — 戰場「自動」鈕改為自動代打（PROG-2-9707，使用者 2026-11-21 裁決）
 * 第一次按＝自動代打；再按＝跳過演出（極速決戰、cause 'auto'）；關委任＝停止自動代打。
 */
import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';
import {
    AUTO_PLAY_NO_SORTIE_LINE, AUTO_PLAY_OFF_LINE, AUTO_PLAY_ON_LINE, AUTO_PLAY_SKIP_LINE,
    AutoPlayState, delegateToggleStopsAutoPlay, shouldAutoEndTurn,
} from '../assets/scripts/core/systems/AutoPlay';
import { BATTLE_TURN_FLOW_TIMING } from '../assets/scripts/battle/views/BattlePresentationTiming';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

const idle = { active: true, battleEnded: false, isAdvancingTurn: false, waitingDuelPlacement: false, duelPanelActive: false };

export function createAutoPlaySuite(): TestSuite {
    const suite = new TestSuite('AutoPlay (自動代打 PROG-2-9707)');

    suite.test('文案常數：開啟／停止／跳過與使用者裁決一致', () => {
        assert.equals('自動代打：由 AI 部署並逐回合交戰，再按一次自動可跳過演出', AUTO_PLAY_ON_LINE);
        assert.equals('自動代打已停止，交還指揮權', AUTO_PLAY_OFF_LINE);
        assert.equals('跳過演出，極速決戰結算', AUTO_PLAY_SKIP_LINE);
        assert.isTrue(AUTO_PLAY_NO_SORTIE_LINE.includes('沒有出征軍勢'));
    });

    suite.test('第一次按＝開啟自動代打，再按＝跳過並結束自動代打', () => {
        const s = new AutoPlayState();
        assert.isFalse(s.active);
        assert.equals('start', s.press());
        assert.isTrue(s.active);
        assert.equals('skip', s.press());
        assert.isFalse(s.active);
    });

    suite.test('stop：開著回 true、沒開回 false，之後可重新開啟', () => {
        const s = new AutoPlayState();
        assert.isFalse(s.stop());
        s.press();
        assert.isTrue(s.stop());
        assert.isFalse(s.active);
        assert.equals('start', s.press());
    });

    suite.test('委任關閉時自動代打一併關閉；沒出征軍勢按委任亦同；沒開自動則不影響', () => {
        assert.isTrue(delegateToggleStopsAutoPlay(true, false, true));
        assert.isTrue(delegateToggleStopsAutoPlay(true, true, false));
        assert.isFalse(delegateToggleStopsAutoPlay(true, true, true));
        assert.isFalse(delegateToggleStopsAutoPlay(false, false, true));
        assert.isFalse(delegateToggleStopsAutoPlay(false, true, false));
    });

    suite.test('canDelegate=false（沒部署）時仍會自動結束回合；其餘情況不硬推', () => {
        // 判斷與 canDelegate 無關：只看自動代打旗標與回合／演出狀態
        assert.isTrue(shouldAutoEndTurn(idle));
        assert.isFalse(shouldAutoEndTurn({ ...idle, active: false }));
        assert.isFalse(shouldAutoEndTurn({ ...idle, battleEnded: true }));
        assert.isFalse(shouldAutoEndTurn({ ...idle, isAdvancingTurn: true }));
        assert.isFalse(shouldAutoEndTurn({ ...idle, waitingDuelPlacement: true }));
        assert.isFalse(shouldAutoEndTurn({ ...idle, duelPanelActive: true }));
    });

    suite.test('自動結束回合延遲約 1 秒', () => {
        assert.equals(1.0, BATTLE_TURN_FLOW_TIMING.autoPlayEndTurnDelaySec);
    });

    suite.test('接線：橋接層首按走委任、再按走極速決戰 cause auto、關委任停自動、戰鬥結束收掉', () => {
        const bridge = read('assets/scripts/battle/views/BattleUIBridge.ts');
        assert.isTrue(bridge.includes('this.autoPlay.press()'));
        assert.isTrue(bridge.includes('c.ctrl.setDelegateEnabled(true)'));
        assert.isTrue(bridge.includes("cause: 'auto'"));
        assert.isTrue(bridge.includes('private async _skipToQuickResolve('));
        assert.isTrue(bridge.includes('delegateToggleStopsAutoPlay('));
        assert.isTrue(bridge.includes('this.onAutoPlayStarted?.()'));
        assert.isTrue(bridge.includes('if (this.autoPlay.stop()) this._syncAutoButton()'));
        const flow = read('assets/scripts/battle/views/TurnFlowManager.ts');
        assert.isTrue(flow.includes('scheduleAutoPlayEndTurn'));
        assert.isTrue(flow.includes('autoPlayEndTurnDelaySec'));
    });

    suite.test('接線：兩個戰報面板都有 setAutoActive 同步按鈕，且按下只通知不自行翻狀態', () => {
        for (const rel of ['assets/scripts/ui/components/BattleLogPanel.ts', 'assets/scripts/ui/components/BattleLogComposite.ts']) {
            const src = read(rel);
            assert.isTrue(src.includes('public setAutoActive(active: boolean)'), rel);
            assert.isTrue(src.includes('EVENT_NAMES.AutoBattleToggled, true'), rel);
        }
    });

    // PROG-2-9711：試玩腳本每場只按一次 BtnAuto 開自動代打（再按一次會變極速決戰，不可以）；--no-auto-play 可關掉
    suite.test('試玩腳本每場只按一次 BtnAuto（不會誤觸極速決戰）', () => {
        const src = read('tools_node/playtest-online.js');
        assert.equals(1, src.split("clickButton('^BtnAuto$')").length - 1);
        assert.isTrue(src.includes("args['no-auto-play']"));
    });

    return suite;
}
