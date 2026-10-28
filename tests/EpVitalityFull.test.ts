/**
 * EpVitalityFull.test.ts — 爆發力「精力滿載 +10」（因子爆發系統 爆發力加分因子，PROG-2-1511）
 */
import {
    BloodlineGraph,
} from '../assets/scripts/core/services/BloodlineGraph';
import {
    EP_VITALITY_FULL_BONUS, isVitalityFull, previewBreedingEp, type BreedingGeneral,
} from '../assets/scripts/core/systems/BreedingSystem';
import { buildBreedingPreviewLines } from '../assets/scripts/ui/core/BreedingPreviewPresenter';
import { TestSuite, assert } from './TestRunner';

function general(id: string, gender: '男' | '女', vitality: number, maxVitality = 100): BreedingGeneral {
    return { id, name: id, gender, age: 25, vitality, maxVitality, stats: { luk: 0 } } as unknown as BreedingGeneral;
}

function previewEp(fatherVit: number, motherVit: number) {
    return previewBreedingEp({
        father: general('f', '男', fatherVit),
        mother: general('m', '女', motherVit),
        pedigree: new BloodlineGraph(),
    }).ep;
}

export function createEpVitalityFullSuite(): TestSuite {
    const suite = new TestSuite('EpVitalityFull (爆發力精力滿載 +10 PROG-2-1511)');

    suite.test('精力高段門檻：> 上限 50% 才算', () => {
        assert.isTrue(isVitalityFull(general('a', '男', 51)));
        assert.isTrue(!isVitalityFull(general('a', '男', 50)));
        assert.isTrue(!isVitalityFull(general('a', '男', 10, 0)), '上限無效視為未達');
    });

    suite.test('父母都在高段才 +10，計入總分', () => {
        const full = previewEp(80, 90);
        assert.equals(EP_VITALITY_FULL_BONUS, full.vitalityFull);
        assert.equals(60, full.ep);
        const half = previewEp(80, 50);
        assert.equals(0, half.vitalityFull);
        assert.equals(50, half.ep);
    });

    suite.test('預覽拆解行附加「精力 +10」', () => {
        assert.equals('共鳴 0　異脈 0　契合 0　精力 +10', buildBreedingPreviewLines(previewEp(80, 90)).breakdownLine);
        assert.equals('共鳴 0　異脈 0　契合 0', buildBreedingPreviewLines(previewEp(10, 90)).breakdownLine);
    });

    return suite;
}
