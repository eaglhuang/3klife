/**
 * RivalBreedingOutcome — 宿敵配種代價、雙峰 EP、狼性突變、混種奧義（doc_spec_0311；PROG-2-1938）
 */
import { assert, TestSuite } from './TestRunner';
import {
    hybridUltimateFor, resolveRivalBreeding, rivalChildEp, wolfMutationChance,
} from '../assets/scripts/core/systems/RivalBreedingOutcome';

export function createRivalBreedingOutcomeSuite(): TestSuite {
    const suite = new TestSuite('RivalBreedingOutcome (宿敵配種 doc_spec_0311 PROG-2-1938)');

    suite.test('TC-RIVAL-01 宿敵代價；非宿敵無修正', () => {
        const r = resolveRivalBreeding({ isRival: true, destinyRoll: 10, parentVitalityRatios: [1, 1] }, () => 0.99);
        assert.equals(0.7, r.conceptionRateMod);
        assert.equals(20, r.extraVitalityCost);
        assert.equals(-15, r.affinityCost);
        const n = resolveRivalBreeding({ isRival: false, destinyRoll: 99, parentVitalityRatios: [0, 0] }, () => 0);
        assert.equals(1, n.conceptionRateMod);
        assert.equals(0, n.epModifier);
        assert.isFalse(n.hasWolfGene);
    });

    suite.test('TC-RIVAL-02 EP 常態 -10、roll ≥ 80 淨 +15', () => {
        assert.equals(-10, resolveRivalBreeding({ isRival: true, destinyRoll: 79, parentVitalityRatios: [1, 1] }, () => 1).epModifier);
        assert.equals(15, resolveRivalBreeding({ isRival: true, destinyRoll: 80, parentVitalityRatios: [1, 1] }, () => 1).epModifier);
        assert.equals(75, rivalChildEp([80, 90], -10));
    });

    suite.test('TC-RIVAL-03 狼性 35%，雙親精力皆 < 40% 時 50%', () => {
        assert.equals(0.35, wolfMutationChance([0.5, 0.1]));
        assert.equals(0.5, wolfMutationChance([0.39, 0.1]));
        assert.isTrue(resolveRivalBreeding({ isRival: true, destinyRoll: 0, parentVitalityRatios: [1, 1] }, () => 0.34).hasWolfGene);
        assert.isFalse(resolveRivalBreeding({ isRival: true, destinyRoll: 0, parentVitalityRatios: [1, 1] }, () => 0.35).hasWolfGene);
        assert.isTrue(resolveRivalBreeding({ isRival: true, destinyRoll: 0, parentVitalityRatios: [0.1, 0.2] }, () => 0.49).hasWolfGene);
    });

    suite.test('TC-RIVAL-04 親密度 ≥ 80 且 EP ≥ 85 解鎖混種奧義，配方不分先後', () => {
        assert.equals('hybrid-ghost-eight-formation', hybridUltimateFor(['divine-calc', 'wolf-gaze'], 80, 85));
        assert.equals('hybrid-asura-slash', hybridUltimateFor(['demon-valor', 'ambitious-hero'], 90, 100));
        assert.equals(null, hybridUltimateFor(['wolf-gaze', 'divine-calc'], 79, 99));
        assert.equals(null, hybridUltimateFor(['wolf-gaze', 'divine-calc'], 99, 84));
        assert.equals(null, hybridUltimateFor(['wolf-gaze', 'iron-wall'], 99, 99));
    });

    return suite;
}
