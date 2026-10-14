/**
 * MentorTeachingBoundary.test.ts — 因子 Gene 序列化（FBR-02）與教學職能邊界（MENT-11）headless 測試
 *
 * FBR-02：GeneralGeneConfig {type, id, level, isLocked, discoveryLevel} 經 JSON 存讀後不變。
 * MENT-11：教官加成（靈感、訓練）不改子嗣 genes；教官卡作為父母一律被配種規則擋下。
 * Unity 對照：像 ScriptableObject 的序列化回歸測試，以及 Prefab 規則的 EditMode 驗證。
 */
import { TestSuite, assert } from './TestRunner';
import { NurtureService } from '../assets/scripts/core/services/NurtureService';
import { InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { mentorFromCard } from '../assets/scripts/core/systems/NurtureSystem';
import { GameTimeMode } from '../assets/scripts/core/systems/GameClock';
import { chooseFate, unveilGeneral, UnveilingGeneral } from '../assets/scripts/core/systems/Unveiling';
import { checkBreedingEligibility, conceptionRate, BreedingGeneral } from '../assets/scripts/core/systems/BreedingSystem';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { parseSupportCard, SupportCardDef } from '../assets/scripts/core/models/MentorSupportSchema';
import type { MentorCard } from '../assets/scripts/core/models/MentorCard';
import type { GeneralConfig, GeneralGeneConfig } from '../assets/scripts/core/models/GeneralUnit';

function seeded(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const GENES: GeneralGeneConfig[] = [
    { type: 'red', id: 'RED_STR_01', level: 2, isLocked: false, discoveryLevel: 1 },
    { type: 'blue', id: 'BLUE_LEA_02', level: 1, isLocked: true, discoveryLevel: 3 },
];

function child(id: string): UnveilingGeneral {
    return {
        id, name: id, faction: 'shu', gender: '男', age: 5, status: 'Mystery', hp: 800,
        str: 60, int: 50, lea: 55, pol: 40, cha: 45, luk: 30,
        hiddenFlags: ['mystery-phase'], genes: GENES.map((g) => ({ ...g })),
    } as UnveilingGeneral;
}

function supportWithInspire(): SupportCardDef {
    const result = parseSupportCard({
        Support_ID: 'SUP_TEST_SSR_02', Name: '測試教官', Rarity: 'SSR', Teaching_Style: '槍法',
        Stat_Bonus: { STR: 8 },
        Tactic_Inspire_Events: [{ Event_ID: 'EVT_A', Tactic_ID: 'TAC_A', Trigger_Window: [1, 36], Base_Rate: 1, Min_Star: 0 }],
        Passive_Effects: [], Friendship_Bonus: [1, 1.1, 1.2, 1.3, 1.4, 1.5], Training_Effect: [1, 1.05, 1.1, 1.15, 1.2, 1.3],
        Training_Slot_Affinity: ['STR'], Slot_Burst_Rate: 0.55, Synergy_Partners: [], Source: 'Gacha', Role_Boundary: 'TeachingOnly',
    });
    if (!result.ok) throw new Error(result.errors.join('; '));
    return result.value;
}

function mentorCard(uid: string): MentorCard {
    return {
        uid, sourceGeneralId: 'guan', name: '關羽', faction: 'shu',
        retiredAge: 66, retiredSeason: 4, retiredYear: 2, ep_snapshot: 80, gene_refs: [],
        parentUids: ['f', 'm'],
        generalSnapshot: unveilGeneral(child('guan')).general as unknown as GeneralConfig,
        support: supportWithInspire(),
    } as MentorCard;
}

export function createFactorGeneSerializationSuite(): TestSuite {
    const suite = new TestSuite('FactorGeneSerialization (因子 Gene 結構與序列化 FBR-02)');

    suite.test('GeneralGeneConfig 經 JSON 存讀後五個欄位都保留', () => {
        const restored = JSON.parse(JSON.stringify(GENES)) as GeneralGeneConfig[];
        assert.equals(2, restored.length);
        assert.equals('red', restored[0].type!);
        assert.equals('RED_STR_01', restored[0].id!);
        assert.equals(2, restored[0].level!);
        assert.isFalse(restored[0].isLocked!);
        assert.equals(1, restored[0].discoveryLevel!);
        assert.isTrue(restored[1].isLocked === true);
        assert.equals(3, restored[1].discoveryLevel!);
    });

    suite.test('NurtureService 存讀後，會話內武將的 genes 不變', () => {
        const roster = new InMemoryRosterStore([chooseFate(unveilGeneral(child('alpha')).general, 'accept')]);
        const nurture = new NurtureService(roster, {
            random: seeded(5), currentSeason: () => 3,
            currentMode: () => GameTimeMode.Nurture, requireNurtureMode: true,
        });
        nurture.startWithCards('alpha', [mentorCard('mentor-guan')]);
        const saved = JSON.parse(JSON.stringify(nurture.getState()));
        const reloaded = new NurtureService(roster, { random: seeded(5), currentSeason: () => 3 });
        reloaded.restoreState(saved);
        assert.isTrue(reloaded.getSession('alpha') !== null, '存讀後培育會話仍在');
        assert.equals(JSON.stringify(GENES), JSON.stringify(roster.getAll()[0].genes));
    });

    return suite;
}

export function createMentorTeachingBoundarySuite(): TestSuite {
    const suite = new TestSuite('MentorTeachingBoundary (教學職能邊界 MENT-11)');

    suite.test('教官卡作為父或母，配種資格一律被擋（isMentorCard）', () => {
        const normal = { ...child('norm'), age: 30, sex: undefined } as unknown as BreedingGeneral;
        const mentorFather = { ...normal, id: 'm-father', isMentorCard: true } as BreedingGeneral;
        const mentorMother = { ...normal, id: 'm-mother', isMentorCard: true } as BreedingGeneral;
        const asFather = checkBreedingEligibility(mentorFather, normal);
        const asMother = checkBreedingEligibility(normal, mentorMother);
        assert.isTrue(asFather.reasons.includes('father-mentor-card'));
        assert.isTrue(asMother.reasons.includes('mother-mentor-card'));
    });

    suite.test('培育 36 回合（含教官）前後子嗣 genes 完全相同', () => {
        const roster = new InMemoryRosterStore([chooseFate(unveilGeneral(child('alpha')).general, 'accept')]);
        const nurture = new NurtureService(roster, {
            random: seeded(9), currentSeason: () => 3,
            currentMode: () => GameTimeMode.Nurture, requireNurtureMode: true,
        });
        nurture.startWithCards('alpha', [mentorCard('mentor-guan')]);
        const before = JSON.stringify(roster.getAll()[0].genes);
        const kinds = ['str', 'int', 'lea', 'pol', 'cha'] as const;
        for (let round = 1; round <= 36; round++) {
            const session = nurture.getSession('alpha')!;
            nurture.train('alpha', session.vigor < 40 ? 'rest' : kinds[round % kinds.length]);
        }
        assert.equals(before, JSON.stringify(roster.getAll()[0].genes), '訓練不應改動 genes');
    });

    suite.test('培育 36 回合（含教官）前後，子嗣祖譜與父母受孕率都不變', () => {
        const parentOf = (uid: string, gender: '男' | '女') => ({
            id: uid, name: uid, faction: 'shu', gender, age: 30, hp: 1000, vitality: 200, maxVitality: 200,
            str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40,
        }) as unknown as BreedingGeneral;
        const father = parentOf('fa', '男');
        const mother = parentOf('mo', '女');
        const graph = new BloodlineGraph();
        const person = (uid: string) => ({ uid, template_id: null, name: uid, gene_refs: [] as string[], ep_base: 50, faction: 'shu', is_virtual: false });
        graph.loadFromData({
            version: 't',
            updatedAt: 't',
            persons: ['alpha', 'fa', 'mo'].map(person),
            links: [
                { child_uid: 'alpha', parent_uid: 'fa', relation: 'F' },
                { child_uid: 'alpha', parent_uid: 'mo', relation: 'M' },
            ],
        } as never);
        const rateBefore = conceptionRate(father, mother);
        const chainBefore = JSON.stringify(graph.getAncestorChain('alpha'));
        const pedigreeBefore = JSON.stringify(graph.getPedigree('alpha'));

        const roster = new InMemoryRosterStore([chooseFate(unveilGeneral(child('alpha')).general, 'accept')]);
        const nurture = new NurtureService(roster, {
            random: seeded(9), currentSeason: () => 3,
            currentMode: () => GameTimeMode.Nurture, requireNurtureMode: true,
        });
        nurture.startWithCards('alpha', [mentorCard('mentor-guan')]);
        const kinds = ['str', 'int', 'lea', 'pol', 'cha'] as const;
        for (let round = 1; round <= 36; round++) {
            const session = nurture.getSession('alpha')!;
            nurture.train('alpha', session.vigor < 40 ? 'rest' : kinds[round % kinds.length]);
        }

        assert.equals(chainBefore, JSON.stringify(graph.getAncestorChain('alpha')), '祖先鏈不變');
        assert.equals(pedigreeBefore, JSON.stringify(graph.getPedigree('alpha')), '14 人祖譜位置不變');
        assert.equals(rateBefore, conceptionRate(father, mother), '父母受孕率不因教官培育改變');
    });

    return suite;
}
