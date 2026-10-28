/**
 * BlueFactorBreedE2E.test.ts — 藍色 3 星機率 × 真實結緣端到端（FORM-08，PROG-2-1292）headless 測試
 *
 * Unity 對照：像 PlayMode 測試，跑真正的 breed()，並在繼承入口攔截參數。
 * 鎖住：父母六維合計 < 600 時 breed() 交給繼承的藍色機率為 0；合計 ≥ 1100 時為 10%。
 * 機率在 breed() 內以父母合計算出（BreedingSystem.baseStatTotalOf），不是單一屬性。
 */
import { assert, TestSuite } from './TestRunner';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { breed, type BreedingGeneral } from '../assets/scripts/core/systems/BreedingSystem';
import * as FactorInheritanceModule from '../assets/scripts/core/systems/FactorInheritance';
import { buildFactorDictionary, type FactorDictionary } from '../assets/scripts/core/systems/FactorInheritance';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const dictionary: FactorDictionary = buildFactorDictionary(
    JSON.parse(fs.readFileSync(path.join(process.cwd(), 'assets/resources/data/master/gene-dictionary.json'), 'utf8')),
);

const SEED_COUNT = 300;

/** 可寫入的模組匯出物件：測試只在 try/finally 內暫時替換 inheritFactors */
const factorExports = FactorInheritanceModule as { inheritFactors: typeof FactorInheritanceModule.inheritFactors };

interface Stats { str: number; int: number; lea: number; pol: number; cha: number; luk: number }

/** 低：六維合計 180／人，父母合計 360（< 600，機率 0） */
const LOW: Stats = { str: 40, int: 30, lea: 30, pol: 20, cha: 40, luk: 20 };
/** 高：六維合計 1050／人，父母合計 2100（≥ 1100，機率 10%） */
const HIGH: Stats = { str: 200, int: 200, lea: 200, pol: 200, cha: 200, luk: 50 };

function makeParent(id: string, gender: '男' | '女', stats: Stats, genes: GeneralConfig['genes']): BreedingGeneral {
    return {
        id, name: id, faction: 'shu', gender, age: 30, hp: 1000, vitality: 100, maxVitality: 100, ...stats, genes,
    } as unknown as BreedingGeneral;
}

/** ggf → gf → dad；ggf 身上有藍色因子 gene_command（曾祖代，只能靠藍色機率抬星）；父母本身不帶藍色因子 */
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
    ggf: [{ id: 'gene_command', level: 1 }],
};

function lcg(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

function runWith(stats: Stats, seed: number) {
    return breed({
        father: makeParent('dad', '男', stats, [{ id: 'gene_strategy', level: 3 }]),
        mother: makeParent('mom', '女', stats, [{ id: 'gene_cavalry', level: 2 }]),
        pedigree: family(),
        random: lcg(seed),
        childId: 'baby',
        dictionary,
        rosterLookup: (uid) => (ancestorGenes[uid] ? ({ id: uid, genes: ancestorGenes[uid] } as unknown as GeneralConfig) : undefined),
    });
}

export function createBlueFactorBreedE2ESuite(): TestSuite {
    const suite = new TestSuite('BlueFactorBreedE2E (藍色 3 星 × 真實結緣 FORM-08 PROG-2-1292)');

    /**
     * 掃種子直到受孕成功，回傳 breed() 實際交給 inheritFactors 的藍色機率。
     * 直接攔截 inheritFactors 的 options：不靠統計次數，也不受野生基因與因子入池機率干擾。
     */
    function blueChanceSeenByBreed(stats: Stats): number | undefined {
        let seen: number | undefined;
        const original = factorExports.inheritFactors;
        factorExports.inheritFactors = (sources, options) => {
            seen = options.blueFactorChance;
            return original(sources, options);
        };
        try {
            for (let seed = 1; seed <= SEED_COUNT && seen === undefined; seed++) {
                runWith(stats, seed);
            }
        } finally {
            factorExports.inheritFactors = original;
        }
        return seen;
    }

    suite.test('父母合計 < 600：breed() 傳給繼承的藍色機率為 0', () => {
        assert.equals(0, blueChanceSeenByBreed(LOW));
    });

    suite.test('父母合計 ≥ 1100：breed() 傳給繼承的藍色機率為 10%（以父母六維合計計算）', () => {
        assert.equals(0.1, blueChanceSeenByBreed(HIGH));
    });

    return suite;
}
