import { assert, TestSuite } from './TestRunner';
import { breed, checkBreedingEligibility } from '../assets/scripts/core/systems/BreedingSystem';
import type { BreedingGeneral } from '../assets/scripts/core/systems/BreedingSystem';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';

function living(id: string, gender: '男' | '女', extra: Partial<BreedingGeneral> = {}): BreedingGeneral {
    return {
        id, name: id, faction: 'shu', gender, age: 45, hp: 1000, maxLifespan: 70, vitality: 200, maxVitality: 200,
        ...extra,
    } as unknown as BreedingGeneral;
}

export function createPeaceLineageSuite(): TestSuite {
    const suite = new TestSuite('PeaceLineage (BRD-10 和平血統線)');

    suite.test('退役但仍為活體的武將可參與 Peace_Lineage 結緣（資格不因模式改變）', () => {
        const father = living('liu', '男', { status: 'retired' } as Partial<BreedingGeneral>);
        const mother = living('sun', '女', { age: 30 });
        const eligibility = checkBreedingEligibility(father, mother, new BloodlineGraph());
        assert.isTrue(eligibility.ok);
        const result = breed({
            father, mother, mode: 'Peace_Lineage', pedigree: new BloodlineGraph(),
            random: () => 0, childId: 'child-peace',
        });
        assert.equals('conceived', result.outcome);
        assert.equals('Peace_Lineage', result.breedingMode!);
    });

    suite.test('已卡片化（教官／支援卡）的武將不能走和平血統線結緣', () => {
        const father = living('liu', '男', { isMentorCard: true } as Partial<BreedingGeneral>);
        const mother = living('sun', '女', { age: 30 });
        const result = breed({
            father, mother, mode: 'Peace_Lineage', pedigree: new BloodlineGraph(),
            random: () => 0, childId: 'child-blocked',
        });
        assert.equals('blocked', result.outcome);
        assert.isTrue(result.reasons.includes('father-mentor-card'));
        assert.equals('Peace_Lineage', result.breedingMode!);
    });

    suite.test('不傳模式時視為 Standard', () => {
        const result = breed({
            father: living('liu', '男'), mother: living('sun', '女', { age: 30 }),
            pedigree: new BloodlineGraph(), random: () => 0, childId: 'child-std',
        });
        assert.equals('Standard', result.breedingMode!);
    });

    return suite;
}
