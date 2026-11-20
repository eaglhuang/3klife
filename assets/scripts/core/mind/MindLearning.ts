// @spec-source → 武將心智提案 §2.4 自我學習感（PROG-2-9150 MIND-2）；使用者 2026-11-17 裁決：只勸阻不抗命
/**
 * 武將心智的「學習規則」：從事件流與累計器現算，不存任何額外狀態（讀檔後自然重建）。純 TS，不依賴 cc，同輸入同輸出。
 * 信心、謹慎／雪恥、羈絆、宿怨、冷落、意願、抗命條件全部在這裡；說話與請求的組句在 MindLineTemplates／MindRequests。
 * Unity 對照：像一組 Behavior 評估函式，讀 Blackboard（事件與累計器）後回傳立場，不改任何資料。
 */
import type { GeneralPersonalityType } from '../models/GeneralUnit';
import type { PersonalityVector } from './MindRules';
import {
    MIND_CONFIG,
    type MindContext,
    type MindEvent,
    type MindLedger,
    type MindMood,
    type MindOpinionStance,
    type MindTagStat,
} from './MindTypes';

/** 同類連敗後的立場：謹慎（要情報才願意）或雪恥（想再戰） */
export type LearnStance = 'NONE' | 'CAUTIOUS' | 'REDEEM';

/** 判定謹慎或雪恥：Brave／Playful 傾向雪恥、Wise／Loyal 傾向謹慎；向量明確偏一邊時以向量為準 */
export function stanceKindOf(type: GeneralPersonalityType, vector: Readonly<PersonalityVector>): 'CAUTIOUS' | 'REDEEM' {
    if (vector.bold >= 0.5 && vector.prudent < 0.5) return 'REDEEM';
    if (vector.prudent >= 0.5 && vector.bold < 0.5) return 'CAUTIOUS';
    return type === 'Brave' || type === 'Playful' ? 'REDEEM' : 'CAUTIOUS';
}

export function stanceOfStat(stat: Readonly<MindTagStat> | undefined, type: GeneralPersonalityType, vector: Readonly<PersonalityVector>): LearnStance {
    if (!stat || stat.streakLoss < MIND_CONFIG.learning.streakLossForStance) return 'NONE';
    return stanceKindOf(type, vector);
}

/** 該標籤最近一筆帶名稱的事件（引用「上回…」用） */
export function latestEventWithTag(events: readonly MindEvent[], tag: string): MindEvent | undefined {
    let best: MindEvent | undefined;
    for (const e of events) {
        if (!e.label || !e.tags.includes(tag)) continue;
        if (e.kind !== 'TASK_DONE' && e.kind !== 'BATTLE_RESULT' && e.kind !== 'DUEL') continue;
        if (!best || e.season >= best.season) best = e;
    }
    return best;
}

/** 信心 (win+1)/(win+loss+2)；近 N 季的同標籤勝負多算一次（×2），事件被擠掉時仍以累計器為底 */
export function confidenceOf(ledger: Readonly<MindLedger> | undefined, tag: string, events: readonly MindEvent[], now: number): number {
    const stat = ledger?.byTag[tag];
    let win = stat?.win ?? 0;
    let loss = stat?.loss ?? 0;
    for (const e of events) {
        if (!e.tags.includes(tag) || !e.outcome || e.outcome === 'PARTIAL') continue;
        if (e.kind !== 'TASK_DONE' && e.kind !== 'BATTLE_RESULT') continue;
        if (now - e.season > MIND_CONFIG.learning.recentSeasons) continue;
        if (e.outcome === 'SUCCESS') win += 1; else loss += 1;
    }
    return (win + 1) / (win + loss + 2);
}

export interface LearnedTag {
    tag: string;
    stance: Exclude<LearnStance, 'NONE'>;
    streak: number;
    /** 最近一次那類事件的名稱與季數（引用用） */
    label?: string;
    season?: number;
    eventId?: string;
}

/** 目前處於謹慎或雪恥的任務類型，連敗越多越前面 */
export function learnedTags(ledger: Readonly<MindLedger> | undefined, events: readonly MindEvent[], type: GeneralPersonalityType, vector: Readonly<PersonalityVector>): LearnedTag[] {
    if (!ledger) return [];
    const out: LearnedTag[] = [];
    for (const [tag, stat] of Object.entries(ledger.byTag)) {
        // t: 是任務成敗等級標籤（PROG-2-9148），只是難度分組，不當成「某類事屢敗」的謹慎／雪恥對象
        if (tag.startsWith('t:')) continue;
        const stance = stanceOfStat(stat, type, vector);
        if (stance === 'NONE') continue;
        const ref = latestEventWithTag(events, tag);
        out.push({ tag, stance, streak: stat.streakLoss, ...(ref ? { label: ref.label, season: ref.season, eventId: ref.id } : {}) });
    }
    out.sort((a, b) => b.streak - a.streak || (a.tag < b.tag ? -1 : 1));
    return out;
}

export interface BondInfo { partnerId: string; together: number; wins: number }

/** 並肩次數達羈絆門檻的搭檔，次數多者在前 */
export function bondsOf(ledger: Readonly<MindLedger> | undefined): BondInfo[] {
    if (!ledger) return [];
    return Object.entries(ledger.partners)
        .filter(([, s]) => s.together >= MIND_CONFIG.bondTogether)
        .map(([partnerId, s]) => ({ partnerId, together: s.together, wins: s.wins }))
        .sort((a, b) => b.together - a.together || (a.partnerId < b.partnerId ? -1 : 1));
}

/** 「受辱」類事件：被罵、被無視、請求被駁回 */
const INSULT_KINDS: ReadonlySet<string> = new Set(['SCOLDED', 'PASSED_OVER', 'REQUEST_DENIED']);

/** 近 window 季、且晚於上次抗命的受辱次數 */
export function insultCount(events: readonly MindEvent[], ledger: Readonly<MindLedger> | undefined, now: number): number {
    const defied = ledger?.defiedSeason;
    let n = 0;
    for (const e of events) {
        if (!INSULT_KINDS.has(e.kind)) continue;
        if (now - e.season > MIND_CONFIG.defiance.insultWindowSeasons) continue;
        if (defied !== undefined && e.season <= defied) continue;
        n += 1;
    }
    return n;
}

/** 極端抗命條件：忠誠 <30（轉蛋鎖 100 者不會）且連續受辱，且每段受辱只抗命一次 */
export function shouldDefy(events: readonly MindEvent[], ledger: Readonly<MindLedger> | undefined, now: number, ctx: Readonly<MindContext>): boolean {
    if (ctx.loyalty === undefined || ctx.loyaltyLocked) return false;
    if (ctx.loyalty >= MIND_CONFIG.defiance.loyaltyBelow) return false;
    return insultCount(events, ledger, now) >= MIND_CONFIG.defiance.insultNeeded;
}

export interface WillingnessInput {
    tags: readonly string[];
    intelLevel?: number;
    partnerIds?: readonly string[];
    mood: MindMood;
    type: GeneralPersonalityType;
    vector: Readonly<PersonalityVector>;
    ledger?: Readonly<MindLedger>;
    events: readonly MindEvent[];
    now: number;
}

export interface WillingnessCause {
    kind: 'CAUTION' | 'REDEEM' | 'CONFIDENT' | 'BOND' | 'GRUDGE';
    tag?: string;
    label?: string;
    season?: number;
    streak?: number;
    partnerId?: string;
    win?: number;
}

export interface WillingnessResult {
    willingness: number;
    stance: MindOpinionStance;
    reasonCodes: string[];
    /** 讓意見台詞引用的主因：連敗類型、同行搭檔、宿敵 */
    cause?: WillingnessCause;
}

const MOOD_ADJ: Readonly<Record<MindMood, number>> = { EAGER: 0.2, HIGH: 0.1, NORMAL: 0, LOW: -0.15 };

/**
 * 意願 0~1：信心基底＋心情＋立場（雪恥 +、謹慎 −且情報不足更重）＋同行者（羈絆 +、宿敵 −）。
 * 確定性、無亂數：連敗後讓他勝一次就回來，是「學習」而非「亂數」。
 */
export function willingnessOf(input: Readonly<WillingnessInput>): WillingnessResult {
    const reasons: string[] = [];
    let cause: WillingnessCause | undefined;
    // 已進入謹慎／雪恥的類型由立場處理（只取連敗最多的一個，避免同一段經歷重複扣分），信心只看其餘標籤
    let stanced: { tag: string; stance: Exclude<LearnStance, 'NONE'>; streak: number } | undefined;
    const plain: string[] = [];
    for (const tag of input.tags) {
        const stat = input.ledger?.byTag[tag];
        const stance = stanceOfStat(stat, input.type, input.vector);
        if (stance === 'NONE') plain.push(tag);
        else if (!stanced || (stat?.streakLoss ?? 0) > stanced.streak) stanced = { tag, stance, streak: stat?.streakLoss ?? 0 };
    }
    let conf = 1;
    let worstTag = plain[0];
    for (const tag of plain) {
        const c = confidenceOf(input.ledger, tag, input.events, input.now);
        if (c <= conf) { conf = c; worstTag = tag; }
    }
    if (plain.length === 0) conf = 0.5;
    let w = 0.5 + (conf - 0.5) * 0.8;
    if (plain.length > 0 && conf >= 0.7) {
        const ref = latestEventWithTag(input.events, worstTag);
        cause = { kind: 'CONFIDENT', tag: worstTag, label: ref?.label, season: ref?.season, win: input.ledger?.byTag[worstTag]?.win ?? 0 };
        reasons.push('CONFIDENT');
    }
    w += MOOD_ADJ[input.mood];
    if (input.mood === 'LOW') reasons.push('MOOD_LOW');
    if (stanced) {
        const ref = latestEventWithTag(input.events, stanced.tag);
        if (stanced.stance === 'REDEEM') {
            w += 0.3;
            cause = { kind: 'REDEEM', tag: stanced.tag, label: ref?.label, season: ref?.season, streak: stanced.streak };
            reasons.push('REDEEM');
        } else {
            const lacking = (input.intelLevel ?? 3) < MIND_CONFIG.opinion.cautionNeedsIntel;
            w -= lacking ? 0.3 : 0;
            cause = { kind: 'CAUTION', tag: stanced.tag, label: ref?.label, season: ref?.season, streak: stanced.streak };
            reasons.push(lacking ? 'CAUTION_NO_INTEL' : 'CAUTION');
        }
    }
    for (const partnerId of input.partnerIds ?? []) {
        if (input.ledger?.grudges.includes(partnerId)) {
            w -= 0.25;
            cause = { kind: 'GRUDGE', partnerId };
            reasons.push('GRUDGE_PARTNER');
        } else if ((input.ledger?.partners[partnerId]?.together ?? 0) >= MIND_CONFIG.bondTogether) {
            w += 0.1;
            if (!cause || cause.kind === 'CONFIDENT') cause = { kind: 'BOND', partnerId };
            reasons.push('BOND_PARTNER');
        }
    }
    const willingness = Math.max(0, Math.min(1, Math.round(w * 100) / 100));
    const o = MIND_CONFIG.opinion;
    const stance: MindOpinionStance = willingness < o.dissuadeBelow ? 'DISSUADE'
        : (willingness < o.cautiousBelow ? 'CAUTIOUS' : (willingness >= o.willingFrom ? 'WILLING' : 'OK'));
    return { willingness, stance, reasonCodes: reasons, ...(cause ? { cause } : {}) };
}

/** 勸阻與謹慎只小幅下修成功率；願意與可行不修正。不會拒絕出任務。 */
export function successDeltaOf(stance: MindOpinionStance): number {
    if (stance === 'DISSUADE') return MIND_CONFIG.opinion.dissuadeSuccessDelta;
    if (stance === 'CAUTIOUS') return MIND_CONFIG.opinion.cautiousSuccessDelta;
    return 0;
}

/** 經歷權重（供季度性格事件抽選）：近 2 季有重大（|valence|≥2）經歷 +0.5、正在連敗 +0.5、被冷落 +0.5；範圍 1~2.5 */
export function experienceWeightOf(events: readonly MindEvent[], ledger: Readonly<MindLedger> | undefined, now: number): number {
    let w = 1;
    if (events.some(e => now - e.season <= 2 && Math.abs(e.valence) >= 2)) w += 0.5;
    if (ledger && Object.values(ledger.byTag).some(s => s.streakLoss >= MIND_CONFIG.learning.streakLossForStance)) w += 0.5;
    if ((ledger?.idleSeasons ?? 0) >= MIND_CONFIG.idleThresholdSeasons) w += 0.5;
    return w;
}
