/**
 * PROG-2-1166：LUK 上限依紫因子計算（LUK-03）
 * 運氣系統 §F：LUK_Max = 50 + Purple_Gene_Level × 10，★5 紫因子 → 100。
 */

import { assert, TestSuite } from './TestRunner';
import { LUK_BASE_MAX, LUK_MAX, lukMaxForGenes } from '../assets/scripts/core/systems/LuckThresholds';
import { createChild, type BreedingGeneral } from '../assets/scripts/core/systems/BreedingSystem';
import { createEmptyPedigree } from '../assets/scripts/core/services/BloodlineGraph';

function parent(id: string, gender: '男' | '女', luk: number): BreedingGeneral {
    return {
        id, name: id, faction: 'shu', gender, age: 30, hp: 1000, vitality: 100, maxVitality: 100,
        str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk,
    } as unknown as BreedingGeneral;
}

function child(luk: number, purpleLevel: number): BreedingGeneral {
    return createChild({
        id: 'kid',
        father: parent('f', '男', luk),
        mother: parent('m', '女', luk),
        ep: { ep: 100, rating: 'A' } as never,
        factors: purpleLevel > 0 ? [{ id: 'gene_luck', color: 'purple', level: purpleLevel, generation: 1, sourceUids: ['f'] }] as never : [],
        pedigree: createEmptyPedigree(),
        random: () => 0.1,
    });
}

export function createLuckMaxPurpleSuite(): TestSuite {
    const suite = new TestSuite('LuckMaxPurple');

    suite.test('lukMaxForGenes：無紫因子 50，每級 +10，上限 100', () => {
        assert.equals(LUK_BASE_MAX, lukMaxForGenes([]));
        assert.equals(LUK_BASE_MAX, lukMaxForGenes(undefined));
        assert.equals(LUK_BASE_MAX, lukMaxForGenes([{ id: 'gene_command', level: 5 }]), '非紫色基因不算');
        assert.equals(80, lukMaxForGenes([{ id: 'gene_luck', level: 3 }]));
        assert.equals(LUK_MAX, lukMaxForGenes([{ id: 'gene_destiny', level: 5 }]));
        assert.equals(LUK_MAX, lukMaxForGenes([{ id: 'gene_destiny', level: 9 }]), '超過 ★5 仍為 100');
    });

    suite.test('lukMaxForGenes：多個紫因子取最高等級；鎖定的也算', () => {
        assert.equals(70, lukMaxForGenes([{ id: 'gene_luck', level: 1 }, { id: 'gene_destiny', level: 2 }]));
        assert.equals(70, lukMaxForGenes([{ id: 'gene_luck', level: 2, isLocked: true }]));
    });

    suite.test('createChild：子嗣 LUK 依自身紫因子封頂', () => {
        assert.equals(50, child(90, 0).luk, '無紫因子封頂 50');
        assert.equals(80, child(90, 3).luk, '★3 紫因子封頂 80');
        assert.equals(40, child(40, 0).luk, '未達上限不變');
    });

    return suite;
}
