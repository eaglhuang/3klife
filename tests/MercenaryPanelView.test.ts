/**
 * MercenaryPanelView.test.ts — 傭兵面板文字與按鈕狀態（MERC-07，PROG-2-0467）
 */
import { assert, TestSuite } from './TestRunner';
import { buildMercenaryPanelView } from '../assets/scripts/core/systems/MercenaryPanelView';
import { createTrialMercenary } from '../assets/scripts/core/systems/MercenaryBond';

const INPUT = { originalOwnerName: '曹操', generalName: '呂布', bondPoints: 0, rarity: 'SR' as const };

export function createMercenaryPanelViewSuite(): TestSuite {
    const suite = new TestSuite('MercenaryPanelView (MERC-07 傭兵面板文字與按鈕)');

    suite.test('試用中：倒數、結義進度與名牌文字依文案表產生，結義按鈕不可按', () => {
        const view = buildMercenaryPanelView(createTrialMercenary('m1'), INPUT);
        assert.equals('結義倒數：6 日', view.countdownText);
        assert.equals('結義進度：0/6', view.bondText);
        assert.equals('原主：曹操', view.nametagText);
        assert.equals(null, view.confirmText);
        assert.isFalse(view.bondEnabled);
    });

    suite.test('倒數歸零且點數足夠：可結義，確認文字顯示點數成本', () => {
        const ready = { ...createTrialMercenary('m1'), daysLeft: 0, bond: 6 };
        const view = buildMercenaryPanelView(ready, { ...INPUT, bondPoints: 300 });
        assert.isTrue(view.bondEnabled);
        assert.isFalse(view.insufficientPoints);
        assert.equals('消耗 300 結義點數，將 呂布 納為永久武將？', view.confirmText);
    });

    suite.test('倒數歸零但點數不足：結義按鈕不可按，並回報點數不足（不扣點）', () => {
        const ready = { ...createTrialMercenary('m1'), daysLeft: 0, bond: 6 };
        const view = buildMercenaryPanelView(ready, { ...INPUT, bondPoints: 299 });
        assert.isFalse(view.bondEnabled);
        assert.isTrue(view.insufficientPoints);
    });

    suite.test('已離隊：只回傳告別文字，結義按鈕不可按', () => {
        const expired = { ...createTrialMercenary('m1'), status: 'Expired' as const, daysLeft: 0 };
        const view = buildMercenaryPanelView(expired, INPUT);
        assert.equals('呂布 已離隊。六日情緣，且作追憶。', view.farewellText);
        assert.isFalse(view.bondEnabled);
    });

    return suite;
}
