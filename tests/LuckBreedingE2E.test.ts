/**
 * LuckBreedingE2E — 運氣門檻 × 真實結緣 × 真實因子字典端到端（QA，PROG-2-0627）
 *
 * Unity 對照：像 PlayMode 測試，跑真正的 breed()，用一組固定亂數種子掃過去，
 * 驗 LUK=100 時曾祖代因子一定被額外送出、不重複、星級不超過字典上限，而 LUK 低的父母沒有這個保證。
 */
import { assert, TestSuite } from './TestRunner';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { breed, type BreedingGeneral } from '../assets/scripts/core/systems/BreedingSystem';
import { buildFactorDictionary, type FactorDictionary } from '../assets/scripts/core/systems/FactorInheritance';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const dictionary: FactorDictionary = buildFactorDictionary(
    JSON.parse(fs.readFileSync(path.join(process.cwd(), 'assets/resources/data/master/gene-dictionary.json'), 'utf8')),
);

function makeParent(id: string, gender: '男' | '女', luk: number, genes: GeneralConfig['genes']): BreedingGeneral {
    return {
        id, name: id, faction: 'shu', gender, age: 30, hp: 1000, vitality: 100, maxVitality: 100,
        str: 80, int: 60, lea: 70, pol: 50, cha: 100, luk, genes,
    } as unknown as BreedingGeneral;
}

/** ggf → gf → dad；mom 沒有上代。曾祖代（第 3 世代）只有 ggf，身上有 gene_honor */
function family(): BloodlineGraph {
    const graph = new BloodlineGraph();
    const person = (uid: string) => ({ uid, template_id: null, name: uid, gene_refs: [] as string[], ep_base: 50, faction: 'shu', is_virtual: false });
    graph.loadFromData({
        version: 't', updatedAt: 't',
        persons: ['ggf', 'gf', 'dad', 'mom'].map(person),
        links: [
            { child_uid: 'gf', parent_uid: 'ggf', relation: 'F', generation: 1 },
            { child_uid: 'dad', parent_uid: 'gf', relation: 'F', generation: 1 },
        ],
    });
    return graph;
}

const ancestorGenes: Record<string, GeneralConfig['genes']> = {
    ggf: [{ id: 'gene_honor', level: 3 }],
};

function lcg(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

function run(luk: number, seed: number) {
    return breed({
        father: makeParent('dad', '男', luk, [{ id: 'gene_command', level: 3 }]),
        mother: makeParent('mom', '女', luk, [{ id: 'gene_cavalry', level: 2 }]),
        pedigree: family(),
        random: lcg(seed),
        childId: 'baby',
        dictionary,
        rosterLookup: (uid) => (ancestorGenes[uid] ? ({ id: uid, genes: ancestorGenes[uid] } as unknown as GeneralConfig) : undefined),
    });
}

export function createLuckBreedingE2ESuite(): TestSuite {
    const suite = new TestSuite('LuckBreedingE2E (運氣門檻 × 真實結緣)');

    suite.test('LUK=100：每個受孕成功的子嗣都帶曾祖代因子，因子不重複、星級不超過字典上限', () => {
        let conceived = 0;
        for (let seed = 1; seed <= 200; seed++) {
            const result = run(100, seed);
            if (result.outcome !== 'conceived') continue;
            conceived++;
            const ids = (result.child!.genes ?? []).map((g) => g.id);
            assert.isTrue(ids.includes('gene_honor'), `seed ${seed} 缺曾祖代因子`);
            assert.equals(ids.length, new Set(ids).size, `seed ${seed} 因子重複`);
            for (const gene of result.child!.genes ?? []) {
                const max = dictionary.get(gene.id!)?.maxLevel ?? 5;
                assert.isTrue((gene.level ?? 1) <= max, `seed ${seed} ${gene.id} 星級超過上限`);
            }
            assert.isTrue(result.luckEffects?.fateInheritance === true);
        }
        assert.isTrue(conceived >= 20, `受孕成功只有 ${conceived} 次，種子掃描太少`);
    });

    suite.test('LUK=40 對照：沒有天命傳承旗標，曾祖代因子不保證出現', () => {
        let withoutHonor = 0;
        for (let seed = 1; seed <= 200; seed++) {
            const result = run(40, seed);
            if (result.outcome !== 'conceived') continue;
            assert.isFalse(result.luckEffects?.fateInheritance === true);
            if (!(result.child!.genes ?? []).some((g) => g.id === 'gene_honor')) withoutHonor++;
        }
        assert.isTrue(withoutHonor > 0, 'LUK=40 全部都有曾祖代因子，對照組失去意義');
    });

    return suite;
}
