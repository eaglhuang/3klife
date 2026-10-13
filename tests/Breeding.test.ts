/**
 * Breeding.test.ts — 結緣 + 14 人血統 + 因子繼承 headless 測試（PROG-2-0026）
 *
 * Unity 對照：等同 EditMode Test，不開 Scene 直接驗證純 C# 的配種規則。
 */
import { TestSuite, assert } from './TestRunner';
import { BloodlineGraph, PEDIGREE_SLOTS } from '../assets/scripts/core/services/BloodlineGraph';
import {
    advanceBreedingSeason,
    applyInbreedingPurification,
    birthLoadFactor,
    breed,
    BreedingGeneral,
    buildChildPedigree,
    checkBreedingEligibility,
    childBaseStat,
    computeEpMvp,
    conceptionRate,
    CONCEPTION_RATE_CAP,
    epRatingLabel,
    INBREEDING_NEGATIVE_TRAIT_BONUS,
    lifetimeBreedingCap,
    parentAgeFactor,
    PREGNANCY_LOCK_SEASONS,
    resolveAncestorProfile,
    AncestorProfile,
    applyWildGeneMutation,
} from '../assets/scripts/core/systems/BreedingSystem';
import {
    buildFactorDictionary,
    EARLY_REVEAL_FACTOR_COLORS,
    FactorDictionary,
    InheritedFactor,
    inheritFactors,
    resolveFactorColor,
    rollFactorStar,
} from '../assets/scripts/core/systems/FactorInheritance';
import { BreedingService } from '../assets/scripts/core/services/BreedingService';
import { InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import type { PersonRegistryData } from '../assets/scripts/core/models/PersonRegistry';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const ROOT = path.resolve(__dirname, '..');

function readJson<T>(rel: string): T {
    return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')) as T;
}

/** 固定序列的亂數；用完後回到最後一個值 */
function seq(...values: number[]): () => number {
    let i = 0;
    return () => values[Math.min(i++, values.length - 1)];
}

function makeGeneral(id: string, gender: '男' | '女', extra: Partial<BreedingGeneral> = {}): BreedingGeneral {
    return {
        id,
        name: id,
        faction: 'shu',
        gender,
        age: 30,
        hp: 1000,
        vitality: 100,
        maxVitality: 100,
        str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40,
        ...extra,
    } as BreedingGeneral;
}

/** 小型族譜：gf/gm → dad、aunt；dad × mom → kid1、kid2；aunt × uncle → cousin */
function smallFamily(): BloodlineGraph {
    const graph = new BloodlineGraph();
    const person = (uid: string, gene_refs: string[] = []) => ({ uid, template_id: null, name: uid, gene_refs, ep_base: 50, faction: 'shu', is_virtual: false });
    graph.loadFromData({
        version: 't',
        updatedAt: 't',
        persons: ['gf', 'gm', 'dad', 'mom', 'aunt', 'uncle', 'kid1', 'kid2', 'cousin', 'stranger'].map((uid) => person(uid)),
        links: [
            { child_uid: 'dad', parent_uid: 'gf', relation: 'F', generation: 1 },
            { child_uid: 'dad', parent_uid: 'gm', relation: 'M', generation: 1 },
            { child_uid: 'aunt', parent_uid: 'gf', relation: 'F', generation: 1 },
            { child_uid: 'aunt', parent_uid: 'gm', relation: 'M', generation: 1 },
            { child_uid: 'kid1', parent_uid: 'dad', relation: 'F', generation: 1 },
            { child_uid: 'kid1', parent_uid: 'mom', relation: 'M', generation: 1 },
            { child_uid: 'kid2', parent_uid: 'dad', relation: 'F', generation: 1 },
            { child_uid: 'kid2', parent_uid: 'mom', relation: 'M', generation: 1 },
            { child_uid: 'cousin', parent_uid: 'uncle', relation: 'F', generation: 1 },
            { child_uid: 'cousin', parent_uid: 'aunt', relation: 'M', generation: 1 },
        ],
    });
    return graph;
}

export function createBreedingSuite(): TestSuite {
    const suite = new TestSuite('Breeding (結緣 / 14 人血統 / 因子繼承)');

    const registry = readJson<PersonRegistryData>('assets/resources/data/person-registry.json');
    const dictionary: FactorDictionary = buildFactorDictionary(readJson('assets/resources/data/master/gene-dictionary.json'));
    const generals = readJson<GeneralConfig[]>('assets/resources/data/generals.json');

    // ── 純度 ───────────────────────────────────────────────────────────────

    suite.test('新邏輯檔案不 import cc', () => {
        const files = [
            'assets/scripts/core/services/BloodlineGraph.ts',
            'assets/scripts/core/services/BreedingService.ts',
            'assets/scripts/core/systems/BreedingSystem.ts',
            'assets/scripts/core/systems/FactorInheritance.ts',
        ];
        for (const file of files) {
            const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
            assert.isFalse(/from\s+['"]cc['"]/.test(text), `${file} 不應 import cc`);
        }
    });

    // ── 血統圖 ─────────────────────────────────────────────────────────────

    suite.test('BloodlineGraph：真實 registry 的關羽有完整 14 人祖譜', () => {
        const graph = new BloodlineGraph();
        graph.loadFromData(registry);
        const pedigree = graph.getPedigree('guan-yu');
        const filled = PEDIGREE_SLOTS.filter((slot) => !!pedigree[slot]);
        assert.equals(14, filled.length);
        assert.equals(graph.getParents('guan-yu').father, pedigree.F);
        assert.equals(graph.getParents(pedigree.F!).mother, pedigree.FM);
        assert.equals(graph.getParents(pedigree.MF!).father, pedigree.MFF);
    });

    suite.test('BloodlineGraph：共同祖先距離（兄弟 1、堂表 2、父子 1、無關 null）', () => {
        const graph = smallFamily();
        assert.equals(1, graph.commonAncestorDistance('kid1', 'kid2'));
        assert.equals(2, graph.commonAncestorDistance('kid1', 'cousin'));
        assert.equals(1, graph.commonAncestorDistance('dad', 'kid1'));
        assert.equals(null, graph.commonAncestorDistance('kid1', 'stranger'));
        assert.equals(null, graph.commonAncestorDistance('kid1', 'cousin', 1));
    });

    suite.test('BloodlineGraph：registerChild 後子嗣祖譜往上平移一代', () => {
        const graph = smallFamily();
        graph.registerChild({ uid: 'baby', template_id: null, name: 'baby', gene_refs: [], ep_base: 50, faction: 'shu', is_virtual: false }, 'kid1', 'stranger');
        const pedigree = graph.getPedigree('baby');
        assert.equals('kid1', pedigree.F);
        assert.equals('stranger', pedigree.M);
        assert.equals('dad', pedigree.FF);
        assert.equals('mom', pedigree.FM);
        assert.equals('gf', pedigree.FFF);
        assert.equals(null, pedigree.MF);
        assert.equals(buildChildPedigree('kid1', 'stranger', graph).FFM, pedigree.FFM);
    });

    // ── 因子 ───────────────────────────────────────────────────────────────

    suite.test('因子色系：依用途分類（騎兵適性 = 粉、權謀 = 綠、隱藏不繼承）', () => {
        assert.equals('pink', resolveFactorColor('gene_cavalry', dictionary));
        assert.equals('green', resolveFactorColor('gene_strategy', dictionary));
        assert.equals('blue', resolveFactorColor('gene_command', dictionary));
        assert.equals('white', resolveFactorColor('gene_honor', dictionary));
        assert.equals(null, resolveFactorColor('gene_hidden_01', dictionary));
        assert.equals('pink', resolveFactorColor('gene_unknown', undefined, { id: 'gene_unknown', type: '兵種' }));
    });

    suite.test('因子星等分布依世代', () => {
        assert.equals(3, rollFactorStar(1, () => 0.5));
        assert.equals(4, rollFactorStar(1, () => 0.1));
        assert.equals(2, rollFactorStar(2, () => 0.5));
        assert.equals(3, rollFactorStar(2, () => 0.29));
        assert.equals(1, rollFactorStar(3, () => 0.5));
        assert.equals(2, rollFactorStar(3, () => 0.05));
    });

    suite.test('因子進池：G1 必進、G2 < 0.5 才進、G3 < 0.25 才進', () => {
        const sources = [
            { uid: 'p', generation: 1 as const, factorIds: ['gene_command'] },
            { uid: 'g', generation: 2 as const, factorIds: ['gene_strategy'] },
            { uid: 'gg', generation: 3 as const, factorIds: ['gene_cavalry'] },
        ];
        const high = inheritFactors(sources, { random: () => 0.4, dictionary });
        assert.equals('gene_command,gene_strategy', high.map((f) => f.id).sort().join(','));
        const low = inheritFactors(sources, { random: () => 0.2, dictionary });
        assert.equals(3, low.length);
        const none = inheritFactors(sources, { random: () => 0.99, dictionary });
        assert.equals('gene_command', none.map((f) => f.id).join(','));
    });

    suite.test('因子：MVP 預設六色全進池，enabledColors 可縮減', () => {
        const sources = [{
            uid: 'p',
            generation: 1 as const,
            factorIds: ['gene_honor', 'gene_command', 'gene_destiny', 'gene_vitality', 'gene_cavalry', 'gene_strategy'],
        }];
        const full = inheritFactors(sources, { random: () => 0.9, dictionary, maxFactors: 6 });
        assert.equals('blue,green,pink,purple,red,white', full.map((f) => f.color).sort().join(','), '六色各一個都進池');
        const early = inheritFactors(sources, { random: () => 0.9, dictionary, enabledColors: EARLY_REVEAL_FACTOR_COLORS });
        assert.equals('blue,green,pink', early.map((f) => f.color).sort().join(','), '縮減成藍粉綠時白紫紅不進池');
    });

    suite.test('因子字典：六色都至少有一個可繼承因子', () => {
        const colors = new Set<string>();
        for (const id of dictionary.keys()) {
            const color = resolveFactorColor(id, dictionary);
            if (color) colors.add(color);
        }
        assert.equals('blue,green,pink,purple,red,white', [...colors].sort().join(','));
    });

    suite.test('因子：同因子多來源取最高星，且最多保留 maxFactors 個', () => {
        const sources = [
            { uid: 'gg', generation: 3 as const, factorIds: ['gene_command'] },
            { uid: 'p', generation: 1 as const, factorIds: ['gene_command', 'gene_strategy', 'gene_cavalry'] },
        ];
        const result = inheritFactors(sources, { random: () => 0.01, dictionary, maxFactors: 2 });
        assert.equals(2, result.length);
        const command = result.find((f) => f.id === 'gene_command')!;
        assert.equals(4, command.level);
        assert.equals(1, command.generation);
        assert.equals('gg,p', command.sourceUids.join(','));
    });

    // ── EP ─────────────────────────────────────────────────────────────────

    suite.test('EP_MVP：基礎 50、共鳴 +15、異脈 +20、契合 +25', () => {
        const pedigree = {} as ReturnType<BloodlineGraph['getPedigree']>;
        const profiles = new Map<string, AncestorProfile>();
        PEDIGREE_SLOTS.forEach((slot, i) => {
            pedigree[slot] = `a${i}`;
            profiles.set(`a${i}`, { uid: `a${i}`, tags: i < 3 ? ['cavalry'] : [`t${i}`], factorIds: [] });
        });
        const full = computeEpMvp(pedigree, profiles, true);
        assert.equals(110, full.ep);
        assert.equals('cavalry', full.topTag);
        assert.equals('天命之子', full.rating);

        profiles.get('a2')!.tags = ['solo'];
        const plain = computeEpMvp(pedigree, profiles, false);
        assert.equals(0, plain.resonance, '只剩 2 位同標籤，不到 3 位');
        assert.equals(70, plain.ep, '50 + 異脈 20');
    });

    suite.test('EP_MVP：位置重複（近親）或祖先不明時沒有異脈加成', () => {
        const pedigree = {} as ReturnType<BloodlineGraph['getPedigree']>;
        PEDIGREE_SLOTS.forEach((slot, i) => { pedigree[slot] = `a${i}`; });
        pedigree.FFF = 'a7';
        assert.equals(0, computeEpMvp(pedigree, new Map(), false).outcross);
        pedigree.FFF = null;
        assert.equals(0, computeEpMvp(pedigree, new Map(), false).outcross);
    });

    suite.test('EP 評級文字', () => {
        assert.equals('天命之子', epRatingLabel(90));
        assert.equals('良才美質', epRatingLabel(70));
        assert.equals('中規中矩', epRatingLabel(50));
        assert.equals('命途多舛', epRatingLabel(49));
    });

    // ── 受孕與資格 ─────────────────────────────────────────────────────────

    suite.test('受孕率公式與 95% 上限', () => {
        const f = makeGeneral('f', '男', { cha: 30, luk: 20 });
        const m = makeGeneral('m', '女', { cha: 30, luk: 20 });
        const expected = 0.7 * (1 + 30 / 200) * (1 + 20 / 200);
        assert.inRange(conceptionRate(f, m), expected - 1e-9, expected + 1e-9);
        assert.isTrue(expected < CONCEPTION_RATE_CAP);
        const lucky = makeGeneral('m2', '女', { cha: 100, luk: 100 });
        assert.equals(CONCEPTION_RATE_CAP, conceptionRate(makeGeneral('f2', '男', { cha: 100, luk: 100 }), lucky));
        assert.equals(1, birthLoadFactor(makeGeneral('a', '女', { breedingCount: 1 })));
        assert.inRange(birthLoadFactor(makeGeneral('a', '女', { breedingCount: 3 })), 0.6999, 0.7001);
        assert.equals(0.4, birthLoadFactor(makeGeneral('a', '女', { breedingCount: 9 })));
    });

    suite.test('一生生育上限：<90 → 3、90~119 → 4、≥120 → 5，秘藥最多 +1', () => {
        assert.equals(3, lifetimeBreedingCap(makeGeneral('a', '男', { maxVitality: 80 })));
        assert.equals(4, lifetimeBreedingCap(makeGeneral('a', '男', { maxVitality: 100 })));
        assert.equals(5, lifetimeBreedingCap(makeGeneral('a', '男', { maxVitality: 120 })));
        assert.equals(6, lifetimeBreedingCap(makeGeneral('a', '男', { maxVitality: 120, breedingCapBonus: 3 })));
    });

    suite.test('資格：未滿 20、精力不足、同性、待產、已達上限、教官卡、死亡都擋下', () => {
        const ok = checkBreedingEligibility(makeGeneral('f', '男'), makeGeneral('m', '女'));
        assert.isTrue(ok.ok);
        const bad = checkBreedingEligibility(
            makeGeneral('f', '女', { age: 19, vitality: 40, isMentorCard: true }),
            makeGeneral('m', '女', { vitality: 99, pregnancySeasonsLeft: 2, breedingCount: 4, status: 'dead' }),
        );
        for (const reason of ['father-not-male', 'father-underage', 'father-low-vigor', 'father-mentor-card', 'mother-low-vigor', 'mother-pregnant', 'mother-breeding-cap', 'mother-dead']) {
            assert.isTrue(bad.reasons.includes(reason as never), `應包含 ${reason}`);
        }
    });

    suite.test('資格：3 代內有共同祖先（兄妹、堂表、父女）禁止結緣', () => {
        const graph = smallFamily();
        const blocked = checkBreedingEligibility(makeGeneral('kid1', '男'), makeGeneral('cousin', '女'), graph);
        assert.isTrue(blocked.reasons.includes('inbreeding'));
        assert.equals(2, blocked.commonAncestorDistance);
        assert.isTrue(checkBreedingEligibility(makeGeneral('dad', '男'), makeGeneral('kid2', '女'), graph).reasons.includes('inbreeding'));
        assert.isTrue(checkBreedingEligibility(makeGeneral('kid1', '男'), makeGeneral('stranger', '女'), graph).ok);
    });

    // ── 一次結緣 ───────────────────────────────────────────────────────────

    suite.test('結緣被擋下時不扣精力', () => {
        const graph = smallFamily();
        const father = makeGeneral('kid1', '男');
        const result = breed({ father, mother: makeGeneral('cousin', '女'), pedigree: graph, random: () => 0, childId: 'x' });
        assert.equals('blocked', result.outcome);
        assert.equals(100, result.father.vitality);
    });

    suite.test('受孕失敗：雙方照扣精力，沒有子嗣、沒有待產', () => {
        const result = breed({ father: makeGeneral('f', '男'), mother: makeGeneral('m', '女'), pedigree: new BloodlineGraph(), random: () => 0.999, childId: 'x' });
        assert.equals('failed', result.outcome);
        assert.equals(50, result.father.vitality);
        assert.equals(0, result.mother.vitality);
        assert.equals(undefined, result.child);
        assert.equals(undefined, result.mother.pregnancySeasonsLeft);
    });

    suite.test('受孕成功：0 歲子嗣、五維 = 父母平均 × EP/100、母方待產 4 季', () => {
        const father = makeGeneral('f', '男', { str: 90, genes: [{ id: 'gene_command', level: 3 }] });
        const mother = makeGeneral('m', '女', { str: 70, genes: [{ id: 'gene_cavalry', level: 2 }, { id: 'gene_honor', level: 2 }] });
        const result = breed({ father, mother, pedigree: new BloodlineGraph(), random: seq(0, 0.9, 0.9, 0.9, 0.9, 0.1), childId: 'baby', dictionary, birthSeason: 7 });
        assert.equals('conceived', result.outcome);
        const child = result.child!;
        assert.equals(0, child.age);
        assert.equals('Mystery', child.status);
        assert.equals('男', child.gender);
        assert.equals(50, child.ep, '祖先不明：沒有共鳴與異脈');
        assert.equals(childBaseStat(90, 70, 50), child.str);
        assert.equals(40, child.str);
        assert.equals('f', child.fatherId);
        assert.equals(7, child.birthSeason);
        assert.equals('gene_cavalry,gene_command,gene_honor', (child.genes ?? []).map((g) => g.id).sort().join(','), '六色全開：白色 gene_honor 也繼承');
        assert.isTrue((child.genes ?? []).every((g) => g.isLocked === true));
        assert.equals(PREGNANCY_LOCK_SEASONS, result.mother.pregnancySeasonsLeft);
        assert.equals(1, result.father.breedingCount);
    });

    suite.test('同 Bloodline_ID 配對：子嗣 Vitality_Max × 0.7', () => {
        const result = breed({
            father: makeGeneral('f', '男', { bloodlineId: 'BL_X' }),
            mother: makeGeneral('m', '女', { bloodlineId: 'BL_X' }),
            pedigree: new BloodlineGraph(),
            random: () => 0,
            childId: 'baby',
        });
        assert.equals(70, result.child!.maxVitality);
    });

    suite.test('近親子嗣：負面特質出現率 +0.5；非近親為 0', () => {
        const inbred = breed({
            father: makeGeneral('f', '男', { bloodlineId: 'BL_X' }),
            mother: makeGeneral('m', '女', { bloodlineId: 'BL_X' }),
            pedigree: new BloodlineGraph(),
            random: () => 0,
            childId: 'baby',
        });
        assert.equals(INBREEDING_NEGATIVE_TRAIT_BONUS, inbred.child!.negativeTraitRateBonus);
        const normal = breed({
            father: makeGeneral('f2', '男'),
            mother: makeGeneral('m2', '女'),
            pedigree: new BloodlineGraph(),
            random: () => 0,
            childId: 'baby2',
        });
        assert.equals(0, normal.child!.negativeTraitRateBonus);
    });

    suite.test('近親純化：只升多來源同名因子，且不超過 maxLevel', () => {
        const merged: InheritedFactor = { id: 'g_a', color: 'blue', level: 2, generation: 1, sourceUids: ['x', 'y'] };
        const single: InheritedFactor = { ...merged, id: 'g_b', sourceUids: ['x'] };
        const capped: InheritedFactor = { ...merged, id: 'g_c', level: 5 };
        const up = applyInbreedingPurification([merged, single, capped], seq(0, 0, 0));
        assert.equals(3, up[0].level);
        assert.equals(2, up[1].level);
        assert.equals(5, up[2].level);
        const miss = applyInbreedingPurification([merged], seq(0.99));
        assert.equals(2, miss[0].level);
    });

    suite.test('Age_Factor 暫定分段：高齡方降低受孕率', () => {
        assert.equals(1, parentAgeFactor(40));
        assert.equals(0.8, parentAgeFactor(41));
        assert.equals(0.6, parentAgeFactor(46));
        assert.equals(1, parentAgeFactor(undefined));
        const m = makeGeneral('m', '女', { cha: 30, luk: 20, age: 30 });
        const base = conceptionRate(makeGeneral('f', '男', { cha: 30, luk: 20, age: 30 }), m);
        const old = conceptionRate(makeGeneral('f2', '男', { cha: 30, luk: 20, age: 50 }), m);
        assert.inRange(old, base * 0.6 - 1e-9, base * 0.6 + 1e-9);
    });

    suite.test('advanceBreedingSeason：待產倒數，到 0 時回報', () => {
        let roster: BreedingGeneral[] = [makeGeneral('m', '女', { pregnancySeasonsLeft: 2 }), makeGeneral('f', '男')];
        let step = advanceBreedingSeason(roster);
        assert.equals(0, step.pregnancyEnded.length);
        roster = step.generals;
        step = advanceBreedingSeason(roster);
        assert.equals('m', step.pregnancyEnded.join(','));
        assert.equals(0, step.generals[0].pregnancySeasonsLeft);
    });

    // ── 真實資料三代循環 ───────────────────────────────────────────────────

    suite.test('BreedingService：關羽 × 貂蟬 → 子嗣進名冊、14 人祖譜正確、EP 含共鳴與異脈', () => {
        const graph = new BloodlineGraph();
        graph.loadFromData(registry);
        const guanYu = generals.find((g) => g.id === 'guan-yu')!;
        const diaoChan = generals.find((g) => g.id === 'diao-chan')!;
        const store = new InMemoryRosterStore([guanYu, diaoChan]);
        const service = new BreedingService(store, graph, { random: () => 0.01, dictionary, currentSeason: () => 3 });

        const preview = service.previewEp('guan-yu', 'diao-chan');
        assert.equals(85, preview.ep, '真實祖譜 14 人不重複 → 異脈 +20，同因子 ≥ 3 → 共鳴 +15');

        const result = service.breed('guan-yu', 'diao-chan');
        assert.equals('conceived', result.outcome);
        const roster = store.getAll() as BreedingGeneral[];
        assert.equals(3, roster.length);
        const child = roster.find((g) => g.id === 'child-guan-yu-diao-chan-1')!;
        assert.equals(0, child.age);
        assert.equals(85, child.ep);
        assert.equals(14, (child.ancestor_chain ?? []).length);

        const pedigree = graph.getPedigree(child.id);
        assert.equals('guan-yu', pedigree.F);
        assert.equals('diao-chan', pedigree.M);
        assert.equals(graph.getParents('guan-yu').father, pedigree.FF);
        assert.equals(graph.getPedigree('diao-chan').MM, pedigree.MMM);

        const mother = roster.find((g) => g.id === 'diao-chan') as BreedingGeneral;
        assert.equals(0, mother.vitality);
        assert.equals(PREGNANCY_LOCK_SEASONS, mother.pregnancySeasonsLeft);
        assert.equals('mother-low-vigor,mother-pregnant', service.checkEligibility('guan-yu', 'diao-chan').reasons.join(','));
    });

    suite.test('BreedingService：第三代與近親阻擋，讀檔後可從名冊重建血統圖', () => {
        const registryGraph = new BloodlineGraph();
        registryGraph.loadFromData(registry);
        const base = generals.filter((g) => ['guan-yu', 'diao-chan', 'zhang-fei', 'da-qiao'].includes(g.id));
        const store = new InMemoryRosterStore(base);
        let n = 0;
        const service = new BreedingService(store, registryGraph, {
            random: () => 0.01,
            dictionary,
            childIdFactory: () => `kid-${++n}`,
        });
        assert.equals('conceived', service.breed('guan-yu', 'diao-chan').outcome);
        assert.equals('conceived', service.breed('zhang-fei', 'da-qiao').outcome);

        // 讓兩個子嗣長大成年，並指定性別
        const grown = (store.getAll() as BreedingGeneral[]).map((g) =>
            g.id === 'kid-1' ? { ...g, age: 20, gender: '男' } : g.id === 'kid-2' ? { ...g, age: 20, gender: '女' } : g);
        store.replaceAll(grown);
        const third = service.breed('kid-1', 'kid-2');
        assert.equals('conceived', third.outcome);
        const grandchild = third.child!;
        const pedigree = registryGraph.getPedigree(grandchild.id);
        assert.equals('guan-yu', pedigree.FF);
        assert.equals('da-qiao', pedigree.MM);
        assert.equals(registryGraph.getParents('guan-yu').mother, pedigree.FFM);

        // 新的血統圖只載 registry，再從名冊補回出生紀錄
        const reloaded = new BloodlineGraph();
        reloaded.loadFromData(registry);
        const restored = new BreedingService(store, reloaded, { random: () => 0.01, dictionary });
        assert.equals(3, restored.syncGraphFromRoster());
        assert.equals('guan-yu', reloaded.getPedigree(grandchild.id).FF);

        // 祖孫（關羽 × 孫女）在 3 代內 → 擋下
        store.replaceAll((store.getAll() as BreedingGeneral[]).map((g) => (g.id === grandchild.id ? { ...g, age: 20, gender: '女' } : g)));
        assert.isTrue(restored.checkEligibility('guan-yu', grandchild.id).reasons.includes('inbreeding'));
    });

    suite.test('resolveAncestorProfile：名冊 genes 與 registry gene_refs 合併', () => {
        const graph = new BloodlineGraph();
        graph.loadFromData(registry);
        const guanYu = generals.find((g) => g.id === 'guan-yu')!;
        const profile = resolveAncestorProfile('guan-yu', graph, (uid) => (uid === 'guan-yu' ? guanYu : undefined));
        assert.isTrue(profile.factorIds.includes('gene_halberd'));
        assert.isTrue(profile.tags.includes('gene_halberd'));
    });

    suite.test('血統活性 Wild Gene 接線：命中才 +2★，封頂於字典 maxLevel，初代來源機率較高', () => {
        const f = (id: string, level: number, generation: 1 | 2 | 3) => ({ id, color: 'green' as const, level, generation, sourceUids: ['a'] });
        const seq = (...values: number[]) => {
            let i = 0;
            return () => values[Math.min(i++, values.length - 1)];
        };
        // 後代基礎 10%：亂數 0.05 命中 → 3★ → 5★
        const hit = applyWildGeneMutation([f('gene_charge', 3, 2)], seq(0.05));
        assert.equals(5, hit[0].level);
        // 初代 +10 百分點 = 20%：亂數 0.15 只有初代命中
        assert.equals(5, applyWildGeneMutation([f('gene_charge', 3, 1)], seq(0.15))[0].level, '初代命中');
        assert.equals(3, applyWildGeneMutation([f('gene_charge', 3, 2)], seq(0.15))[0].level, '後代不命中');
        // 封頂：字典 maxLevel 4 → 3★ 只到 4★；已達上限不變
        const dict = buildFactorDictionary([{ id: 'gene_charge', maxLevel: 4 }]);
        assert.equals(4, applyWildGeneMutation([f('gene_charge', 3, 2)], seq(0.05), dict)[0].level);
        assert.equals(4, applyWildGeneMutation([f('gene_charge', 4, 2)], seq(0.05), dict)[0].level);
        // 不改輸入
        const input = [f('gene_charge', 3, 2)];
        applyWildGeneMutation(input, seq(0.05));
        assert.equals(3, input[0].level);
    });

    return suite;
}
