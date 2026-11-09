/**
 * 粉色因子→地形適性接線（APT-09 / PROG-2-0412）
 *
 * 覆蓋：粉色因子覆寫地形適性、14 人血統同因子升級、不改來源、GeneralUnit 經由戰場 profile 讀到因子。
 */
import { assert, TestSuite } from './TestRunner';
import {
    applyPinkTerrainAptitude,
    battleAptitudeProfileOf,
    resolveAptitude,
} from '../assets/scripts/core/systems/BattleAptitude';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { Faction, TerrainType } from '../assets/scripts/shared/CommonEnums';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { breed, pinkFactorAncestorCounts, type BreedingGeneral, type PedigreeSource } from '../assets/scripts/core/systems/BreedingSystem';
import { createEmptyPedigree } from '../assets/scripts/core/services/BloodlineGraph';
import { normalizeRosterRoles } from '../assets/scripts/core/systems/RosterRoleLoad';
import { buildFactorDictionary } from '../assets/scripts/core/systems/FactorInheritance';
import * as fs from 'fs';
import * as path from 'path';

const dictionary = buildFactorDictionary(JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'assets/resources/data/master/gene-dictionary.json'), 'utf8')));

/** 父方往上三人都在族譜上，全部攜帶水戰因子；加上父母本人共 5 位祖先 */
const FATHER_LINE: PedigreeSource = {
    getPedigree: (uid) => (uid === 'dad' ? { ...createEmptyPedigree(), F: 'a1', M: 'a2', FF: 'a3' } : createEmptyPedigree()),
    getPerson: (uid) => ({ uid, template_id: null, name: uid, gene_refs: ['gene_naval'], ep_base: 50, faction: 'shu', is_virtual: true }) as never,
    commonAncestorDistance: () => null,
};

function parent(id: string, gender: '男' | '女'): BreedingGeneral {
    return { id, name: id, faction: 'shu', gender, age: 30, hp: 1000, vitality: 100, maxVitality: 100, str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40 } as unknown as BreedingGeneral;
}

export function createPinkTerrainAptitudeSuite(): TestSuite {
    const suite = new TestSuite('PinkTerrainAptitude (粉色因子→地形適性 APT-09)');

    suite.test('粉色地形因子覆寫對應地形：★3→A、★0→D，其他地形保留原值', () => {
        const base = { PLAIN: 'C', MOUNTAIN: 'B' };
        const out = applyPinkTerrainAptitude(base, [
            { id: 'gene_mountain', level: 3 },
            { id: 'gene_forest', level: 0 },
        ]);
        assert.equals('A', out.MOUNTAIN);
        assert.equals('D', out.FOREST);
        assert.equals('C', out.PLAIN);
    });

    suite.test('沒有粉色因子時回傳原值複本；非粉色因子忽略', () => {
        const base = { MOUNTAIN: 'A' };
        const out = applyPinkTerrainAptitude(base, [{ id: 'gene_cavalry', level: 5 }]);
        assert.equals('A', out.MOUNTAIN);
        assert.equals(false, 'CAVALRY' in out);
    });

    suite.test('14 人血統中同因子 ≥5 人時升一級（B→A），不超過 S', () => {
        const low = applyPinkTerrainAptitude({}, [{ id: 'gene_naval', level: 2 }], { gene_naval: 5 });
        assert.equals('A', low.WATER);
        const top = applyPinkTerrainAptitude({}, [{ id: 'gene_naval', level: 3 }], { gene_naval: 9 });
        assert.equals('S', top.WATER);
        const capped = applyPinkTerrainAptitude({}, [{ id: 'gene_naval', level: 5 }], { gene_naval: 9 });
        assert.equals('S', capped.WATER);
        const none = applyPinkTerrainAptitude({}, [{ id: 'gene_naval', level: 2 }], { gene_naval: 4 });
        assert.equals('B', none.WATER);
    });

    suite.test('不改來源 base 與 genes', () => {
        const base = { MOUNTAIN: 'B' };
        const genes = [{ id: 'gene_mountain', level: 3 }];
        applyPinkTerrainAptitude(base, genes);
        assert.equals('B', base.MOUNTAIN);
        assert.equals(3, genes[0].level);
    });

    suite.test('GeneralUnit 經戰場 profile 讀到粉色因子，地形等級由因子決定', () => {
        const general = new GeneralUnit({
            id: 'pink-test',
            name: 'pink-test',
            faction: Faction.Player,
            hp: 1000,
            str: 80,
            lea: 80,
            terrainAptitude: { MOUNTAIN: 'B' },
            genes: [{ id: 'gene_mountain', level: 3, type: '地形' }],
        } as unknown as GeneralConfig);
        assert.equals(true, general.genes.length === 1);
        const resolved = resolveAptitude(battleAptitudeProfileOf(general), { terrain: TerrainType.Mountain });
        assert.equals('A', resolved.terrain);
    });

    suite.test('沒有武將時回傳 null，不丟例外', () => {
        assert.equals(null, battleAptitudeProfileOf(null));
    });

    suite.test('祖先數依人頭計算，同一祖先佔多席只算一次，只列粉色地形因子', () => {
        const pedigree = { ...createEmptyPedigree(), F: 'a', M: 'b', FF: 'a' };
        const profiles = new Map([['a', { factorIds: ['gene_naval', 'gene_bravery'] }], ['b', { factorIds: ['gene_forest'] }]]);
        assert.equals(JSON.stringify({ gene_naval: 1, gene_forest: 1 }), JSON.stringify(pinkFactorAncestorCounts(pedigree, profiles)));
    });

    suite.test('受孕時把祖先數存到子嗣，戰場適性因此升一級', () => {
        let draws = 0;
        const result = breed({
            father: parent('dad', '男'),
            mother: parent('mom', '女'),
            pedigree: FATHER_LINE,
            random: () => (draws++ === 0 ? 0 : 0.99),
            childId: 'baby',
            dictionary,
        });
        assert.equals('conceived', result.outcome);
        assert.equals(5, result.child!.pinkAncestorCounts!.gene_naval);

        const saved = JSON.parse(JSON.stringify(normalizeRosterRoles([result.child!])[0])) as GeneralConfig;
        const withGene = { ...saved, genes: [{ id: 'gene_naval', level: 1 }] } as unknown as GeneralConfig;
        const unit = new GeneralUnit(withGene);
        assert.equals('B', battleAptitudeProfileOf(unit)!.terrainAptitude!.WATER);

        const noLineage = new GeneralUnit({ ...withGene, pinkAncestorCounts: undefined } as unknown as GeneralConfig);
        assert.equals('C', battleAptitudeProfileOf(noLineage)!.terrainAptitude!.WATER);
    });

    return suite;
}
