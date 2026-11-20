// @spec-source → PROG-2-9427 勝敗結算演出打磨
/**
 * BattleResultBeat.test.ts — 分出勝負先打勝敗橫幅停一拍再開結算窗；主動撤退立即開；離開戰場不再開窗。
 *
 * Unity 對照：驗 Coroutine 先播 Banner、WaitForSeconds 後才開結算面板。
 */
import { TestSuite, assert } from './TestRunner';
import { BATTLE_RESULT_BEAT, battleResultBannerOf, shouldHoldBeforeResult } from '../assets/scripts/battle/shared/BattleResultBeat';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
const { Node } = require('cc');
const { BattleUIBridge, createBattleSceneContext } = require('../assets/scripts/battle/views/BattleUIBridge');
const noop = () => undefined;

function makeBridge() {
    services().initialize();
    const shown: Array<{ result: string; generalId?: string; retreated?: boolean }> = [];
    const preloaded: Array<string | undefined> = [];
    const banners: Array<{ text: string; sec: number }> = [];
    const ctx = createBattleSceneContext();
    ctx.pg = { id: 'liu-bei' };
    ctx.resultPopup = {
        node: new Node('Result'),
        showResult: (result: string, _d?: string, generalId?: string, retreated?: boolean) => { shown.push({ result, generalId, retreated }); },
        preloadAvatar: (id?: string) => { preloaded.push(id); },
    };
    ctx.deployRuntime = { node: new Node('Deploy'), showToast: noop, showTurnBanner: (text: string, _c: unknown, sec: number) => { banners.push({ text, sec }); } };
    const bridge = new BattleUIBridge(ctx, {});
    bridge['_settleRosterBattle'] = () => [];
    bridge['appendLog'] = noop;
    bridge.refreshBattleViews = noop;
    return { bridge, shown, preloaded, banners };
}

export function createBattleResultBeatSuite(): TestSuite {
    const suite = new TestSuite('BattleResultBeat');

    suite.test('橫幅文字：勝利／敗北／回合用盡判敗顯示撤退／平手；未知結果不打橫幅', () => {
        assert.equals('勝利', battleResultBannerOf('player-win')?.text);
        assert.equals('敗北', battleResultBannerOf('enemy-win')?.text);
        assert.equals('撤退', battleResultBannerOf('enemy-win', true)?.text);
        assert.equals('平手', battleResultBannerOf('draw')?.text);
        assert.equals(null, battleResultBannerOf('???'));
        assert.isTrue(BATTLE_RESULT_BEAT.bannerSec * 1000 > BATTLE_RESULT_BEAT.popupDelayMs, '橫幅要撐到結算窗開出來');
    });

    suite.test('要不要停一拍：主動撤退不停；回合用盡（也帶 retreated）照樣停', () => {
        assert.isTrue(shouldHoldBeforeResult({}));
        assert.isTrue(!shouldHoldBeforeResult({ retreated: true }));
        assert.isTrue(shouldHoldBeforeResult({ retreated: true, timeUp: true }));
        assert.isTrue(shouldHoldBeforeResult({ retreated: true, cause: 'time-up' }));
    });

    suite.test('打贏：先打勝利橫幅並預載頭像，停頓後才開結算窗', () => {
        const { bridge, shown, preloaded, banners } = makeBridge();
        try {
            bridge['_onBattleEnded']({ result: 'player-win', cause: 'general' });
            assert.equals(0, shown.length, '停頓期間不開結算窗');
            assert.equals('勝利', banners[0]?.text);
            assert.equals(BATTLE_RESULT_BEAT.bannerSec, banners[0]?.sec);
            assert.equals('liu-bei', preloaded[0]);
            assert.isTrue(bridge['_flushResultBeat'](), '計時到點時開窗');
            assert.equals(1, shown.length);
            assert.equals('player-win', shown[0].result);
            assert.equals('liu-bei', shown[0].generalId);
            assert.isTrue(!bridge['_flushResultBeat'](), '只開一次');
        } finally { bridge.unsubscribeEvents(); }
    });

    suite.test('主動撤退：不打橫幅、立即開結算窗', () => {
        const { bridge, shown, banners } = makeBridge();
        try {
            bridge['_onBattleEnded']({ result: 'enemy-win', retreated: true });
            assert.equals(1, shown.length);
            assert.equals(true, shown[0].retreated);
            assert.equals(0, banners.length);
        } finally { bridge.unsubscribeEvents(); }
    });

    suite.test('停頓中離開戰場：不再開結算窗', () => {
        const { bridge, shown } = makeBridge();
        bridge['_onBattleEnded']({ result: 'enemy-win', cause: 'general' });
        bridge.unsubscribeEvents();
        assert.isTrue(!bridge['_flushResultBeat']());
        assert.equals(0, shown.length);
    });

    return suite;
}
