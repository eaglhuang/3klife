// @spec-source → 武將心智提案 §2.2 記憶／§2.3 性格向量／§2.5 心情（PROG-2-9146）
/**
 * 武將心智的規則表與純函式：事件價值、衰減、性格向量、心情。純 TS，不依賴 cc，同輸入必同輸出。
 */
import { offlinePersonalityOf } from '../systems/OfflinePersonalityBehavior';
import type { GeneralPersonalityType } from '../models/GeneralUnit';
import {
    MIND_CONFIG,
    type MindContext,
    type MindEvent,
    type MindEventInput,
    type MindEventKind,
    type MindGeneralView,
    type MindLedger,
    type MindMood,
    type MindValence,
    type MindWeight,
} from './MindTypes';

interface RuleBase { valence: MindValence; weight: MindWeight }

/** 事件基礎價值表（風格同 JOURNAL_EVENT_RULES）；任務／戰後／單挑再由 outcome 與責任歸屬修正。 */
export const MIND_EVENT_RULES: Readonly<Record<MindEventKind, RuleBase>> = {
    TASK_DONE: { valence: 0, weight: 2 },
    TASK_ABORTED: { valence: -1, weight: 1 },
    BATTLE_RESULT: { valence: 0, weight: 2 },
    DUEL: { valence: 0, weight: 3 },
    KILL_GENERAL: { valence: 3, weight: 4 },
    WOUNDED: { valence: -2, weight: 3 },
    CAPTURED: { valence: -3, weight: 4 },
    RESCUED: { valence: 3, weight: 4 },
    PROMOTED: { valence: 3, weight: 5 },
    PRAISED: { valence: 2, weight: 2 },
    SCOLDED: { valence: -2, weight: 2 },
    GIFTED: { valence: 2, weight: 2 },
    IDLE_SEASON: { valence: -1, weight: 1 },
    PASSED_OVER: { valence: -2, weight: 2 },
    REQUEST_GRANTED: { valence: 2, weight: 3 },
    REQUEST_DENIED: { valence: -2, weight: 2 },
    BOND_FORMED: { valence: 2, weight: 5 },
    DESTINY_CHOICE: { valence: 1, weight: 4 },
};

/** 對心情有「正面加成」資格的事件（EAGER 要近期有這類事件） */
const POSITIVE_KINDS: ReadonlySet<MindEventKind> = new Set<MindEventKind>([
    'TASK_DONE', 'BATTLE_RESULT', 'DUEL', 'KILL_GENERAL', 'RESCUED', 'PROMOTED', 'PRAISED', 'GIFTED', 'REQUEST_GRANTED',
]);

function clampValence(n: number): MindValence {
    return Math.max(-3, Math.min(3, Math.round(n))) as MindValence;
}

function clampWeight(n: number): MindWeight {
    return Math.max(1, Math.min(5, Math.round(n))) as MindWeight;
}

/**
 * 由輸入算出 valence／weight／原因碼。責任歸屬（提案 §3.3）：
 * 情報度 ≤1 仍失敗不全是他的錯（降一級）；自請而敗更想雪恥（加重）；被委任而敗記原因碼。
 */
export function ruleFor(input: Readonly<MindEventInput>): { valence: MindValence; weight: MindWeight; reason?: string } {
    const base = MIND_EVENT_RULES[input.kind];
    let valence: number = base.valence;
    let weight: number = base.weight;
    let reason = input.reason;
    const outcome = input.outcome;
    if (input.kind === 'TASK_DONE' || input.kind === 'BATTLE_RESULT' || input.kind === 'DUEL') {
        const win = input.kind === 'DUEL' ? 3 : (input.kind === 'BATTLE_RESULT' ? (input.isLead ? 2 : 1) : 2);
        if (outcome === 'SUCCESS') {
            valence = win;
            if (input.volunteered) { valence += 1; reason = reason ?? 'WIN_VOLUNTEERED'; }
        } else if (outcome === 'FAIL') {
            valence = -win;
            if (input.kind === 'TASK_DONE' && input.intelLevel !== undefined && input.intelLevel <= 1) {
                valence += 1;
                reason = reason ?? 'FAIL_NO_INTEL';
            }
            if (input.volunteered) { valence -= 1; reason = reason ?? 'FAIL_VOLUNTEERED'; }
            if (input.delegated) reason = reason ?? 'FAIL_DELEGATED';
        } else if (outcome === 'PARTIAL') {
            valence = 0;
            weight = 1;
        }
        if ((input.risk ?? 0) >= 4 && input.kind === 'TASK_DONE') weight += 1;
        if (input.injured) valence -= 1;
    }
    return { valence: clampValence(valence), weight: clampWeight(weight), ...(reason ? { reason } : {}) };
}

/** 單筆事件對現在的有效衝擊：valence × (0.5+0.5·weight/5) × 0.8^(經過季數)；里程碑不衰減。 */
export function effectiveValence(event: Readonly<Pick<MindEvent, 'valence' | 'weight' | 'season'>>, now: number): number {
    const scale = 0.5 + 0.5 * event.weight / 5;
    if (event.weight >= MIND_CONFIG.milestoneWeight) return event.valence * scale;
    const age = Math.max(0, now - event.season);
    return event.valence * scale * Math.pow(MIND_CONFIG.decayPerSeason, age);
}

export interface PersonalityVector { bold: number; prudent: number; warm: number; whim: number }

function statOf(g: MindGeneralView, key: 'str' | 'int' | 'lea' | 'pol' | 'cha' | 'luk'): number {
    return g[key] ?? g.stats?.[key] ?? 0;
}

/** 性格向量（不落地、只算）：主軸 0.6、其餘 0.2，再依屬性各最多 ±0.15 微調。 */
export function personalityVector(general: Readonly<MindGeneralView>): PersonalityVector {
    const type = offlinePersonalityOf(general as Parameters<typeof offlinePersonalityOf>[0]);
    const v: PersonalityVector = { bold: 0.2, prudent: 0.2, warm: 0.2, whim: 0.2 };
    if (type === 'Brave') v.bold = 0.6;
    else if (type === 'Wise') v.prudent = 0.6;
    else if (type === 'Loyal') v.warm = 0.6;
    else v.whim = 0.6;
    const adj = (stat: number): number => Math.max(-0.15, Math.min(0.15, (stat - 60) / 40 * 0.15));
    const has = (k: 'str' | 'int' | 'lea' | 'pol' | 'cha' | 'luk'): boolean => statOf(general, k) > 0;
    if (has('str') || has('lea')) v.bold += adj((statOf(general, 'str') + statOf(general, 'lea')) / 2);
    if (has('int') || has('pol')) v.prudent += adj((statOf(general, 'int') + statOf(general, 'pol')) / 2);
    if (has('cha')) v.warm += adj(statOf(general, 'cha'));
    if (has('luk')) v.whim += adj(statOf(general, 'luk'));
    for (const k of Object.keys(v) as Array<keyof PersonalityVector>) v[k] = Math.max(0, Math.min(1, v[k]));
    return v;
}

export function personalityTypeOf(general: Readonly<MindGeneralView> | undefined): GeneralPersonalityType {
    return general ? offlinePersonalityOf(general as Parameters<typeof offlinePersonalityOf>[0]) : 'Loyal';
}

/** 心情分數：近 6 季事件有效衝擊總和＋冷落懲罰＋忠誠修正−受傷修正。 */
export function moodScore(events: readonly MindEvent[], ledger: Readonly<MindLedger> | undefined, now: number, ctx: Readonly<MindContext> = {}): number {
    let sum = 0;
    for (const e of events) {
        const milestone = e.weight >= MIND_CONFIG.milestoneWeight;
        if (!milestone && now - e.season > MIND_CONFIG.moodWindowSeasons) continue;
        sum += effectiveValence(e, now);
    }
    const idle = ledger?.idleSeasons ?? 0;
    if (idle >= MIND_CONFIG.idleThresholdSeasons) {
        sum -= Math.min(MIND_CONFIG.idlePenaltyCap, (idle - MIND_CONFIG.idleThresholdSeasons + 1) * MIND_CONFIG.idlePenaltyPerSeason);
    }
    if (ctx.loyalty !== undefined && !ctx.loyaltyLocked) {
        if (ctx.loyalty < MIND_CONFIG.loyaltyLowBelow) sum -= MIND_CONFIG.loyaltyLowPenalty;
        else if (ctx.loyalty >= MIND_CONFIG.loyaltyHighFrom) sum += MIND_CONFIG.loyaltyHighBonus;
    }
    if (ctx.wounded) sum -= MIND_CONFIG.woundedPenalty;
    return sum;
}

/** 分數→心情。EAGER 還要近 3 季內有正面事件，避免只靠忠誠加成就雀躍。 */
export function moodFrom(score: number, events: readonly MindEvent[], now: number): MindMood {
    if (score >= MIND_CONFIG.eagerMinScore) {
        const recentPositive = events.some(e => POSITIVE_KINDS.has(e.kind) && e.valence > 0 && now - e.season <= MIND_CONFIG.recentPositiveSeasons);
        return recentPositive ? 'EAGER' : 'HIGH';
    }
    if (score >= MIND_CONFIG.highMinScore) return 'HIGH';
    if (score <= MIND_CONFIG.lowMaxScore) return 'LOW';
    return 'NORMAL';
}
