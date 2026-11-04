/**
 * BloodlineBirthLines.test.ts — 結緣出生的血統提示句（血統理論 §G、§H，PROG-2-1775）
 *
 * Unity 對照：EditMode Test，驗句子挑選、Wild Gene 標記與結緣流程提示，不開 Scene。
 */
import { assert, TestSuite } from './TestRunner';
import { InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { BreedingService } from '../assets/scripts/core/services/BreedingService';
import { ancestorGhostLine, BLOODLINE_RESONANCE_LINE, bloodlineBirthLines, WILD_GENE_LINE } from '../assets/scripts/core/systems/BloodlineBirthLines';
import { applyWildGeneMutation, type BreedingGeneral } from '../assets/scripts/core/systems/BreedingSystem';
import type { InheritedFactor } from '../assets/scripts/core/systems/FactorInheritance';

function factor(generation: 1 | 2 | 3, sourceUids: string[], extra: Partial<InheritedFactor> = {}): InheritedFactor {
    return { id: 'gene_x', color: 'blue', level: 3, generation, sourceUids, ...extra };
}

function general(id: string, gender: '男' | '女'): BreedingGeneral {
    return { id, name: id, faction: 'shu', gender, age: 30, hp: 1000, vitality: 100, maxVitality: 100, str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40 } as unknown as BreedingGeneral;
}

export function createBloodlineBirthLinesSuite(): TestSuite {
    const suite = new TestSuite('BloodlineBirthLines');
    const names: Record<string, string> = { yun: '趙雲', fei: '張飛' };
    const nameOf = (uid: string): string | null => names[uid] ?? null;

    suite.test('顯靈挑世代最遠且查得到姓名的祖先；只繼承父母不顯靈', () => {
        assert.equals(ancestorGhostLine('趙雲'), bloodlineBirthLines({ factors: [factor(2, ['fei']), factor(3, ['nobody', 'yun'])] }, nameOf)[0]);
        assert.equals(0, bloodlineBirthLines({ factors: [factor(1, ['yun'])] }, nameOf).length);
        assert.equals(0, bloodlineBirthLines({ factors: [factor(3, ['nobody'])] }, nameOf).length);
    });

    suite.test('共鳴與突變各自成句，且不提因子名', () => {
        const lines = bloodlineBirthLines({ ep: { resonance: 15 }, factors: [factor(1, ['yun'], { wildGene: true })] }, nameOf);
        assert.equals(`${BLOODLINE_RESONANCE_LINE}|${WILD_GENE_LINE}`, lines.join('|'));
        assert.isFalse(lines.join('').includes('gene_x'));
    });

    suite.test('Wild Gene 只在真的跳星時標記', () => {
        assert.isTrue(applyWildGeneMutation([factor(2, ['yun'])], () => 0)[0].wildGene === true);
        assert.isTrue(applyWildGeneMutation([factor(2, ['yun'])], () => 0.99)[0].wildGene === undefined);
        assert.isTrue(applyWildGeneMutation([factor(2, ['yun'], { level: 5 })], () => 0)[0].wildGene === undefined);
    });

    suite.test('祖先姓名：虛擬祖先與查不到的回傳 null', () => {
        const graph = new BloodlineGraph();
        const service = new BreedingService(new InMemoryRosterStore([general('liu', '男')]), graph);
        service.ensureFounderAncestry();
        const father = graph.getParents('liu').father;
        assert.isTrue(father !== null && service.ancestorName(father) === null);
        assert.equals('liu', service.ancestorName('liu'));
        assert.isTrue(service.ancestorName('nobody') === null);
    });

    return suite;
}
