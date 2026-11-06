/**
 * TurnBanner.test.ts — 回合開始橫幅文字、配色與去抖（主戰場UI規格書 doc_ui_0001，PROG-2-1888）
 *
 * Unity 對照：EditMode 測試 static class 的顯示資料與節流。
 */
import { Faction } from '../assets/scripts/core/config/Constants';
import { claimTurnBannerSlot, turnBannerOf, type TurnBannerClock } from '../assets/scripts/battle/shared/TurnBanner';
import { assert, TestSuite } from './TestRunner';

export function createTurnBannerSuite(): TestSuite {
    const suite = new TestSuite('TurnBanner (回合開始橫幅 PROG-2-1888)');

    suite.test('我方藍字、敵方紅字', () => {
        assert.equals('我方回合開始', turnBannerOf(Faction.Player).text);
        assert.equals('敵方回合開始', turnBannerOf(Faction.Enemy).text);
        assert.equals(90, turnBannerOf(Faction.Player).rgba[0]);
        assert.equals(255, turnBannerOf(Faction.Enemy).rgba[0]);
    });

    suite.test('第一次一定顯示；去抖時間內的第二次被擋下', () => {
        const clock: TurnBannerClock = {};
        assert.equals(true, claimTurnBannerSlot(1000, 2500, clock));
        assert.equals(false, claimTurnBannerSlot(3000, 2500, clock));
        assert.equals(1000, clock.__lastTurnBannerTime);
    });

    suite.test('超過去抖時間後可再顯示（敵方橫幅之後接我方橫幅）', () => {
        const clock: TurnBannerClock = {};
        assert.equals(true, claimTurnBannerSlot(0, 2500, clock));
        assert.equals(true, claimTurnBannerSlot(4300, 2500, clock));
        assert.equals(4300, clock.__lastTurnBannerTime);
    });

    return suite;
}
