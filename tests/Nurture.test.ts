/**
 * Nurture.test.ts — 5 歲開獎 / 宿命分流 / 36 回合培育 / 教官 headless 測試（PROG-2-0028）
 *
 * Unity 對照：等同 EditMode Test，不開 Scene 直接驗證純 C# 的養成規則。
 */
import { TestSuite, assert } from './TestRunner';
import {
    chooseFate,
    classifyFactorLeaning,
    effectiveGrowthModifier,
    FATE_DEFY_GROWTH_MODIFIER,
    GENERAL_STATUS_UNVEILED,
    isUnveilingDue,
    LATE_BLOOMER_AGE,
    LATE_BLOOMER_GROWTH_MODIFIER,
    recommendFate,
    UNVEILING_AGE,
    unveilDueGenerals,
    unveilGeneral,
    UnveilingGeneral,
} from '../assets/scripts/core/systems/Unveiling';
import {
    computeRatingScore,
    computeStatGain,
    computeTpGain,
    createNurtureSession,
    executeRound,
    failureRateForVigor,
    graduate,
    graduationTags,
    MENTOR_BURST_MULTIPLIER,
    mentorFromCard,
    TrainingMentor,
    NURTURE_MENTOR_SLOTS,
    NURTURE_TOTAL_ROUNDS,
    NurtureSession,
    phaseOfRound,
    PROWESS_PER_TALENT,
    ratingOfScore,
    rollMentorSlots,
    TRAINING_KINDS,
    TrainingKind,
} from '../assets/scripts/core/systems/NurtureSystem';
import { NurtureService } from '../assets/scripts/core/services/NurtureService';
import { hybridSourceFromFactors, hybridSourcesFromParents } from '../assets/scripts/core/systems/HybridSkill';
import { UnveilingService } from '../assets/scripts/core/services/UnveilingService';
import { BreedingService } from '../assets/scripts/core/services/BreedingService';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import type { MentorCard } from '../assets/scripts/core/models/MentorCard';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { GAME_SESSION_EVENTS, GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { GameTimeMode } from '../assets/scripts/core/systems/GameClock';
import { buildFactorDictionary, FactorDictionary } from '../assets/scripts/core/systems/FactorInheritance';
import type { BreedingGeneral } from '../assets/scripts/core/systems/BreedingSystem';
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

/** 可重現的偽隨機（mulberry32） */
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

function sameJson(expected: unknown, actual: unknown, message?: string): void {
    assert.equals(JSON.stringify(expected), JSON.stringify(actual), message);
}

function makeChild(id: string, extra: Partial<UnveilingGeneral> = {}): UnveilingGeneral {
    return {
        id,
        name: id,
        faction: 'shu',
        gender: '男',
        age: 5,
        status: 'Mystery',
        hp: 800,
        str: 60, int: 50, lea: 55, pol: 40, cha: 45, luk: 30,
        hiddenFlags: ['mystery-phase'],
        genes: [],
        ...extra,
    } as UnveilingGeneral;
}

/** 已開獎且已選過宿命、可直接進培育的子嗣 */
function readyChild(id: string, extra: Partial<UnveilingGeneral> = {}): UnveilingGeneral {
    const unveiled = unveilGeneral(makeChild(id, extra)).general;
    return chooseFate(unveiled, 'accept');
}

function makeMentor(id: string, extra: Partial<TrainingMentor> = {}): TrainingMentor {
    return { id, name: id, tpBonus: 20, specialty: 'str', burstRate: 0.5, stars: 0, ...extra };
}

/** 隨便一套訓練策略：精力低於 45 就休息，否則輪流練五項 */
function playOut(session: NurtureSession, random: () => number): NurtureSession {
    let current = session;
    while (current.status === 'active') {
        const action = current.vigor < 45 ? 'rest' : TRAINING_KINDS[current.round % TRAINING_KINDS.length];
        current = executeRound(current, action, random).session;
    }
    return current;
}

export function createNurtureSuite(): TestSuite {
    const suite = new TestSuite('Nurture (5 歲開獎 / 宿命 / 36 回合培育 / 教官)');

    const dictionary: FactorDictionary = buildFactorDictionary(readJson('assets/resources/data/master/gene-dictionary.json'));

    // ── 純度 ───────────────────────────────────────────────────────────────

    suite.test('新邏輯檔案不 import cc', () => {
        const files = [
            'assets/scripts/core/systems/Unveiling.ts',
            'assets/scripts/core/systems/NurtureSystem.ts',
            'assets/scripts/core/services/NurtureService.ts',
            'assets/scripts/core/services/UnveilingService.ts',
        ];
        for (const file of files) {
            const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
            assert.isFalse(/from\s+['"]cc['"]/.test(text), `${file} 不應 import cc`);
        }
    });

    // ── 開獎 ───────────────────────────────────────────────────────────────

    suite.test('開獎：4.75 歲還沒到、5 歲到、已死亡或已開獎的不重複開', () => {
        assert.isFalse(isUnveilingDue(makeChild('a', { age: 4.75 })));
        assert.isTrue(isUnveilingDue(makeChild('a', { age: UNVEILING_AGE })));
        assert.isFalse(isUnveilingDue(makeChild('a', { status: 'dead' })));
        assert.isFalse(isUnveilingDue(unveilGeneral(makeChild('a')).general));
    });

    suite.test('開獎：揭曉六維、移除 mystery 標記、解鎖藍粉因子、綠色維持鎖定', () => {
        const child = makeChild('c', {
            hiddenFlags: ['mystery-phase', 'inbreeding-penalty'],
            genes: [
                { id: 'gene_command', type: 'blue', level: 3, isLocked: true, discoveryLevel: 1 },
                { id: 'gene_cavalry', type: 'pink', level: 2, isLocked: true, discoveryLevel: 1 },
                { id: 'gene_strategy', type: 'green', level: 3, isLocked: true, discoveryLevel: 20 },
            ],
        });
        const before = JSON.stringify(child);
        const { general, event } = unveilGeneral(child, { season: 20, dictionary });

        assert.equals(before, JSON.stringify(child), '不應改到輸入物件');
        assert.equals(GENERAL_STATUS_UNVEILED, general.status);
        assert.equals(20, general.unveiledSeason ?? -1);
        sameJson(['inbreeding-penalty'], general.hiddenFlags);
        sameJson(['gene_command', 'gene_cavalry'], event.unlockedFactorIds);
        assert.isFalse(general.genes![0].isLocked!);
        assert.isFalse(general.genes![1].isLocked!);
        assert.isTrue(general.genes![2].isLocked!, '綠色因子要等覺醒');
        for (const key of ['str', 'int', 'lea', 'pol', 'cha', 'luk'] as const) {
            assert.equals('EXACT', general.dualLayerStats![key]!.revelationLevel!);
            assert.equals(child[key] as number, general.dualLayerStats![key]!.base!);
        }
        assert.equals(1, general.growthModifier!);
    });

    suite.test('開獎：unveilDueGenerals 只動年滿 5 歲的 Mystery 子嗣，且結果可重現', () => {
        const roster = [makeChild('due'), makeChild('young', { age: 3 }), makeChild('adult', { age: 30, status: 'Active' })];
        const first = unveilDueGenerals(roster, { season: 7 });
        const second = unveilDueGenerals(roster, { season: 7 });
        sameJson(first, second);
        assert.lengthEquals(1, first.events);
        assert.equals('due', first.events[0].generalId);
        assert.equals(GENERAL_STATUS_UNVEILED, first.roster[0].status!);
        assert.equals('Mystery', first.roster[1].status!);
        assert.equals('Active', first.roster[2].status!);
    });

    // ── 宿命 ───────────────────────────────────────────────────────────────

    suite.test('宿命建議：因子字典分武 / 文（勇烈、軍紀偏武；治世、權謀偏文）', () => {
        assert.equals('martial', classifyFactorLeaning(dictionary.get('gene_bravery')) as string);
        assert.equals('martial', classifyFactorLeaning(dictionary.get('gene_discipline')) as string);
        assert.equals('civil', classifyFactorLeaning(dictionary.get('gene_politics')) as string);
        assert.equals('civil', classifyFactorLeaning(dictionary.get('gene_strategy')) as string);
        assert.equals('martial', classifyFactorLeaning(dictionary.get('gene_charge')) as string);
        assert.isTrue(classifyFactorLeaning(dictionary.get('gene_honor')) === null, '人格因子不分武文');
        assert.isTrue(classifyFactorLeaning(undefined) === null);
    });

    suite.test('宿命建議：因子星等和比大小；打平看五維；全打平給文官', () => {
        const martial = makeChild('m', { genes: [
            { id: 'gene_bravery', level: 3 }, { id: 'gene_politics', level: 2 },
        ] });
        const r1 = recommendFate(martial, dictionary);
        assert.equals('Warrior', r1.recommended);
        assert.equals('factors', r1.source);
        assert.equals(3, r1.martialScore);
        assert.equals(2, r1.civilScore);

        const civil = makeChild('c', { genes: [
            { id: 'gene_politics', level: 4 }, { id: 'gene_bravery', level: 3 },
        ] });
        assert.equals('Scholar', recommendFate(civil, dictionary).recommended);

        // 因子打平 → 五維：武力 + 統率 vs 智力 + 政治
        const tiedFactorsMartialStats = makeChild('t1', { str: 80, lea: 70, int: 40, pol: 40 });
        const r2 = recommendFate(tiedFactorsMartialStats, dictionary);
        assert.equals('stats', r2.source);
        assert.equals('Warrior', r2.recommended);
        assert.equals('Scholar', recommendFate(makeChild('t2', { str: 40, lea: 40, int: 80, pol: 70 }), dictionary).recommended);
        assert.equals('Scholar', recommendFate(makeChild('t3', { str: 50, lea: 50, int: 50, pol: 50 }), dictionary).recommended);
    });

    suite.test('宿命選擇：順應 = 建議職能 ×1.0；逆天 = 反向職能 ×0.8；只能選一次', () => {
        const unveiled = unveilGeneral(makeChild('c', { str: 80, lea: 70, int: 30, pol: 30 })).general;
        assert.equals('Warrior', unveiled.fate!.recommended);

        const accepted = chooseFate(unveiled, 'accept');
        assert.equals('Warrior', accepted.careerClass!);
        assert.equals(1, accepted.growthModifier!);
        assert.isFalse(accepted.fate!.lateBloomer!);

        const defied = chooseFate(unveiled, 'defy', () => 0.5);
        assert.equals('Scholar', defied.careerClass!);
        assert.equals(FATE_DEFY_GROWTH_MODIFIER, defied.growthModifier!);
        assert.isFalse(defied.fate!.lateBloomer!);

        assert.throws(() => chooseFate(accepted, 'defy'), '已選過不可再選');
        assert.throws(() => chooseFate(makeChild('raw'), 'accept'), '未開獎不可選');
    });

    suite.test('大器晚成：抗命時擲中才標記；25 歲後成長率才逆轉為 ×1.5', () => {
        const unveiled = unveilGeneral(makeChild('c')).general;
        const lucky = chooseFate(unveiled, 'defy', () => 0.05);
        assert.isTrue(lucky.fate!.lateBloomer!);
        assert.equals(FATE_DEFY_GROWTH_MODIFIER, effectiveGrowthModifier({ ...lucky, age: LATE_BLOOMER_AGE - 1 }));
        assert.equals(LATE_BLOOMER_GROWTH_MODIFIER, effectiveGrowthModifier({ ...lucky, age: LATE_BLOOMER_AGE }));

        const unlucky = chooseFate(unveiled, 'defy', () => 0.5);
        assert.equals(FATE_DEFY_GROWTH_MODIFIER, effectiveGrowthModifier({ ...unlucky, age: 40 }));
        // 順應天命不擲骰
        const accepted = chooseFate(unveiled, 'accept', () => 0);
        assert.isFalse(accepted.fate!.lateBloomer!);
    });

    suite.test('UnveilingService：列出待選宿命並寫回名冊', () => {
        const roster = new InMemoryRosterStore([unveilGeneral(makeChild('c')).general, makeChild('raw')]);
        const service = new UnveilingService(roster, () => 0.5);
        sameJson(['c'], service.getPendingFate().map((g) => g.id));
        service.choose('c', 'accept');
        assert.lengthEquals(0, service.getPendingFate());
        assert.equals('accept', (roster.getAll().find((g) => g.id === 'c') as UnveilingGeneral).fate!.choice!);
        assert.throws(() => service.choose('missing', 'accept'));
    });

    // ── 培育公式 ───────────────────────────────────────────────────────────

    suite.test('三階段學年：1~12 / 13~24 / 25~36', () => {
        assert.equals('Foundation', phaseOfRound(1));
        assert.equals('Foundation', phaseOfRound(12));
        assert.equals('Midterm', phaseOfRound(13));
        assert.equals('Midterm', phaseOfRound(24));
        assert.equals('Sprint', phaseOfRound(25));
        assert.equals('Sprint', phaseOfRound(36));
    });

    suite.test('失敗率：>70 為 0；30~70 線性 1%~15%；<30 線性 20%~60%', () => {
        assert.equals(0, failureRateForVigor(100));
        assert.equals(0, failureRateForVigor(71));
        assert.inRange(failureRateForVigor(70), 0.0099, 0.0101);
        assert.inRange(failureRateForVigor(50), 0.079, 0.081);
        assert.inRange(failureRateForVigor(30), 0.1499, 0.1501);
        assert.inRange(failureRateForVigor(29), 0.21, 0.22);
        assert.inRange(failureRateForVigor(0), 0.5999, 0.6001);
        assert.inRange(failureRateForVigor(-10), 0.5999, 0.6001, '負值視為 0');
    });

    suite.test('教官站位：burstRate 內站擅長格，否則平均落在其餘 4 格', () => {
        const mentor = makeMentor('m', { specialty: 'int', burstRate: 0.5 });
        assert.equals('int', rollMentorSlots([mentor], seq(0.1, 0.9))['m']);
        // 其餘 4 格依 TRAINING_KINDS 順序：str、lea、pol、cha
        assert.equals('str', rollMentorSlots([mentor], seq(0.9, 0.0))['m']);
        assert.equals('lea', rollMentorSlots([mentor], seq(0.9, 0.3))['m']);
        assert.equals('pol', rollMentorSlots([mentor], seq(0.9, 0.6))['m']);
        assert.equals('cha', rollMentorSlots([mentor], seq(0.9, 0.99))['m']);
        // 每位教官固定吃 2 個亂數
        const two = rollMentorSlots([mentor, makeMentor('n', { specialty: 'pol', burstRate: 1 })], seq(0.9, 0.0, 0.0, 0.0));
        assert.equals('str', two['m']);
        assert.equals('pol', two['n']);
    });

    suite.test('Stat_Gain：無教官 = 基礎值；教官加成、同格羈絆、爆發、星等、成長率逐項相乘', () => {
        const base = { mentors: [] as TrainingMentor[], mentorSlots: {}, growthModifier: 1 };
        assert.equals(12, computeStatGain(base, 'str', 12).gain);

        const a = makeMentor('a', { tpBonus: 10, specialty: 'str' });
        const b = makeMentor('b', { tpBonus: 10, specialty: 'int' });
        // 兩位都加成 (1 + 0.2)；同格 2 人羈絆 +10%；a 站擅長格爆發 ×1.5
        const stacked = computeStatGain({ mentors: [a, b], mentorSlots: { a: 'str', b: 'str' }, growthModifier: 1 }, 'str', 10);
        assert.equals(20, stacked.gain);
        assert.isTrue(stacked.burst);
        assert.inRange(stacked.synergyBonus, 0.0999, 0.1001);

        // 教官沒站在所選格：只吃 Mentor_Bonus，沒有羈絆與爆發
        const away = computeStatGain({ mentors: [a, b], mentorSlots: { a: 'int', b: 'pol' }, growthModifier: 1 }, 'str', 10);
        assert.equals(12, away.gain);
        assert.isFalse(away.burst);

        // 指定屬性加成 + 星等倍率 ×1.3
        const guan = makeMentor('guan', { tpBonus: 10, statBonus: { str: 20 }, stars: 5, specialty: 'lea' });
        const star = computeStatGain({ mentors: [guan], mentorSlots: { guan: 'int' }, growthModifier: 1 }, 'str', 10);
        assert.equals(14, star.gain, '10 × (1 + (10+20)% × 1.3) = 13.9 → 14');
    });

    suite.test('Stat_Gain：成長率修正（抗命 ×0.8）與至少 +1', () => {
        const s = { mentors: [] as TrainingMentor[], mentorSlots: {}, growthModifier: FATE_DEFY_GROWTH_MODIFIER };
        assert.equals(10, computeStatGain(s, 'str', 12).gain, '12 × 0.8 = 9.6 → 10');
        assert.equals(1, computeStatGain({ ...s, growthModifier: 0.01 }, 'str', 10).gain);
        assert.equals(MENTOR_BURST_MULTIPLIER, 1.5);
    });

    suite.test('TP：基礎 10，吃教官 TP 加成與星等', () => {
        assert.equals(10, computeTpGain([]));
        assert.equals(12, computeTpGain([makeMentor('a', { tpBonus: 20 })]));
        assert.equals(13, computeTpGain([makeMentor('a', { tpBonus: 20, stars: 5 })]), '20% × 1.3 = 26% → 12.6 → 13');
    });

    // ── 培育會話 ───────────────────────────────────────────────────────────

    suite.test('建立會話：複製資質當鏡像快照、不動本體、教官鎖定並骰第 1 回合站位', () => {
        const child = readyChild('c');
        const before = JSON.stringify(child);
        const mentors = [makeMentor('a'), makeMentor('b', { specialty: 'int' })];
        const session = createNurtureSession({ sessionId: 's1', child, mentors, startSeason: 3, random: seeded(1) });

        assert.equals(before, JSON.stringify(child));
        assert.equals(0, session.round);
        assert.equals(100, session.vigor);
        assert.equals(60, session.talent.str);
        assert.equals(40, session.talent.pol);
        sameJson({ str: 0, int: 0, lea: 0, pol: 0, cha: 0 }, session.prowess);
        assert.equals('active', session.status);
        assert.lengthEquals(2, Object.keys(session.mentorSlots));

        // 之後改教官原物件不影響會話內的快照
        mentors[0].tpBonus = 999;
        assert.equals(20, session.mentors[0].tpBonus);
    });

    suite.test('建立會話：教官最多 6 位、不可重複、burstRate 要在 0~1', () => {
        const child = readyChild('c');
        const make = (list: TrainingMentor[]) => () => createNurtureSession({ sessionId: 's', child, mentors: list, startSeason: 0, random: seeded(1) });
        const six = Array.from({ length: NURTURE_MENTOR_SLOTS }, (_, i) => makeMentor(`m${i}`));
        assert.doesNotThrow(make(six));
        assert.throws(make([...six, makeMentor('extra')]), '第 7 位教官');
        assert.throws(make([makeMentor('x'), makeMentor('x')]), '重複教官');
        assert.throws(make([makeMentor('x', { burstRate: 1.2 })]), 'burstRate 超出範圍');
        assert.doesNotThrow(make([]), '沒有教官也能培育');
    });

    suite.test('回合：休息恢復 40~60 精力（上限 100），沒有屬性與 TP', () => {
        const child = readyChild('c');
        let session = createNurtureSession({ sessionId: 's', child, mentors: [], startSeason: 0, random: seeded(1) });
        session = { ...session, vigor: 30 };
        const rested = executeRound(session, 'rest', seq(0)); // 0 → 恢復 40
        assert.equals(70, rested.session.vigor);
        assert.equals(1, rested.session.round);
        assert.equals(0, rested.log.statGained);
        assert.equals(0, rested.session.tp);

        const capped = executeRound({ ...session, vigor: 80 }, 'rest', seq(0.99));
        assert.equals(100, capped.session.vigor);
    });

    suite.test('回合：精力足夠時不會失敗，扣 15~25 精力，依階段取基礎值並給 TP', () => {
        const child = readyChild('c');
        const session = createNurtureSession({ sessionId: 's', child, mentors: [], startSeason: 0, random: seeded(1) });
        // 失敗率 0 時不擲失敗；第一個亂數 = 精力消耗 (0 → 15)，第二個 = 基礎值 (0 → 10)
        const result = executeRound(session, 'str', seq(0, 0, 0.99)); // 第三個亂數 0.99 → 不受傷、不好感
        assert.isTrue(result.log.success);
        assert.equals(85, result.session.vigor);
        assert.equals(10, result.log.statGained);
        assert.equals(10, result.session.prowess.str);
        assert.equals(10, result.session.tp);
        assert.equals('Foundation', result.log.phase);

        const late = executeRound({ ...session, round: 24 }, 'int', seq(0.99, 0.99));
        assert.equals('Sprint', late.log.phase);
        assert.equals(75, late.session.vigor, '亂數 0.99 → 消耗 25 精力');
        assert.equals(40, late.log.statGained, '衝刺期基礎值上限 40');
    });

    suite.test('回合：精力不足會失敗，不加屬性與 TP，可能獲得負面因子且不重複', () => {
        const child = readyChild('c');
        const base = createNurtureSession({ sessionId: 's', child, mentors: [], startSeason: 0, random: seeded(1) });
        const tired = { ...base, vigor: 50 }; // 失敗率 8%
        const failed = executeRound(tired, 'str', seq(0.01, 0, 0.1, 0, 0.99)); // 失敗、扣 15、得因子、挑第 1 個
        assert.isFalse(failed.log.success);
        assert.equals(35, failed.session.vigor);
        assert.equals(0, failed.session.prowess.str);
        assert.equals(0, failed.session.tp);
        sameJson(['挫敗'], failed.session.negativeFactors);

        const again = executeRound({ ...failed.session, vigor: 50 }, 'str', seq(0.01, 0, 0.1, 0, 0.99));
        sameJson(['挫敗', '厭學'], again.session.negativeFactors, '已有挫敗 → 只剩厭學可得');

        const lucky = executeRound(tired, 'str', seq(0.01, 0, 0.9));
        assert.lengthEquals(0, lucky.session.negativeFactors, '50% 沒中就不給');

        const passed = executeRound(tired, 'str', seq(0.5, 0, 0.99));
        assert.isTrue(passed.log.success, 'random ≥ 失敗率則成功');
    });

    suite.test('回合：精力降到 0 不會變負；實力層不超過資質 ×20', () => {
        const child = readyChild('c', { str: 1 });
        const base = createNurtureSession({ sessionId: 's', child, mentors: [], startSeason: 0, random: seeded(1) });
        const drained = executeRound({ ...base, vigor: 10 }, 'int', seq(0.99, 0.99, 0, 0.99));
        assert.equals(0, drained.session.vigor);

        const cap = 1 * PROWESS_PER_TALENT;
        const nearCap = executeRound({ ...base, prowess: { ...base.prowess, str: cap - 2 } }, 'str', seq(0, 0, 0.99));
        assert.equals(cap, nearCap.session.prowess.str);
        assert.equals(2, nearCap.log.statGained);
    });

    suite.test('回合：站在所選格的教官會記進紀錄並提高獲得量', () => {
        const child = readyChild('c');
        const mentor = makeMentor('a', { tpBonus: 0, specialty: 'str', burstRate: 1 });
        const session = createNurtureSession({ sessionId: 's', child, mentors: [mentor], startSeason: 0, random: seq(0, 0) });
        assert.equals('str', session.mentorSlots['a']);
        const result = executeRound(session, 'str', seq(0, 0, 0.99, 0)); // 消耗 15、基礎 10、不受傷、下回合站位
        sameJson(['a'], result.log.mentorsOnSlot);
        assert.isTrue(result.log.burst);
        assert.equals(15, result.log.statGained, '10 × 1.5 爆發');
    });

    suite.test('紅色因子：未鎖定的紅因子總級數加成休息精力回復（每級 +10%），鎖定的不計', () => {
        const child = readyChild('c');
        const dict = buildFactorDictionary([{ id: 'gene_hp', category: 'physique' }, { id: 'gene_lock', category: 'physique' }]);
        const genes = [{ id: 'gene_hp', level: 2, isLocked: false }, { id: 'gene_lock', level: 3, isLocked: true }];
        const red = createNurtureSession({ sessionId: 'rd', child: { ...child, genes }, mentors: [], startSeason: 0, random: seeded(1), factorDictionary: dict });
        assert.equals(2, red.redGeneLevel);
        const plain = createNurtureSession({ sessionId: 'pl', child, mentors: [], startSeason: 0, random: seeded(1) });
        assert.equals(0, plain.redGeneLevel);

        // 休息恢復 40 × (1 + 0.1 × 2) = 48
        assert.equals(78, executeRound({ ...red, vigor: 30 }, 'rest', seq(0)).session.vigor);
        assert.equals(70, executeRound({ ...plain, vigor: 30 }, 'rest', seq(0)).session.vigor);
    });

    suite.test('培育事件：受傷時訓練無效並跳過下一回合；跳過回合不消耗精力也不加屬性', () => {
        const child = readyChild('c');
        const base = createNurtureSession({ sessionId: 's', child, mentors: [], startSeason: 0, random: seeded(1) });
        // 消耗 0 → 15、基礎 0 → 10、受傷擲 0 < 3% → 受傷
        const hurt = executeRound(base, 'str', seq(0, 0, 0));
        assert.isTrue(!!hurt.log.injured);
        assert.equals(0, hurt.log.statGained, '受傷回合的訓練無效');
        assert.equals(0, hurt.session.prowess.str);
        assert.equals(0, hurt.session.tp);
        assert.equals(1, hurt.session.skipRounds);

        const skipped = executeRound(hurt.session, 'int', seq(0.5));
        assert.isTrue(!!skipped.log.skipped);
        assert.equals(2, skipped.session.round, '跳過回合仍然計入回合數');
        assert.equals(hurt.session.vigor, skipped.session.vigor, '跳過回合不消耗精力');
        assert.equals(0, skipped.session.skipRounds);
        assert.equals(0, skipped.session.prowess.int);
        assert.equals('int', skipped.log.action);

        const resumed = executeRound(skipped.session, 'str', seq(0, 0, 0.99));
        assert.isFalse(!!resumed.log.skipped);
        assert.equals(10, resumed.log.statGained, '跳過結束後恢復正常訓練');
    });

    suite.test('培育事件：訓練回合有機會好感 +1，休息回合不擲事件', () => {
        const child = readyChild('c');
        const base = createNurtureSession({ sessionId: 's', child, mentors: [], startSeason: 0, random: seeded(1) });
        assert.equals(0, base.affection);
        assert.equals(0, base.skipRounds);

        // 消耗 0、基礎 0、受傷擲 0.5（不受傷）、好感擲 0.01 < 5% → 好感
        const liked = executeRound(base, 'str', seq(0, 0, 0.5, 0.01));
        assert.isTrue(!!liked.log.affectionGained);
        assert.equals(1, liked.session.affection);
        assert.equals(10, liked.log.statGained, '好感不影響本回合屬性');

        // 休息回合只消耗一個亂數（恢復量），不擲受傷與好感
        const rested = executeRound(liked.session, 'rest', seq(0));
        assert.isFalse(!!rested.log.affectionGained);
        assert.isFalse(!!rested.log.injured);
        assert.equals(1, rested.session.affection);
    });

    suite.test('36 回合：跑完變 completed、站位清空、再出手會拋錯、輸入會話不被修改', () => {
        const child = readyChild('c');
        const mentors = [makeMentor('a'), makeMentor('b', { specialty: 'lea', tpBonus: 10 }), makeMentor('c', { specialty: 'int', stars: 3 })];
        const start = createNurtureSession({ sessionId: 's', child, mentors, startSeason: 0, random: seeded(7) });
        const startJson = JSON.stringify(start);
        const done = playOut(start, seeded(11));

        assert.equals(startJson, JSON.stringify(start), '起始會話不被修改');
        assert.equals(NURTURE_TOTAL_ROUNDS, done.round);
        assert.equals('completed', done.status);
        assert.lengthEquals(NURTURE_TOTAL_ROUNDS, done.log);
        assert.lengthEquals(0, Object.keys(done.mentorSlots));
        assert.throws(() => executeRound(done, 'str', seeded(1)), '完成後不能再出手');

        const gained = done.log.reduce((sum, row) => sum + row.statGained, 0);
        const total = TRAINING_KINDS.reduce((sum, kind) => sum + done.prowess[kind], 0);
        assert.equals(gained, total);
        assert.equals('Foundation', done.log[0].phase);
        assert.equals('Midterm', done.log[12].phase);
        assert.equals('Sprint', done.log[35].phase);
        for (const row of done.log) {
            assert.inRange(row.vigorAfter, 0, 100);
        }
        assert.isTrue(total > 0);
    });

    suite.test('36 回合：同一組亂數種子結果完全相同', () => {
        const child = readyChild('c');
        const mentors = [makeMentor('a')];
        const run = () => playOut(createNurtureSession({ sessionId: 's', child, mentors, startSeason: 0, random: seeded(3) }), seeded(5));
        sameJson(run(), run());
    });

    suite.test('教官讓培育結果變好：同一組亂數下有教官的實力層總和較高', () => {
        const child = readyChild('c');
        const run = (mentors: TrainingMentor[]) => {
            const done = playOut(createNurtureSession({ sessionId: 's', child, mentors, startSeason: 0, random: seeded(3) }), seeded(5));
            return TRAINING_KINDS.reduce((sum, kind) => sum + done.prowess[kind], 0);
        };
        const strong = Array.from({ length: 6 }, (_, i) => makeMentor(`m${i}`, { tpBonus: 30, stars: 5, burstRate: 0.8, specialty: TRAINING_KINDS[i % 5] }));
        assert.isTrue(run(strong) > run([]), '滿編高星教官應優於沒有教官');
    });

    // ── 畢業 ───────────────────────────────────────────────────────────────

    suite.test('評級：五維和（實力層 ÷2、單項上限 100）對 S≥450 / A≥350 / B≥250', () => {
        const p = (str: number, int: number, lea: number, pol: number, cha: number): Record<TrainingKind, number> => ({ str, int, lea, pol, cha });
        assert.equals(250, computeRatingScore(p(100, 100, 100, 100, 100)));
        assert.equals(500, computeRatingScore(p(2000, 2000, 2000, 2000, 2000)), '單項上限 100');
        assert.equals(350, computeRatingScore(p(200, 200, 200, 100, 0)));
        assert.equals('S', ratingOfScore(450));
        assert.equals('A', ratingOfScore(449));
        assert.equals('A', ratingOfScore(350));
        assert.equals('B', ratingOfScore(349));
        assert.equals('B', ratingOfScore(250));
        assert.equals('C', ratingOfScore(249));
    });

    suite.test('畢業標籤：實力層最高的兩項 + 職能路線，0 分不列入', () => {
        sameJson(['猛將預備', '統帥預備', '武官路線'], graduationTags({ str: 300, int: 50, lea: 200, pol: 0, cha: 0 }, 'Warrior'));
        sameJson(['謀士預備', '內政幹才', '文官路線'], graduationTags({ str: 0, int: 400, lea: 0, pol: 90, cha: 90 }, 'Scholar'));
        sameJson([], graduationTags({ str: 0, int: 0, lea: 0, pol: 0, cha: 0 }));
    });

    suite.test('畢業覺醒名號：EP ≥ 98 的天才子嗣寫入「麒麟」；非天才不寫', () => {
        const genius = readyChild('g', { ep: 98 });
        const geniusDone = { ...playOut(createNurtureSession({ sessionId: 'sg', child: genius, mentors: [makeMentor('a')], startSeason: 0, random: seeded(3) }), seeded(5)), prowess: { str: 10, int: 10, lea: 10, pol: 10, cha: 10 } };
        assert.equals('麒麟', graduate(geniusDone, genius).general.awakeningTitle!);

        const normal = readyChild('n', { ep: 50 });
        const normalDone = { ...playOut(createNurtureSession({ sessionId: 'sn', child: normal, mentors: [makeMentor('a')], startSeason: 0, random: seeded(3) }), seeded(5)), prowess: { str: 10, int: 10, lea: 10, pol: 10, cha: 10 } };
        assert.equals(undefined, graduate(normalDone, normal).general.awakeningTitle);
    });

    suite.test('混種戰法接線：父母不同領域來源時，第 15~25 回合才可能觸發，只觸發一次；沒有來源永不觸發', () => {
        const child = readyChild('hy');
        const withSources = createNurtureSession({
            sessionId: 'hy1', child, mentors: [makeMentor('a')], startSeason: 0, random: seeded(1),
            hybridSources: { father: { domain: '火' }, mother: { domain: '水' } },
        });
        let current = withSources;
        for (let i = 0; i < 14; i++) current = executeRound(current, 'rest', () => 0).session;
        assert.equals(undefined, current.hybridRound, '第 15 回合前不觸發');
        current = executeRound(current, 'rest', () => 0).session;
        assert.equals(15, current.hybridRound!, '第 15 回合擲中即觸發');
        const again = executeRound(current, 'rest', () => 0);
        assert.equals(15, again.session.hybridRound!, '觸發後不再改寫');
        assert.isFalse(!!again.log.hybridTriggered);

        const withoutSources = createNurtureSession({ sessionId: 'hy2', child, mentors: [makeMentor('a')], startSeason: 0, random: seeded(1) });
        let plain = withoutSources;
        for (let i = 0; i < 20; i++) plain = executeRound(plain, 'rest', () => 0).session;
        assert.equals(undefined, plain.hybridRound, '沒有來源不擲');
    });

    suite.test('混種來源：取最高等級的綠色因子，領域為字典 defaultTags[0]；沒有綠色因子或沒有父母則無來源', () => {
        const dict = buildFactorDictionary([
            { id: 'gene_charge', color: 'green', category: 'tactic-seed', defaultTags: ['cavalry', 'pierce'] },
            { id: 'gene_fire', color: 'green', category: 'tactic-seed', defaultTags: ['fire'] },
            { id: 'gene_str', color: 'blue', category: 'attribute', defaultTags: ['str'] },
        ]);
        const f = (id: string, color: 'blue' | 'green', level: number) => ({ id, color, level, generation: 1 as const, sourceUids: ['u'] });

        assert.equals('fire', hybridSourceFromFactors([f('gene_str', 'blue', 9), f('gene_charge', 'green', 2), f('gene_fire', 'green', 3)], dict)!.domain, '等級最高的綠色因子');
        assert.equals('cavalry', hybridSourceFromFactors([f('gene_charge', 'green', 2), f('gene_fire', 'green', 2)], dict)!.domain, '同等級取較前面的');
        assert.equals('gene_unknown', hybridSourceFromFactors([f('gene_unknown', 'green', 1)])!.domain, '沒有字典時退回因子 id');
        assert.equals(undefined, hybridSourceFromFactors([f('gene_str', 'blue', 9)], dict), '沒有綠色因子');
        assert.equals(undefined, hybridSourceFromFactors(undefined, dict), '沒有繼承資料');

        const both = hybridSourcesFromParents({ father: [f('gene_fire', 'green', 1)], mother: [f('gene_charge', 'green', 1)] }, dict)!;
        assert.equals('fire', both.father!.domain);
        assert.equals('cavalry', both.mother!.domain);
        assert.equals(undefined, hybridSourcesFromParents(undefined, dict), '沒有父母資料不擲');
        assert.equals(undefined, hybridSourcesFromParents({ father: [f('gene_str', 'blue', 1)] }, dict), '兩邊都沒有綠色因子不擲');
    });

    suite.test('混種來源：推導出的來源傳入會話後，第 15~25 回合才會擲中', () => {
        const child = readyChild('c');
        const sources = hybridSourcesFromParents({
            father: [{ id: 'gene_fire', color: 'green', level: 1, generation: 1, sourceUids: ['f'] }],
            mother: [{ id: 'gene_charge', color: 'green', level: 1, generation: 1, sourceUids: ['m'] }],
        }, buildFactorDictionary([{ id: 'gene_fire', defaultTags: ['fire'] }, { id: 'gene_charge', defaultTags: ['cavalry'] }]));
        const session = createNurtureSession({ sessionId: 'hy3', child, mentors: [], startSeason: 0, random: seeded(1), hybridSources: sources });
        assert.equals('fire', session.hybridSources!.father!.domain);
        let current = session;
        for (let i = 0; i < 14; i++) current = executeRound(current, 'rest', () => 0).session;
        current = executeRound(current, 'rest', () => 0).session;
        assert.equals(15, current.hybridRound!, '第 15 回合擲中（亂數 0 < 5%）');
    });

    suite.test('畢業：實力層與標籤寫回本體，資質層（原五維）不變，未完成或對象不符會拋錯', () => {
        const child = readyChild('c');
        const start = createNurtureSession({ sessionId: 's9', child, mentors: [makeMentor('a')], startSeason: 0, random: seeded(2) });
        assert.throws(() => graduate(start, child), '未完成不能畢業');

        const done = playOut(start, seeded(4));
        assert.throws(() => graduate(done, readyChild('other')), '對象不符');

        const result = graduate(done, child, 9);
        const g = result.general;
        assert.equals(result.rating, g.graduationRating!);
        assert.equals(9, g.graduatedSeason!);
        sameJson(done.prowess, g.prowess);
        for (const kind of TRAINING_KINDS) {
            assert.equals(done.prowess[kind], g.dualLayerStats![kind]!.prowess!);
            assert.equals(child[kind] as number, g[kind] as number, `${kind} 資質層不變`);
        }
        assert.equals('s9', g.trainingProfile!.sourceSessionId!);
        sameJson(result.tags, g.trainingProfile!.graduationTags);
        assert.equals(done.tp, g.nurtureTp!);
        assert.isTrue(child.dualLayerStats!.str!.prowess === undefined, '輸入子嗣不被修改');
    });

    // ── NurtureService ─────────────────────────────────────────────────────

    function serviceWith(roster: GeneralConfig[], mode: { value: GameTimeMode }, season: { value: number }, extra: { admissionsPerSeason?: number } = {}) {
        const store = new InMemoryRosterStore(roster);
        const service = new NurtureService(store, {
            random: seeded(21),
            currentSeason: () => season.value,
            currentMode: () => mode.value,
            ...extra,
        });
        return { store, service };
    }

    suite.test('開場檢查：未開獎 / 宿命未選 / 年齡不足 / 找不到 各有原因', () => {
        const mode = { value: GameTimeMode.Nurture };
        const season = { value: 1 };
        const { service } = serviceWith([
            makeChild('raw'),
            unveilGeneral(makeChild('pending')).general,
            makeChild('young', { age: 3 }),
            readyChild('ok'),
        ], mode, season);

        assert.isTrue(service.checkStart('ok').eligible);
        sameJson(['child-not-found'], service.checkStart('ghost').reasons);
        sameJson(['not-unveiled'], service.checkStart('raw').reasons);
        sameJson(['fate-pending'], service.checkStart('pending').reasons);
        assert.isTrue(service.checkStart('young').reasons.includes('child-underage'));
        assert.throws(() => service.start('pending'));
    });

    suite.test('開場檢查：只能在培育季開場；回合本身不吃季度', () => {
        const mode = { value: GameTimeMode.Governance };
        const season = { value: 1 };
        const { service } = serviceWith([readyChild('ok')], mode, season);
        sameJson(['wrong-season-mode'], service.checkStart('ok').reasons);

        mode.value = GameTimeMode.Nurture;
        const session = service.start('ok');
        mode.value = GameTimeMode.Battle; // 季度換了，培育中的會話仍可繼續
        assert.doesNotThrow(() => service.train('ok', 'str'));
        assert.equals(1, service.getSession('ok')!.round);
        assert.equals(session.sessionId, service.getSession('ok')!.sessionId);
    });

    suite.test('入學令：每季 2 張，用完擋下，換季重置', () => {
        const mode = { value: GameTimeMode.Nurture };
        const season = { value: 5 };
        const { service } = serviceWith([readyChild('a'), readyChild('b'), readyChild('c')], mode, season);
        assert.equals(2, service.admissionsLeft());
        service.start('a');
        service.start('b');
        assert.equals(0, service.admissionsLeft());
        sameJson(['no-admission-token'], service.checkStart('c').reasons);
        season.value = 8;
        assert.equals(2, service.admissionsLeft());
        assert.isTrue(service.checkStart('c').eligible);
    });

    suite.test('教官鎖定：同一位教官不能同時在兩場培育；畢業或放棄後解鎖', () => {
        const mode = { value: GameTimeMode.Nurture };
        const season = { value: 5 };
        const { service } = serviceWith([readyChild('a'), readyChild('b')], mode, season);
        service.start('a', [makeMentor('guan'), makeMentor('zhao')]);

        const blocked = service.checkStart('b', [makeMentor('zhao'), makeMentor('liu')]);
        assert.isFalse(blocked.eligible);
        sameJson(['mentor-locked'], blocked.reasons);
        sameJson(['zhao'], blocked.lockedMentorIds);
        assert.isTrue(service.checkStart('b', [makeMentor('liu')]).eligible);

        service.abandon('a');
        assert.isTrue(service.checkStart('b', [makeMentor('zhao')]).eligible, '放棄後教官解鎖');
    });

    suite.test('同一子嗣不能同時開兩場；教官超過 6 位或重複會被擋', () => {
        const mode = { value: GameTimeMode.Nurture };
        const { service } = serviceWith([readyChild('a')], mode, { value: 1 });
        const seven = Array.from({ length: 7 }, (_, i) => makeMentor(`m${i}`));
        assert.isTrue(service.checkStart('a', seven).reasons.includes('too-many-mentors'));
        assert.isTrue(service.checkStart('a', [makeMentor('x'), makeMentor('x')]).reasons.includes('duplicate-mentor'));
        service.start('a');
        assert.isTrue(service.checkStart('a').reasons.includes('already-nurturing'));
    });

    suite.test('完整流程：開場 → 36 回合 → 畢業，名冊寫回、會話與教官釋放、不可重複畢業', () => {
        const mode = { value: GameTimeMode.Nurture };
        const season = { value: 12 };
        const { store, service } = serviceWith([readyChild('kid')], mode, season);
        service.start('kid', [makeMentor('guan', { statBonus: { str: 20 } })]);
        assert.throws(() => service.graduate('kid'), '還沒練完不能畢業');

        for (let i = 0; i < NURTURE_TOTAL_ROUNDS; i++) {
            const session = service.getSession('kid')!;
            service.train('kid', session.vigor < 45 ? 'rest' : TRAINING_KINDS[i % 5]);
        }
        assert.equals('completed', service.getSession('kid')!.status);
        assert.throws(() => service.train('kid', 'str'));

        const result = service.graduate('kid');
        const saved = store.getAll().find((g) => g.id === 'kid') as unknown as { graduationRating?: string; graduatedSeason?: number };
        assert.equals(result.rating, saved.graduationRating!);
        assert.equals(12, saved.graduatedSeason!);
        assert.isTrue(service.getSession('kid') === null);
        assert.lengthEquals(0, service.lockedMentorIds());
        sameJson(['already-graduated'], service.checkStart('kid').reasons);
    });

    suite.test('放棄：本體不變、入學令不退', () => {
        const mode = { value: GameTimeMode.Nurture };
        const { store, service } = serviceWith([readyChild('kid')], mode, { value: 2 });
        const before = JSON.stringify(store.getAll());
        service.start('kid');
        service.train('kid', 'str');
        service.abandon('kid');
        assert.equals(before, JSON.stringify(store.getAll()));
        assert.equals(1, service.admissionsLeft());
        assert.throws(() => service.abandon('kid'));
    });

    suite.test('狀態存取：getState / restoreState 後從原進度繼續', () => {
        const mode = { value: GameTimeMode.Nurture };
        const roster = [readyChild('kid')];
        const a = serviceWith(roster, mode, { value: 2 });
        a.service.start('kid', [makeMentor('guan')]);
        for (let i = 0; i < 5; i++) a.service.train('kid', 'str');

        const state = JSON.parse(JSON.stringify(a.service.getState()));
        const b = serviceWith(roster, mode, { value: 2 });
        b.service.restoreState(state);
        sameJson(a.service.getSession('kid'), b.service.getSession('kid'));
        assert.equals(5, b.service.getSession('kid')!.round);
        assert.lengthEquals(1, b.service.lockedMentorIds());
        assert.equals(1, b.service.admissionsLeft(), '當季入學令用量也要還原');

        b.service.restoreState(null);
        assert.lengthEquals(0, b.service.getActiveSessions());
        assert.throws(() => b.service.restoreState({ sessions: 'bad' } as never));
    });

    // ── 退役教官卡接培育 ───────────────────────────────────────────────────

    function cardOf(id: string, snapshot: Partial<UnveilingGeneral>, ep = 80): MentorCard {
        return {
            uid: `mentor-${id}`, sourceGeneralId: id, name: id, faction: 'shu',
            retiredAge: 66, retiredSeason: 4, retiredYear: 2, ep_snapshot: ep, gene_refs: ['gene_bravery'],
            parentUids: ['f', 'm'],
            generalSnapshot: { id, name: id, faction: 'shu', hp: 1000, str: 90, int: 40, lea: 70, pol: 30, cha: 50, ...snapshot } as GeneralConfig,
        };
    }

    suite.test('退役教官卡轉培育教官：武官取武力 / 統率較高者，文官取智力 / 政治，加成看 EP 與屬性', () => {
        const warrior = mentorFromCard(cardOf('guan', { careerClass: 'Warrior', int: 99 }, 90));
        assert.equals('mentor-guan', warrior.id);
        assert.equals('str', warrior.specialty);
        assert.equals(9, warrior.tpBonus);
        assert.equals(18, warrior.statBonus!.str!);
        assert.equals(0, warrior.stars!);

        const scholar = mentorFromCard(cardOf('zhuge', { careerClass: 'Scholar', int: 95, pol: 80, str: 99 }), { stars: 3, burstRate: 0.8 });
        assert.equals('int', scholar.specialty);
        assert.equals(8, scholar.tpBonus);
        assert.equals(19, scholar.statBonus!.int!);
        assert.equals(3, scholar.stars!);
        assert.equals(0.8, scholar.burstRate);

        assert.equals('int', mentorFromCard(cardOf('x', { int: 99 })).specialty, '沒職能：五項取最高');
        assert.doesNotThrow(() => createNurtureSession({ sessionId: 's', child: readyChild('c'), mentors: [warrior, scholar], startSeason: 0, random: seeded(1) }));
    });

    suite.test('退役 → 教官卡 → 培育：LegacyService 產生的卡可直接餵給 startWithCards，且同卡不能同時任教兩場', async () => {
        const store = new InMemoryRosterStore([
            { id: 'old', name: 'old', faction: 'shu', gender: '男', age: 66, hp: 900, str: 85, int: 40, lea: 75, pol: 30, cha: 40, luk: 20, ep: 70, careerClass: 'Warrior' } as unknown as GeneralConfig,
            readyChild('kidA'),
            readyChild('kidB'),
        ]);
        const session = new GameSession();
        session.setRosterStore(store);
        session.setLifecycle(new LegacyService(new MemoryStorageAdapter()));
        session.setAutoSave(false);
        const card = await session.retireGeneral('old');

        const nurture = new NurtureService(store, { random: seeded(5), requireNurtureMode: false, currentSeason: () => 8 });
        const started = nurture.startWithCards('kidA', [card]);
        sameJson(['mentor-old'], started.mentors.map((m) => m.id));
        assert.equals('str', started.mentors[0].specialty);
        assert.equals(7, started.mentors[0].tpBonus);
        assert.isFalse(nurture.checkStart('kidB', [mentorFromCard(card)]).eligible);
        sameJson(['mentor-locked'], nurture.checkStart('kidB', [mentorFromCard(card)]).reasons);
    });

    // ── GameSession 整合 ───────────────────────────────────────────────────

    suite.test('GameSession：每季增齡後子嗣滿 5 歲自動開獎並發事件；之後不會重複開獎', async () => {
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([makeChild('kid', { age: 4.75 }), makeChild('baby', { age: 1 })]));
        session.setRandomSource(() => 0.99);
        session.setAutoSave(false);
        const events: { name: string; payload: unknown }[] = [];
        session.setEventEmitter({ emit: (name, payload) => events.push({ name, payload }) });

        const first = await session.advanceSeason();
        assert.lengthEquals(1, first.unveilings);
        assert.equals('kid', first.unveilings[0].generalId);
        const kid = session.roster.find((g) => g.id === 'kid') as UnveilingGeneral;
        assert.equals(GENERAL_STATUS_UNVEILED, kid.status!);
        assert.equals(5, kid.age!);
        assert.equals(first.advance.current.totalSeasonsElapsed, kid.unveiledSeason!);
        assert.lengthEquals(1, events.filter((e) => e.name === GAME_SESSION_EVENTS.GeneralUnveiled));
        assert.equals('Mystery', session.roster.find((g) => g.id === 'baby')!.status!);

        const second = await session.advanceSeason();
        assert.lengthEquals(0, second.unveilings);
    });

    suite.test('存檔：進行中的培育隨快照存讀；舊存檔沒有 nurture 欄位也能讀', async () => {
        const adapter = new MemoryStorageAdapter();
        const build = () => {
            const session = new GameSession();
            const store = new InMemoryRosterStore([readyChild('kid')]);
            session.setRosterStore(store);
            session.setSaveService(new PlayerSaveService(adapter));
            session.setAutoSave(false);
            const service = new NurtureService(store, {
                random: seeded(9),
                currentSeason: () => session.gameTime.totalSeasonsElapsed,
                requireNurtureMode: false,
            });
            session.setNurtureStatePort(service);
            return { session, service };
        };

        const a = build();
        a.service.start('kid', [makeMentor('guan')]);
        for (let i = 0; i < 7; i++) a.service.train('kid', 'int');
        const snapshot = await a.session.save();
        assert.isDefined(snapshot.nurture);

        const b = build();
        assert.isTrue(await b.session.load());
        sameJson(a.service.getSession('kid'), b.service.getSession('kid'));
        assert.equals(7, b.service.getSession('kid')!.round);

        // 舊存檔（沒有 nurture）
        const legacyAdapter = new MemoryStorageAdapter();
        const legacy = new GameSession();
        legacy.setRosterStore(new InMemoryRosterStore([]));
        legacy.setSaveService(new PlayerSaveService(legacyAdapter));
        await legacy.save();
        const c = new GameSession();
        c.setRosterStore(new InMemoryRosterStore([]));
        c.setSaveService(new PlayerSaveService(legacyAdapter));
        const port = new NurtureService(new InMemoryRosterStore([]), {});
        c.setNurtureStatePort(port);
        assert.isTrue(await c.load());
        assert.lengthEquals(0, port.getActiveSessions());
    });

    suite.test('端到端：結緣 → 20 季長到 5 歲開獎 → 順應天命 → 培育季 36 回合 → 畢業', async () => {
        const graph = new BloodlineGraph();
        const person = (uid: string) => ({ uid, template_id: null, name: uid, gene_refs: [] as string[], ep_base: 50, faction: 'shu', is_virtual: false });
        graph.loadFromData({ version: 't', updatedAt: 't', persons: [person('dad'), person('mom')], links: [] });

        const dad = { id: 'dad', name: 'dad', faction: 'shu', gender: '男', age: 30, hp: 1000, vitality: 200, maxVitality: 200, str: 90, int: 50, lea: 80, pol: 40, cha: 50, luk: 40 } as unknown as BreedingGeneral;
        const mom = { id: 'mom', name: 'mom', faction: 'shu', gender: '女', age: 28, hp: 800, vitality: 200, maxVitality: 200, str: 50, int: 70, lea: 60, pol: 60, cha: 70, luk: 40 } as unknown as BreedingGeneral;
        const store = new InMemoryRosterStore([dad, mom]);
        const session = new GameSession();
        session.setRosterStore(store);
        session.setRandomSource(() => 0.99);
        session.setAutoSave(false);
        session.setFactorDictionary(dictionary);

        const breeding = new BreedingService(store, graph, { random: () => 0, currentSeason: () => session.gameTime.totalSeasonsElapsed });
        const born = breeding.breed('dad', 'mom');
        assert.equals('conceived', born.outcome);
        const childId = born.child!.id;
        assert.equals('Mystery', store.getAll().find((g) => g.id === childId)!.status!);

        const unveiledAt: number[] = [];
        for (let i = 0; i < 20; i++) {
            const payload = await session.advanceSeason();
            if (payload.unveilings.length > 0) unveiledAt.push(payload.advance.current.totalSeasonsElapsed);
        }
        sameJson([20], unveiledAt, '出生後第 20 季（0.25 × 20 = 5 歲）開獎');

        const unveiling = new UnveilingService(store, () => 0.5);
        sameJson([childId], unveiling.getPendingFate().map((g) => g.id));
        unveiling.choose(childId, 'accept');

        // 第 20 季後正好是培育模式（治理 → 作戰 → 培育 輪轉）
        assert.equals(GameTimeMode.Nurture, session.gameTime.currentMode);
        const nurture = new NurtureService(store, {
            random: seeded(13),
            currentSeason: () => session.gameTime.totalSeasonsElapsed,
            currentMode: () => session.gameTime.currentMode,
        });
        nurture.start(childId, [makeMentor('guan', { statBonus: { str: 20 } }), makeMentor('zhuge', { specialty: 'int' })]);
        const seasonBefore = session.gameTime.totalSeasonsElapsed;
        for (let i = 0; i < NURTURE_TOTAL_ROUNDS; i++) {
            const current = nurture.getSession(childId)!;
            nurture.train(childId, current.vigor < 45 ? 'rest' : TRAINING_KINDS[i % 5]);
        }
        assert.equals(seasonBefore, session.gameTime.totalSeasonsElapsed, '36 回合都在同一個培育季內');

        const result = nurture.graduate(childId);
        const graduated = store.getAll().find((g) => g.id === childId) as unknown as { graduationRating: string; careerClass: string; prowess: Record<string, number> };
        assert.equals(result.rating, graduated.graduationRating);
        assert.isTrue(['S', 'A', 'B', 'C'].includes(graduated.graduationRating));
        assert.isDefined(graduated.careerClass);
        assert.isTrue(TRAINING_KINDS.some((kind) => graduated.prowess[kind] > 0));
    });

    return suite;
}
