// @spec-source → 官職系統.md (doc_spec_0014) E-6 升官動畫；PROG-2-1859
import { TestSuite, assert } from './TestRunner';
import { OFFICER_PROMOTION_FREEZE_TIMING, officerPromotionFreezeTitles } from '../assets/scripts/core/systems/HallMissionSettlement';
import { OFFICER_TIER_TITLES } from '../assets/scripts/core/systems/OfficerDisplay';

export function createOfficerPromotionFreezeSuite(): TestSuite {
    const suite = new TestSuite('OfficerPromotionFreeze');

    suite.test('每升一階一個大字，由低到高，不帶獎勵金額', () => {
        const titles = officerPromotionFreezeTitles([2, 3]);
        assert.equals(2, titles.length);
        assert.equals(`晉升 ${OFFICER_TIER_TITLES[1]}`, titles[0]);
        assert.equals(`晉升 ${OFFICER_TIER_TITLES[2]}`, titles[1]);
        assert.isFalse(titles[0].includes('金錢'));
    });

    suite.test('有階位表時用表上的官名；沒有晉升時不播', () => {
        const rows = [{ tier: 2, title: '主簿' }] as unknown as Parameters<typeof officerPromotionFreezeTitles>[1];
        assert.equals('晉升 主簿', officerPromotionFreezeTitles([2], rows)[0]);
        assert.equals(0, officerPromotionFreezeTitles([]).length);
    });

    suite.test('演出時序：先淡入再停留後淡出，總長不超過 3 秒', () => {
        const t = OFFICER_PROMOTION_FREEZE_TIMING;
        assert.isTrue(t.hold > t.fadeIn && t.popScaleFrom > 1);
        assert.isTrue(t.fadeIn + t.hold + t.fadeOut <= 3);
    });

    return suite;
}
