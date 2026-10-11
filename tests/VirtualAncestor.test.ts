/**
 * VirtualAncestor.test.ts — BLT-02 初代名將 14 位虛擬祖先（PROG-2-0067，headless）
 *
 * 驗證：V_PID 命名與 14 個位置、出生地推斷與地域限制、世代色系權重與星等、
 * 父系標籤映射、主屬性回溯、變異位點、顯示名稱，以及接進 BloodlineGraph / BreedingService 後的祖譜。
 *
 * Unity 對照：EditMode Test 直接呼叫純 C# 生成器，不開 Scene。
 */
import { TestSuite, assert } from './TestRunner';
import {
    ANCESTOR_COLOR_WEIGHTS,
    ANCESTOR_STAR_DISTRIBUTION,
    deriveCoreFactorIds,
    generateVirtualAncestry,
    PROVINCE_REGION,
    REGION_FACTORS,
    REGION_NEIGHBORS,
    resolveBirthProvince,
    surnameOf,
    toRegistryEntries,
    virtualAncestorUid,
} from '../assets/scripts/core/systems/VirtualAncestorGenerator';
import { buildFactorDictionary, FactorDictionary, resolveFactorColor } from '../assets/scripts/core/systems/FactorInheritance';
import { BloodlineGraph, PEDIGREE_SLOTS } from '../assets/scripts/core/services/BloodlineGraph';
import { BreedingService } from '../assets/scripts/core/services/BreedingService';
import { InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import type { BreedingGeneral } from '../assets/scripts/core/systems/BreedingSystem';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import type { PersonRegistryData } from '../assets/scripts/core/models/PersonRegistry';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const ROOT = path.resolve(__dirname, '..');

function readJson<T>(rel: string): T {
    return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')) as T;
}

type LoreGeneral = GeneralConfig & { historicalAnecdote?: string };

/** faction 用資料檔裡的字串（shu / wu / enemy），與正式資料一致 */
function founder(id: string, extra: Partial<Omit<LoreGeneral, 'faction'>> & { faction?: string } = {}): LoreGeneral {
    return {
        id, name: id, faction: 'shu', gender: '男', age: 30, hp: 1000,
        vitality: 100, maxVitality: 100,
        str: 60, int: 60, lea: 60, pol: 60, cha: 60, luk: 40,
        ...extra,
    } as unknown as LoreGeneral;
}

export function createVirtualAncestorSuite(): TestSuite {
    const suite = new TestSuite('VirtualAncestor (BLT-02 虛擬祖先生成器)');
    const dictionary: FactorDictionary = buildFactorDictionary(readJson('assets/resources/data/master/gene-dictionary.json'));
    const rawGenerals = readJson<LoreGeneral[] | { data: LoreGeneral[] }>('assets/resources/data/generals.json');
    const generals = Array.isArray(rawGenerals) ? rawGenerals : rawGenerals.data;
    const byId = (id: string) => generals.find((g) => g.id === id)!;
    const everyone = generals.map((g) => ({ general: g, ancestry: generateVirtualAncestry(g, { dictionary }) }));

    suite.test('新邏輯不 import cc、不用 Math.random；舊的 BloodlineGenerator 已移除', () => {
        const source = fs.readFileSync(path.join(ROOT, 'assets/scripts/core/systems/VirtualAncestorGenerator.ts'), 'utf8');
        assert.isFalse(/from ['"]cc['"]/.test(source));
        assert.isFalse(source.includes('Math.random'));
        assert.isFalse(fs.existsSync(path.join(ROOT, 'assets/scripts/core/systems/BloodlineGenerator.ts')));
    });

    suite.test('14 個位置、V_PID_{武將ID}_{位置} 命名、世代與性別正確；同一武將結果固定、不改傳入資料', () => {
        const zhangFei = byId('zhang-fei');
        const before = JSON.stringify(zhangFei);
        const a = generateVirtualAncestry(zhangFei, { dictionary });
        const b = generateVirtualAncestry(zhangFei, { dictionary });
        assert.equals(JSON.stringify(a), JSON.stringify(b), '同一武將每次生成相同');
        assert.equals(before, JSON.stringify(zhangFei), '不改傳入武將');
        assert.equals(PEDIGREE_SLOTS.join(','), a.ancestors.map((x) => x.slot).join(','));
        assert.equals('V_PID_zhang-fei_FF', a.ancestors[2].uid);
        assert.equals(virtualAncestorUid('zhang-fei', 'MMM'), a.ancestors[13].uid);
        assert.equals('1,1,2,2,2,2,3,3,3,3,3,3,3,3', a.ancestors.map((x) => x.generation).join(','));
        assert.equals('男,女,男,女,男,女,男,女,男,女,男,女,男,女', a.ancestors.map((x) => x.gender).join(','));
        assert.isTrue(a.ancestors.every((x) => x.factors.length >= 1), '每位祖先至少帶 1 個因子');
        assert.isFalse(JSON.stringify(a) === JSON.stringify(generateVirtualAncestry(byId('sun-ce'), { dictionary })), '不同武將不同');
    });

    suite.test('出生地：六位初始名將依規格表；簡體、郡縣、指定值與勢力預設', () => {
        const expected: Record<string, string> = {
            'zhang-fei': '幽州', 'wei-yan': '荊州', 'xiahou-dun': '豫州',
            'zhang-he': '冀州', 'sun-ce': '揚州', 'gan-ning': '益州',
        };
        for (const id of Object.keys(expected)) assert.equals(expected[id], resolveBirthProvince(byId(id)), id);
        assert.equals('涼州', resolveBirthProvince(founder('x', { historicalAnecdote: '某某，凉州武威人。' })));
        assert.equals('冀州', resolveBirthProvince(founder('x', { historicalAnecdote: '某某，常山真定人。' })));
        assert.equals('揚州', resolveBirthProvince(founder('x', { historicalAnecdote: '某某，幽州人。' }), '扬州'), '指定值優先');
        assert.equals('揚州', resolveBirthProvince(founder('x', { faction: 'wu' })));
        assert.equals('司隸', resolveBirthProvince(founder('x', { faction: 'enemy' })));
        assert.equals('north', generateVirtualAncestry(byId('zhang-fei'), { dictionary }).birthRegion);
        assert.equals('wuyue', generateVirtualAncestry(byId('sun-ce'), { dictionary }).birthRegion);
    });

    suite.test('地域限制：全部名將的父系祖先都在本區，母系只在本區或相鄰區', () => {
        for (const { general, ancestry } of everyone) {
            for (const a of ancestry.ancestors) {
                assert.equals(a.region, PROVINCE_REGION[a.province], `${a.uid} 州與地域一致`);
                if (a.slot.charAt(0) === 'F') assert.equals(ancestry.birthRegion, a.region, `${general.id} 父系 ${a.slot}`);
                else assert.isTrue(a.region === ancestry.birthRegion || REGION_NEIGHBORS[ancestry.birthRegion].includes(a.region), `${general.id} 母系 ${a.slot}`);
            }
        }
        const zhangFei = everyone.find((e) => e.general.id === 'zhang-fei')!.ancestry;
        assert.isFalse(zhangFei.ancestors.some((a) => ['wuyue', 'jingchu', 'bashu'].includes(a.region)), '張飛的祖先不會來自江南或巴蜀');
    });

    suite.test('世代色系權重與星等：主因子只出現規格允許的色系，比例落在權重附近', () => {
        const counts: Record<number, Record<string, number>> = { 1: {}, 2: {}, 3: {} };
        for (const { ancestry } of everyone) {
            for (const a of ancestry.ancestors) {
                const main = a.factors[0];
                const allowed = ANCESTOR_COLOR_WEIGHTS[a.generation].map(([c]) => c);
                assert.isTrue(allowed.includes(main.color), `${a.uid} 主因子 ${main.color}`);
                counts[a.generation][main.color] = (counts[a.generation][main.color] ?? 0) + 1;
                const dist = ANCESTOR_STAR_DISTRIBUTION[a.generation];
                assert.isTrue(main.level === dist.low || main.level === dist.high, `${a.uid} 星等 ${main.level}`);
            }
        }
        const ratio = (gen: number, color: string) => {
            const total = Object.values(counts[gen]).reduce((s, n) => s + n, 0);
            return (counts[gen][color] ?? 0) / total;
        };
        assert.isTrue(Math.abs(ratio(1, 'blue') - 0.5) < 0.1, `G1 藍 ${ratio(1, 'blue')}`);
        assert.isTrue(Math.abs(ratio(2, 'pink') - 0.3) < 0.1, `G2 粉 ${ratio(2, 'pink')}`);
        assert.isTrue(Math.abs(ratio(3, 'white') - 0.8) < 0.1, `G3 白 ${ratio(3, 'white')}`);
        const lowStarG1 = everyone.flatMap((e) => e.ancestry.ancestors.filter((a) => a.generation === 1)).filter((a) => a.factors[0].level === 3).length / (everyone.length * 2);
        assert.isTrue(Math.abs(lowStarG1 - 0.8) < 0.1, `G1 ★3 比例 ${lowStarG1}`);
    });

    suite.test('標籤映射：父系一代約七成承襲名將自身同色因子；祖輩的粉色因子偏向地域因子', () => {
        let inherited = 0;
        let eligible = 0;
        let regionalPink = 0;
        let pink = 0;
        for (const { general, ancestry } of everyone) {
            const own = deriveCoreFactorIds(general);
            const father = ancestry.ancestors[0].factors[0];
            if (own.some((id) => resolveFactorColor(id, dictionary) === father.color)) {
                eligible++;
                if (own.includes(father.id)) inherited++;
            }
            for (const a of ancestry.ancestors.filter((x) => x.generation === 2 && x.factors[0].color === 'pink')) {
                pink++;
                if (REGION_FACTORS[a.region].includes(a.factors[0].id)) regionalPink++;
            }
        }
        assert.isTrue(eligible >= 30, `樣本 ${eligible}`);
        assert.isTrue(Math.abs(inherited / eligible - 0.7) < 0.15, `父系承襲 ${inherited}/${eligible}`);
        assert.isTrue(regionalPink / pink > 0.6, `地域粉色 ${regionalPink}/${pink}`);
    });

    suite.test('主屬性回溯：武力 > 90 祖輩必帶勇猛、體魄；智力 > 90 必帶謀略', () => {
        const brute = generateVirtualAncestry(founder('brute', { str: 95 }), { dictionary });
        const sage = generateVirtualAncestry(founder('sage', { int: 95 }), { dictionary });
        const plain = generateVirtualAncestry(founder('plain'), { dictionary });
        const g2 = (a: typeof brute) => a.ancestors.filter((x) => x.generation === 2).flatMap((x) => x.factors.map((f) => f.id));
        assert.isTrue(g2(brute).includes('gene_bravery'));
        assert.isTrue(g2(brute).includes('gene_vitality'));
        assert.isTrue(g2(sage).includes('gene_strategy'));
        assert.isTrue(plain.ancestors.filter((x) => x.generation === 2).every((x) => x.factors.filter((f) => !f.mutation).length === 1), '沒有回溯時祖輩只帶 1 個主因子');
    });

    suite.test('變異位點：14 位中恰好 1 位帶紫色變異因子', () => {
        for (const { general, ancestry } of everyone) {
            const mutations = ancestry.ancestors.flatMap((a) => a.factors.filter((f) => f.mutation).map((f) => ({ slot: a.slot, f })));
            assert.equals(1, mutations.length, general.id);
            assert.equals(ancestry.mutationSlot, mutations[0].slot);
            assert.equals('purple', mutations[0].f.color);
        }
    });

    suite.test('顯示名稱：純父系帶名將姓氏，其餘為某氏遺風；複姓正確', () => {
        const a = generateVirtualAncestry(byId('zhang-fei'), { dictionary });
        assert.isTrue(a.ancestors[0].name.endsWith(' 張氏長輩'), a.ancestors[0].name);
        assert.isTrue(a.ancestors[2].name.endsWith(' 張氏祖輩'), a.ancestors[2].name);
        assert.isTrue(a.ancestors[6].name.endsWith(' 張氏先祖'), a.ancestors[6].name);
        assert.isTrue(a.ancestors.filter((x) => !/^F+$/.test(x.slot)).every((x) => x.name.endsWith(' 某氏遺風')));
        assert.isTrue(a.ancestors.every((x) => x.name.startsWith(x.province)));
        assert.equals('夏侯', surnameOf('夏侯惇'));
        assert.equals('諸葛', surnameOf('諸葛亮'));
        assert.equals('甘', surnameOf('甘寧'));
    });

    suite.test('轉成血統圖：14 筆虛擬人物與 14 條連結，祖譜每個位置都對上 V_PID', () => {
        const ancestry = generateVirtualAncestry(byId('sun-ce'), { dictionary });
        const { persons, links } = toRegistryEntries(ancestry, 'wu');
        assert.equals(14, persons.length);
        assert.isTrue(persons.every((p) => p.is_virtual && p.faction === 'wu' && p.gene_refs.length >= 1));
        assert.equals('sun-ce>V_PID_sun-ce_F:F:1', `${links[0].child_uid}>${links[0].parent_uid}:${links[0].relation}:${links[0].generation}`);
        assert.equals('V_PID_sun-ce_FM>V_PID_sun-ce_FMF:F:3', `${links[8].child_uid}>${links[8].parent_uid}:${links[8].relation}:${links[8].generation}`);

        const graph = new BloodlineGraph();
        assert.isTrue(graph.registerFounderAncestry('sun-ce', persons, links));
        assert.isFalse(graph.registerFounderAncestry('sun-ce', persons, links), '已有父母連結就不重複登記');
        const pedigree = graph.getPedigree('sun-ce');
        for (const slot of PEDIGREE_SLOTS) assert.equals(virtualAncestorUid('sun-ce', slot), pedigree[slot], slot);
    });

    suite.test('BreedingService：初代名將自動補祖先，子嗣祖譜接得上；讀檔重建一致；registry 名將保留原祖先', () => {
        const dad = founder('dad', { gender: '男', faction: 'shu' }) as BreedingGeneral;
        const mom = founder('mom', { gender: '女', faction: 'wu' }) as BreedingGeneral;
        const store = new InMemoryRosterStore([dad, mom]);
        const graph = new BloodlineGraph();
        const service = new BreedingService(store, graph, { random: () => 0.01, dictionary, currentSeason: () => 1 });

        const ep = service.previewEp('dad', 'mom');
        assert.equals('V_PID_dad_F', graph.getParents('dad').father);
        assert.equals(20, ep.outcross, '28 位虛擬祖先不重複 → 異脈加成');

        const result = service.breed('dad', 'mom');
        assert.equals('conceived', result.outcome);
        const child = result.child!;
        assert.equals('V_PID_dad_F', graph.getPedigree(child.id).FF);
        assert.equals('V_PID_mom_MM', graph.getPedigree(child.id).MMM);
        assert.isTrue((child.genes ?? []).every((g) => typeof g.id === 'string'), '子嗣因子都有 id');

        const reloaded = new BloodlineGraph();
        const restored = new BreedingService(store, reloaded, { random: () => 0.01, dictionary });
        assert.equals(1, restored.syncGraphFromRoster(), '只回報補回的子嗣數');
        assert.equals(JSON.stringify(graph.getPedigree(child.id)), JSON.stringify(reloaded.getPedigree(child.id)), '虛擬祖先可重建');
        assert.equals(JSON.stringify(graph.getPerson('V_PID_dad_FF')), JSON.stringify(reloaded.getPerson('V_PID_dad_FF')));

        const registry = readJson<PersonRegistryData>('assets/resources/data/person-registry.json');
        const registryGraph = new BloodlineGraph();
        registryGraph.loadFromData(registry);
        const guanYu = byId('guan-yu') as BreedingGeneral;
        const fixedFather = registryGraph.getParents('guan-yu').father;
        const registryService = new BreedingService(new InMemoryRosterStore([guanYu]), registryGraph, { dictionary });
        assert.equals(0, registryService.ensureFounderAncestry(), 'registry 已有祖先的名將不重產');
        assert.equals(fixedFather, registryGraph.getParents('guan-yu').father);
    });

    return suite;
}
