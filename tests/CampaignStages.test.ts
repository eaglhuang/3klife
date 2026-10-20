/**
 * 全球征途三階段列舉預留（MVP-13 / PROG-2-0809）
 *
 * 只鎖住：階段順序、MVP 只啟用第一階段、下一階段與未知 id 的回傳。
 */
import { assert, TestSuite } from './TestRunner';
import { CAMPAIGN_STAGE_IDS, enabledCampaignStages, getCampaignStage, nextCampaignStage } from '../assets/scripts/core/config/CampaignStages';

export function createCampaignStagesSuite(): TestSuite {
    const suite = new TestSuite('CampaignStages (全球征途階段列舉預留 MVP-13)');

    suite.test('階段順序與規格一致：中原統一 → 邊境征伐 → 全球遠征', () => {
        assert.equals(JSON.stringify(['central-unification', 'border-campaign', 'global-expedition']), JSON.stringify([...CAMPAIGN_STAGE_IDS]));
    });

    suite.test('MVP 只啟用第一階段，第二、三階段僅預留', () => {
        const enabled = enabledCampaignStages().map(stage => stage.id);
        assert.equals(JSON.stringify(['central-unification']), JSON.stringify(enabled));
        assert.isFalse(getCampaignStage('border-campaign')!.enabled);
        assert.isFalse(getCampaignStage('global-expedition')!.enabled);
    });

    suite.test('下一階段：依序前進；最後一階段與未知 id 回傳 null', () => {
        assert.equals('border-campaign', nextCampaignStage('central-unification')!.id);
        assert.equals('global-expedition', nextCampaignStage('border-campaign')!.id);
        assert.equals(null, nextCampaignStage('global-expedition'));
        assert.equals(null, nextCampaignStage('no-such-stage'));
    });

    return suite;
}
