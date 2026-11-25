/**
 * BannerPlacement — 戰場橫幅不蓋 HUD 保留區（PROG-2-10025）
 * 橫幅尺寸取實測值：提示條 800x112、招式名橫幅 760x96（設計解析度 1920x1080）。
 */
import { assert, TestSuite } from './TestRunner';
import { BATTLE_BANNER_LAYOUT } from '../assets/scripts/core/data/BattleBannerLayoutData';
import { bannerCenterOffset, bannerRatioRect, reservedHits } from '../assets/scripts/core/systems/BannerPlacement';

export function createBannerPlacementSuite(): TestSuite {
    const suite = new TestSuite('BannerPlacement (戰場橫幅避開 HUD 保留區)');

    const cases: Array<[string, number, number]> = [['1920x1080 橫向', 1920, 1080], ['480x270 橫向', 480, 270]];
    for (const [label, w, h] of cases) {
        // 480x270 是等比縮放：橫幅尺寸同比例縮小
        const k = w / 1920;
        suite.test(`${label}：提示條不壓任何保留區`, () => {
            const r = bannerRatioRect(BATTLE_BANNER_LAYOUT.toast, w, h, 800 * k, 112 * k);
            assert.equals(0, reservedHits(r, BATTLE_BANNER_LAYOUT.reserved).length);
        });
        suite.test(`${label}：招式名橫幅不壓任何保留區`, () => {
            const r = bannerRatioRect(BATTLE_BANNER_LAYOUT.skillBanner, w, h, 760 * k, 96 * k);
            assert.equals(0, reservedHits(r, BATTLE_BANNER_LAYOUT.reserved).length);
        });
    }

    suite.test('錨點換算：貼頂時中心在容器上半，貼底時在下半', () => {
        assert.isTrue(bannerCenterOffset({ anchor: 'top', insetRatio: 0.1, xOffsetRatio: 0 }, 1000, 500, 50).y > 0);
        assert.isTrue(bannerCenterOffset({ anchor: 'bottom', insetRatio: 0.1, xOffsetRatio: 0 }, 1000, 500, 50).y < 0);
    });

    suite.test('壓到保留區時會回報名稱（檢查本身有效）', () => {
        const r = bannerRatioRect({ anchor: 'top', insetRatio: 0.17, xOffsetRatio: 0 }, 1920, 1080, 800, 112);
        assert.isTrue(reservedHits(r, BATTLE_BANNER_LAYOUT.reserved).includes('coachTab'));
    });

    return suite;
}
