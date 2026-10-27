/**
 * OpeningIntroVortex.test.ts — 第一幕漩渦分鏡自動播放（PROG-2-1362）headless 測試
 *
 * 鎖住：只有漩渦分鏡自動播放；播放中按鈕停用；播完才自動翻到第一幕結束；
 * 點擊分鏡（信件）與古文、像素回憶不受 tick 影響；漩渦階段與 VortexTransition 一致。
 *
 * Unity 對照：EditMode Test 以假時間推進 Timeline 的播放頭，不實際等待 2.8 秒。
 */
import { assert, TestSuite } from './TestRunner';
import { OpeningIntroController } from '../assets/scripts/ui/core/OpeningIntroController';
import { vortexTransitionTotalMs } from '../assets/scripts/core/systems/VortexTransition';

function reachVortex(): OpeningIntroController {
    const intro = new OpeningIntroController();
    intro.next();
    intro.next();
    intro.next();
    return intro;
}

export function createOpeningIntroVortexSuite(): TestSuite {
    const suite = new TestSuite('OpeningIntroVortex (第一幕漩渦自動播放 PROG-2-1362)');

    suite.test('只有漩渦分鏡自動播放：古文、信件、像素回憶不自動播', () => {
        const intro = new OpeningIntroController();
        assert.isFalse(intro.autoPlaying);
        intro.next();
        assert.isFalse(intro.autoPlaying);
        intro.next();
        assert.isFalse(intro.autoPlaying);
        intro.next();
        assert.isTrue(intro.autoPlaying);
    });

    suite.test('漩渦播放中按鈕停用，標示頁數不變', () => {
        const intro = reachVortex();
        const view = intro.getFlowView();
        assert.isFalse(view.enabled.btnIntroNext);
        assert.equals('4 / 4', view.texts.introStep);
    });

    suite.test('播放未滿總時長前不翻頁，滿時長才結束第一幕', () => {
        const intro = reachVortex();
        const total = vortexTransitionTotalMs();
        assert.isFalse(intro.tick(total - 1));
        assert.equals(3, intro.index);
        assert.isTrue(intro.tick(1));
        assert.isTrue(intro.finished);
    });

    suite.test('非自動播放分鏡呼叫 tick 不動作', () => {
        const intro = new OpeningIntroController();
        assert.isFalse(intro.tick(999_999));
        assert.equals(0, intro.index);
        assert.isTrue(intro.getFlowView().enabled.btnIntroNext);
    });

    suite.test('漩渦階段：進入時為 dot，推進後依 VortexTransition 換到下一階段', () => {
        const intro = reachVortex();
        assert.equals('dot', intro.vortexState!.phase);
        intro.tick(450);
        assert.equals('spread', intro.vortexState!.phase);
    });

    suite.test('非漩渦分鏡的 vortexState 為 null', () => {
        const intro = new OpeningIntroController();
        assert.isTrue(intro.vortexState === null);
    });

    return suite;
}
