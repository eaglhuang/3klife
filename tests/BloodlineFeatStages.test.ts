/**
 * BloodlineFeatStages — 五階奧義名聲事蹟點亮與升星消耗（doc_spec_0322；PROG-2-1948）
 */
import { assert, TestSuite } from './TestRunner';
import {
    BloodlineFeat, checkFeatStage, stageCapForStars, stageNodeState, starUpCost, addTemplateCard, templateCardStarUpProgress,
} from '../assets/scripts/core/systems/BloodlineFeatStages';

export function createBloodlineFeatStagesSuite(): TestSuite {
    const suite = new TestSuite('BloodlineFeatStages (五階血脈奧義 doc_spec_0322 PROG-2-1948)');

    suite.test('Cap 由星級決定；點亮需 Cap、名聲、事蹟三者皆達', () => {
        assert.equals(1, stageCapForStars(1));
        assert.equals(5, stageCapForStars(7));
        const feats = new Set<BloodlineFeat>(['FIRST_SORTIE_WIN']);
        const ok = checkFeatStage(0, 1, 100, feats);
        assert.isTrue(ok.ok && ok.stage === 1);
        const fame = checkFeatStage(0, 1, 99, feats);
        assert.isTrue(!fame.ok && fame.reason === 'FAME_SHORT');
        const cap = checkFeatStage(1, 1, 9999, feats);
        assert.isTrue(!cap.ok && cap.reason === 'CAP_LOCKED');
        const feat = checkFeatStage(1, 3, 300, feats);
        assert.isTrue(!feat.ok && feat.reason === 'FEAT_MISSING');
        const max = checkFeatStage(5, 5, 9999, feats);
        assert.isTrue(!max.ok && max.reason === 'ALREADY_MAX');
    });

    suite.test('命盤節點三態', () => {
        assert.equals('lit', stageNodeState(2, 2, 4));
        assert.equals('capOpen', stageNodeState(3, 2, 4));
        assert.equals('locked', stageNodeState(5, 2, 4));
    });

    suite.test('升星分流消耗', () => {
        const h = starUpCost(4, true);
        assert.isTrue(h !== null && h.kind === 'historical' && h.templateCards === 5 && h.soulStones === 200);
        const d = starUpCost(3, false);
        assert.isTrue(d !== null && d.kind === 'descendant' && d.lineageSeals === 4);
        assert.equals(null, starUpCost(5, false));
    });

    suite.test('同名卡升星：集滿才升 1 星並扣張數，滿星不變', () => {
        const first = addTemplateCard(1, 0);
        assert.equals(2, first.stars);
        assert.equals(0, first.cards);
        assert.isTrue(first.raised);
        const partial = addTemplateCard(3, 1);
        assert.equals(3, partial.stars);
        assert.equals(2, partial.cards);
        assert.equals(false, partial.raised);
        assert.equals(4, addTemplateCard(3, 2).stars);
        assert.equals(5, addTemplateCard(5, 0).stars);
        assert.equals(false, addTemplateCard(5, 0).raised);
        assert.equals(null, templateCardStarUpProgress(5, 0));
        assert.equals(5, templateCardStarUpProgress(4, 2)!.need);
    });

    return suite;
}
