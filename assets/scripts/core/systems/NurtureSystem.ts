// @spec-source → 培育系統.md (doc_spec_0026) §E §F-1 §F-2 §F-6 §I §N、教官系統（支援卡）.md (doc_spec_0027) §F-2 §F-4 §F-8、MVP遊戲驗證規格書.md (doc_spec_0045) §F
/**
 * NurtureSystem — 36 回合培育與教官加成（純邏輯，不依賴 cc）
 *
 * 一場培育：
 *   1. createNurtureSession：複製子嗣數值當鏡像快照（不動本體）、鎖定最多 6 位教官、骰第 1 回合教官站位
 *   2. executeRound ×36：玩家選「武力 / 智力 / 統率 / 政治 / 魅力 / 休息」→ 失敗判定 → 結算 → 骰下一回合站位
 *   3. graduate：實力層寫回本體、算評級與畢業標籤
 *
 * Stat_Gain = Training_Base × (1 + Mentor_Bonus) × (1 + Synergy_Bonus) × 爆發 × Growth_Modifier
 * MVP 先不做隨機事件（Event_Modifier = 0）、因子覺醒與戰法學習。
 * 所有函式都不改輸入物件，亂數由呼叫端注入，方便 headless 測試重現。
 *
 * Unity 對照：像一個 StateMachineBehaviour，每回合是一個 state；
 * 教官就是掛在 Session 上的 buff Component，每回合重新決定「站在哪一格」。
 */
import type { GeneralConfig, GeneralDualLayerStatConfig, GeneralStatsConfig } from '../models/GeneralUnit';
import type { MentorCard } from '../models/MentorCard';
import { RandomSource } from './GeneralAging';
import type { UnveilingGeneral } from './Unveiling';
import { effectiveGrowthModifier } from './Unveiling';

export const NURTURE_TOTAL_ROUNDS = 36;
/** MCQ Q48：固定 6 教官槽，入學快照鎖定 */
export const NURTURE_MENTOR_SLOTS = 6;

export type TrainingKind = 'str' | 'int' | 'lea' | 'pol' | 'cha';
export const TRAINING_KINDS: readonly TrainingKind[] = ['str', 'int', 'lea', 'pol', 'cha'];
export type NurtureAction = TrainingKind | 'rest';

export type PhaseBlock = 'Foundation' | 'Midterm' | 'Sprint';

/** Training_Base：啟蒙 10~15 / 發奮 15~25 / 衝刺 25~40 */
export const TRAINING_BASE_RANGE: Record<PhaseBlock, readonly [number, number]> = {
    Foundation: [10, 15],
    Midterm: [15, 25],
    Sprint: [25, 40],
};

export const VIGOR_MAX = 100;
export const TRAINING_VIGOR_COST: readonly [number, number] = [15, 25];
export const REST_VIGOR_RECOVER: readonly [number, number] = [40, 60];

/** 每次成功訓練的基礎 TP（教官系統 §F-2）；規格另有「固定 5 TP」的說法，採教官系統這條 */
export const BASE_TP_PER_TRAINING = 10;
/** 教官站在擅長格（爆發）：訓練點數 ×1.5 */
export const MENTOR_BURST_MULTIPLIER = 1.5;
/** 同格多一位教官 +10% */
export const SYNERGY_BONUS_PER_EXTRA_MENTOR = 0.1;
/** 教官星等 ★0~★5 的訓練效果倍率（教官系統 §F-4） */
export const MENTOR_STAR_EFFECT: readonly number[] = [1, 1.05, 1.1, 1.15, 1.2, 1.3];

/** 訓練失敗時獲得負面因子的機率；規格只說「有機率」，暫定 50% */
export const NEGATIVE_FACTOR_CHANCE = 0.5;
export const NEGATIVE_FACTORS: readonly string[] = ['挫敗', '厭學'];

/** 資質層（Talent 0~100）對應實力層（Prowess 0~2000）的上限倍率 */
export const PROWESS_PER_TALENT = 20;
/** 評級用五維和是 0~100 尺度；實力層 ÷2 換算（規格未定，暫定，可調） */
export const PROWESS_PER_RATING_POINT = 2;
export const RATING_STAT_CAP = 100;
export const RATING_THRESHOLDS = { S: 450, A: 350, B: 250 } as const;

export type NurtureRating = 'S' | 'A' | 'B' | 'C';
export type NurtureStatus = 'active' | 'completed' | 'abandoned';

export class NurtureError extends Error {}

/**
 * 培育中實際生效的教官（訓練加成參數）。
 * 與 models/MentorCard（退役當下的武將快照）不同：後者是「資料」，這個是「效果」；
 * 退役教官用 mentorFromCard() 轉換，其他來源（卡池、傭兵）直接組出這個型別。
 */
export interface TrainingMentor {
    id: string;
    name: string;
    /** 教官家族名，之後做世家保底時比對子嗣姓氏 */
    familyName?: string;
    /** 突破星等 0~5 */
    stars?: number;
    /** Mentor_TP：屬性獲得率與 TP 的加成（百分比，20 = +20%） */
    tpBonus: number;
    /** 指定屬性額外加成（百分比），如關羽武力 +20 */
    statBonus?: Partial<Record<TrainingKind, number>>;
    /** 擅長科目；站在這一格就是爆發（亮彩） */
    specialty: TrainingKind;
    /** 每回合站在擅長格的機率 0~1（Slot_Burst_Rate） */
    burstRate: number;
}

export interface NurtureRoundLog {
    round: number;
    phase: PhaseBlock;
    action: NurtureAction;
    success: boolean;
    vigorBefore: number;
    vigorAfter: number;
    failureRate: number;
    statGained: number;
    tpGained: number;
    /** 站在所選訓練格的教官 id */
    mentorsOnSlot: string[];
    burst: boolean;
    negativeFactor?: string;
}

/** 培育會話；全部是純資料，可直接 JSON 存檔（對應 Data Schema Nurture_Session） */
export interface NurtureSession {
    sessionId: string;
    childId: string;
    startSeason: number;
    /** 已完成的回合數 0~36 */
    round: number;
    vigor: number;
    /** 鏡像快照：進入培育時的資質層，之後不再改變 */
    talent: Record<TrainingKind, number>;
    /** 本場累積的實力層 */
    prowess: Record<TrainingKind, number>;
    tp: number;
    growthModifier: number;
    /** 入學時鎖定的教官 */
    mentors: TrainingMentor[];
    /** 即將進行的回合，每位教官站在哪一格（玩家選訓練前就看得到） */
    mentorSlots: Record<string, TrainingKind>;
    negativeFactors: string[];
    log: NurtureRoundLog[];
    status: NurtureStatus;
}

// ── 小工具 ─────────────────────────────────────────────────────────────────

export function phaseOfRound(round: number): PhaseBlock {
    if (round <= 12) return 'Foundation';
    if (round <= 24) return 'Midterm';
    return 'Sprint';
}

function randInt(random: RandomSource, min: number, max: number): number {
    return min + Math.floor(random() * (max - min + 1));
}

function emptyStatRecord(): Record<TrainingKind, number> {
    return { str: 0, int: 0, lea: 0, pol: 0, cha: 0 };
}

function statOf(general: GeneralConfig, key: TrainingKind): number {
    const top = (general as unknown as Record<string, unknown>)[key];
    if (typeof top === 'number') return top;
    return general.stats?.[key] ?? 0;
}

/**
 * 失敗率（培育系統 §F-2）：
 * Vigor > 70 → 0%；30~70 → 1%~15% 線性；< 30 → 20%~60% 線性（Vigor 0 = 60%）
 */
export function failureRateForVigor(vigor: number): number {
    if (vigor > 70) return 0;
    if (vigor >= 30) return 0.01 + ((70 - vigor) / 40) * 0.14;
    return 0.2 + ((30 - Math.max(0, vigor)) / 30) * 0.4;
}

function mentorStarEffect(mentor: TrainingMentor): number {
    const stars = Math.max(0, Math.min(5, Math.floor(mentor.stars ?? 0)));
    return MENTOR_STAR_EFFECT[stars];
}

/** 這位教官對指定科目提供的加成（小數，0.2 = +20%），已套用星等倍率 */
export function mentorBonusFor(mentor: TrainingMentor, kind: TrainingKind): number {
    return ((mentor.tpBonus + (mentor.statBonus?.[kind] ?? 0)) / 100) * mentorStarEffect(mentor);
}

/** 骰每位教官本回合站哪一格：burstRate 機率站擅長格，否則平均落在其餘 4 格 */
export function rollMentorSlots(mentors: readonly TrainingMentor[], random: RandomSource): Record<string, TrainingKind> {
    const slots: Record<string, TrainingKind> = {};
    for (const mentor of mentors) {
        // 兩次亂數固定都消耗，測試注入序列時位置才穩定
        const burstRoll = random();
        const otherRoll = random();
        if (burstRoll < mentor.burstRate) {
            slots[mentor.id] = mentor.specialty;
        } else {
            const others = TRAINING_KINDS.filter((kind) => kind !== mentor.specialty);
            slots[mentor.id] = others[Math.min(others.length - 1, Math.floor(otherRoll * others.length))];
        }
    }
    return slots;
}

// ── 開場 ───────────────────────────────────────────────────────────────────

export interface CreateNurtureSessionInput {
    sessionId: string;
    child: UnveilingGeneral;
    mentors: readonly TrainingMentor[];
    startSeason: number;
    random: RandomSource;
}

export function validateMentors(mentors: readonly TrainingMentor[]): void {
    if (mentors.length > NURTURE_MENTOR_SLOTS) {
        throw new NurtureError(`教官最多 ${NURTURE_MENTOR_SLOTS} 位，收到 ${mentors.length} 位`);
    }
    const seen = new Set<string>();
    for (const mentor of mentors) {
        if (seen.has(mentor.id)) throw new NurtureError(`教官 ${mentor.id} 重複指派`);
        seen.add(mentor.id);
        if (!(mentor.burstRate >= 0 && mentor.burstRate <= 1)) {
            throw new NurtureError(`教官 ${mentor.id} 的 burstRate 必須在 0~1：${mentor.burstRate}`);
        }
        if (!TRAINING_KINDS.includes(mentor.specialty)) {
            throw new NurtureError(`教官 ${mentor.id} 的擅長科目不合法：${mentor.specialty}`);
        }
    }
}

export function createNurtureSession(input: CreateNurtureSessionInput): NurtureSession {
    validateMentors(input.mentors);
    const talent = emptyStatRecord();
    for (const kind of TRAINING_KINDS) talent[kind] = statOf(input.child, kind);
    const mentors = input.mentors.map((mentor) => ({ ...mentor, statBonus: mentor.statBonus ? { ...mentor.statBonus } : undefined }));
    return {
        sessionId: input.sessionId,
        childId: input.child.id,
        startSeason: input.startSeason,
        round: 0,
        vigor: VIGOR_MAX,
        talent,
        prowess: emptyStatRecord(),
        tp: 0,
        growthModifier: effectiveGrowthModifier(input.child),
        mentors,
        mentorSlots: rollMentorSlots(mentors, input.random),
        negativeFactors: [],
        log: [],
        status: 'active',
    };
}

// ── 單回合 ─────────────────────────────────────────────────────────────────

export interface GainBreakdown {
    base: number;
    mentorBonus: number;
    synergyBonus: number;
    burst: boolean;
    growthModifier: number;
    gain: number;
}

/** 純公式：給定本回合基礎值與教官站位，算屬性獲得量（不擲骰） */
export function computeStatGain(
    session: Pick<NurtureSession, 'mentors' | 'mentorSlots' | 'growthModifier'>,
    kind: TrainingKind,
    base: number,
): GainBreakdown {
    const mentorBonus = session.mentors.reduce((sum, mentor) => sum + mentorBonusFor(mentor, kind), 0);
    const onSlot = session.mentors.filter((mentor) => session.mentorSlots[mentor.id] === kind);
    const synergyBonus = Math.max(0, onSlot.length - 1) * SYNERGY_BONUS_PER_EXTRA_MENTOR;
    const burst = onSlot.some((mentor) => mentor.specialty === kind);
    const raw = base * (1 + mentorBonus) * (1 + synergyBonus) * (burst ? MENTOR_BURST_MULTIPLIER : 1) * session.growthModifier;
    return { base, mentorBonus, synergyBonus, burst, growthModifier: session.growthModifier, gain: Math.max(1, Math.round(raw)) };
}

export function computeTpGain(mentors: readonly TrainingMentor[]): number {
    const bonus = mentors.reduce((sum, mentor) => sum + (mentor.tpBonus / 100) * mentorStarEffect(mentor), 0);
    return Math.round(BASE_TP_PER_TRAINING * (1 + bonus));
}

/**
 * 執行一個回合，回傳新會話與本回合紀錄（不改輸入）。
 * 亂數消耗順序：休息 → 恢復量；訓練 → 失敗判定（失敗率 0 時不擲）、精力消耗、（成功）基礎值 / （失敗）負面因子判定與挑選；
 * 最後（回合未結束時）為下一回合骰教官站位。
 */
export function executeRound(
    source: NurtureSession,
    action: NurtureAction,
    random: RandomSource,
): { session: NurtureSession; log: NurtureRoundLog } {
    if (source.status !== 'active') throw new NurtureError(`培育會話 ${source.sessionId} 已結束（${source.status}）`);
    if (action !== 'rest' && !TRAINING_KINDS.includes(action)) throw new NurtureError(`不合法的訓練：${String(action)}`);

    const round = source.round + 1;
    const phase = phaseOfRound(round);
    const session: NurtureSession = {
        ...source,
        prowess: { ...source.prowess },
        negativeFactors: [...source.negativeFactors],
        log: [...source.log],
    };
    const vigorBefore = source.vigor;
    const log: NurtureRoundLog = {
        round,
        phase,
        action,
        success: true,
        vigorBefore,
        vigorAfter: vigorBefore,
        failureRate: 0,
        statGained: 0,
        tpGained: 0,
        mentorsOnSlot: [],
        burst: false,
    };

    if (action === 'rest') {
        session.vigor = Math.min(VIGOR_MAX, vigorBefore + randInt(random, REST_VIGOR_RECOVER[0], REST_VIGOR_RECOVER[1]));
    } else {
        const failureRate = failureRateForVigor(vigorBefore);
        const failed = failureRate > 0 && random() < failureRate;
        const cost = randInt(random, TRAINING_VIGOR_COST[0], TRAINING_VIGOR_COST[1]);
        session.vigor = Math.max(0, vigorBefore - cost);
        log.failureRate = failureRate;
        log.mentorsOnSlot = source.mentors.filter((mentor) => source.mentorSlots[mentor.id] === action).map((mentor) => mentor.id);

        if (failed) {
            log.success = false;
            if (random() < NEGATIVE_FACTOR_CHANCE) {
                const pool = NEGATIVE_FACTORS.filter((factor) => !session.negativeFactors.includes(factor));
                if (pool.length > 0) {
                    const factor = pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
                    session.negativeFactors.push(factor);
                    log.negativeFactor = factor;
                }
            }
        } else {
            const [minBase, maxBase] = TRAINING_BASE_RANGE[phase];
            const breakdown = computeStatGain(source, action, randInt(random, minBase, maxBase));
            const cap = source.talent[action] * PROWESS_PER_TALENT;
            const applied = Math.max(0, Math.min(breakdown.gain, cap - session.prowess[action]));
            session.prowess[action] += applied;
            log.statGained = applied;
            log.burst = breakdown.burst;
            log.tpGained = computeTpGain(source.mentors);
            session.tp += log.tpGained;
        }
    }

    log.vigorAfter = session.vigor;
    session.round = round;
    session.log.push(log);
    if (round >= NURTURE_TOTAL_ROUNDS) {
        session.status = 'completed';
        session.mentorSlots = {};
    } else {
        session.mentorSlots = rollMentorSlots(session.mentors, random);
    }
    return { session, log };
}

// ── 畢業 ───────────────────────────────────────────────────────────────────

/** 五維和（0~100 尺度）：每項實力層 ÷2、上限 100 */
export function computeRatingScore(prowess: Record<TrainingKind, number>): number {
    return TRAINING_KINDS.reduce(
        (sum, kind) => sum + Math.min(RATING_STAT_CAP, Math.floor(prowess[kind] / PROWESS_PER_RATING_POINT)),
        0,
    );
}

export function ratingOfScore(score: number): NurtureRating {
    if (score >= RATING_THRESHOLDS.S) return 'S';
    if (score >= RATING_THRESHOLDS.A) return 'A';
    if (score >= RATING_THRESHOLDS.B) return 'B';
    return 'C';
}

const TAG_BY_KIND: Record<TrainingKind, string> = {
    str: '猛將預備',
    lea: '統帥預備',
    int: '謀士預備',
    pol: '內政幹才',
    cha: '魅力人選',
};

/** 畢業標籤：實力層最高的兩項（同分依武力、智力、統率、政治、魅力順序）+ 職能路線 */
export function graduationTags(prowess: Record<TrainingKind, number>, careerClass?: string): string[] {
    const ranked = [...TRAINING_KINDS]
        .map((kind, index) => ({ kind, index }))
        .sort((a, b) => prowess[b.kind] - prowess[a.kind] || a.index - b.index)
        .filter((entry) => prowess[entry.kind] > 0)
        .slice(0, 2)
        .map((entry) => TAG_BY_KIND[entry.kind]);
    if (careerClass === 'Warrior') ranked.push('武官路線');
    else if (careerClass === 'Scholar') ranked.push('文官路線');
    return ranked;
}

/** 畢業後寫回本體的欄位（比照 BreedingGeneral 以延伸型別承載） */
export type NurtureGraduate = UnveilingGeneral & {
    /** 實力層（Prowess） */
    prowess?: Record<TrainingKind, number>;
    graduationRating?: NurtureRating;
    graduatedSeason?: number;
    nurtureTp?: number;
    negativeFactors?: string[];
};

export interface GraduationResult {
    general: NurtureGraduate;
    rating: NurtureRating;
    ratingScore: number;
    tags: string[];
}

/** 36 回合完成後結算：數值寫回本體；會話必須是 completed */
export function graduate(session: NurtureSession, child: UnveilingGeneral, season?: number): GraduationResult {
    if (session.status !== 'completed') throw new NurtureError(`培育會話 ${session.sessionId} 尚未完成（${session.status}）`);
    if (session.childId !== child.id) throw new NurtureError(`培育會話屬於 ${session.childId}，不是 ${child.id}`);

    const ratingScore = computeRatingScore(session.prowess);
    const rating = ratingOfScore(ratingScore);
    const tags = graduationTags(session.prowess, child.careerClass);

    const layers: Partial<Record<keyof GeneralStatsConfig, GeneralDualLayerStatConfig>> = { ...(child.dualLayerStats ?? {}) };
    for (const kind of TRAINING_KINDS) {
        layers[kind] = { ...layers[kind], prowess: session.prowess[kind] };
    }
    const focus = [...TRAINING_KINDS].sort((a, b) => session.prowess[b] - session.prowess[a]).slice(0, 2);
    const general: NurtureGraduate = {
        ...child,
        dualLayerStats: layers,
        prowess: { ...session.prowess },
        graduationRating: rating,
        graduatedSeason: season,
        nurtureTp: session.tp,
        negativeFactors: [...session.negativeFactors],
        trainingProfile: {
            ...child.trainingProfile,
            sourceSessionId: session.sessionId,
            phaseBlock: 'Sprint',
            mentorModeLabel: 'Support',
            recommendedFocus: focus,
            graduationTags: tags,
        },
    };
    return { general, rating, ratingScore, tags };
}

// ── 退役教官卡 → 培育教官 ───────────────────────────────────────────────────

const WARRIOR_KINDS: readonly TrainingKind[] = ['str', 'lea'];
const SCHOLAR_KINDS: readonly TrainingKind[] = ['int', 'pol'];

/** 退役教官轉換的預設值；規格沒有數值，暫定，可由呼叫端覆寫 */
export const MENTOR_CARD_DEFAULT_BURST_RATE = 0.5;
/** tpBonus = ep_snapshot ÷ 10（EP 50 → +5%，EP 90 → +9%） */
export const MENTOR_CARD_EP_PER_TP_POINT = 10;
/** 擅長科目的屬性加成 = 該項數值 ÷ 5（80 → +16%） */
export const MENTOR_CARD_STAT_PER_BONUS_POINT = 5;

/**
 * 把退役教官卡（PROG-2-0029 的 MentorCard）換算成培育教官。
 * - 擅長科目：武官取武力 / 統率較高者、文官取智力 / 政治較高者，沒有職能就五項取最高（同分依武、智、統、政、魅）
 * - 加成：tpBonus 看退役時的 EP，擅長科目另有屬性加成；星等預設 0
 * 教官不參與血統因子遺傳，這裡不讀 gene_refs。
 */
export function mentorFromCard(
    card: MentorCard,
    overrides: Partial<Pick<TrainingMentor, 'stars' | 'burstRate' | 'familyName'>> = {},
): TrainingMentor {
    const snapshot = card.generalSnapshot as UnveilingGeneral;
    const pool = snapshot.careerClass === 'Warrior' ? WARRIOR_KINDS : snapshot.careerClass === 'Scholar' ? SCHOLAR_KINDS : TRAINING_KINDS;
    const specialty = pool.reduce((best, kind) => (statOf(snapshot, kind) > statOf(snapshot, best) ? kind : best), pool[0]);
    return {
        id: card.uid,
        name: card.name,
        tpBonus: Math.round(card.ep_snapshot / MENTOR_CARD_EP_PER_TP_POINT),
        statBonus: { [specialty]: Math.round(statOf(snapshot, specialty) / MENTOR_CARD_STAT_PER_BONUS_POINT) },
        specialty,
        stars: overrides.stars ?? 0,
        burstRate: overrides.burstRate ?? MENTOR_CARD_DEFAULT_BURST_RATE,
        familyName: overrides.familyName,
    };
}
