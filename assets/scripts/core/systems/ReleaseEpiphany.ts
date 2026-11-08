// @spec-source → 整併疑問書 Q50=D（doc_spec_0155 處置系統 × doc_spec_0026 培育系統）；WBS LVL-13；PROG-2-1984
/**
 * ReleaseEpiphany — 釋放敵將的頓悟捷徑（純邏輯，不依賴 cc）
 *
 * Q50=D：放走敵將時，要消耗資源，且我方武將達門檻人數才觸發；由我方隨機一名武將習得或升級戰法。
 * 暫定：門檻 10 人（含）、消耗軍資 500；資源不足或人數不足都不扣資源。
 * 「軍師演武模式」規格未定義，本檔不處理（使用者裁決 2026-11-08：P2 延後，不開卡）。
 *
 * 使用者裁決 2026-11-08（PROG-2-1996）：門檻「超過 10 人以上」＝人數 >= 10（含 10）；
 * 頓悟優先習得「教官專屬戰法」中尚未學會的一招；專屬戰法全部學會時，改為既有戰法 Level +1。
 */
import { toLibraryTacticId } from './InspiredTacticMap';
import { TACTIC_EXP_PER_LEVEL, TACTIC_MAX_LEVEL } from './TacticRandomization';

/** 暫定：觸發所需我方武將人數（含） */
export const RELEASE_EPIPHANY_MIN_ROSTER = 10;
/** 暫定：觸發消耗軍資 */
export const RELEASE_EPIPHANY_SUPPLY_COST = 500;

export interface ReleaseEpiphanyInput {
    /** 可受惠的我方武將 id（人數即門檻判斷用） */
    rosterIds: readonly string[];
    supplies: number;
    /** 回傳 [0,1) 的亂數，測試可注入 */
    rng: () => number;
}

export type ReleaseEpiphanyReason = 'triggered' | 'roster-too-small' | 'not-enough-supplies' | 'no-tactic-gain';

export interface ReleaseEpiphanyResult {
    triggered: boolean;
    reason: ReleaseEpiphanyReason;
    /** 習得或升級戰法的武將 */
    winnerId: string | null;
    suppliesAfter: number;
}

export function resolveReleaseEpiphany(input: ReleaseEpiphanyInput): ReleaseEpiphanyResult {
    const miss = (reason: ReleaseEpiphanyReason): ReleaseEpiphanyResult =>
        ({ triggered: false, reason, winnerId: null, suppliesAfter: input.supplies });
    if (input.rosterIds.length < RELEASE_EPIPHANY_MIN_ROSTER) return miss('roster-too-small');
    if (input.supplies < RELEASE_EPIPHANY_SUPPLY_COST) return miss('not-enough-supplies');
    const index = Math.min(input.rosterIds.length - 1, Math.floor(input.rng() * input.rosterIds.length));
    return {
        triggered: true,
        reason: 'triggered',
        winnerId: input.rosterIds[index],
        suppliesAfter: input.supplies - RELEASE_EPIPHANY_SUPPLY_COST,
    };
}

/** 可受惠武將：已學戰法（規格 id 或戰法庫 id）與戰法經驗（以戰法庫 id 為鍵，等級 = 1 + floor(經驗/100)） */
export interface EpiphanyCandidate {
    id: string;
    learned: readonly string[];
    exp: Readonly<Record<string, number>>;
}

export type EpiphanyTacticGain =
    | { kind: 'learn'; tacticId: string }
    | { kind: 'level-up'; tacticId: string; expAfter: number };

export interface ReleaseEpiphanyTacticInput {
    candidates: readonly EpiphanyCandidate[];
    /** 教官專屬戰法（退役教官卡的傳授戰法），不分是否已學 */
    mentorExclusive: readonly string[];
    supplies: number;
    rng: () => number;
}

export interface ReleaseEpiphanyTacticResult extends ReleaseEpiphanyResult {
    gain: EpiphanyTacticGain | null;
    /** 實際扣的軍資（沒觸發為 0） */
    suppliesSpent: number;
}

function pickIndex(length: number, rng: () => number): number {
    return Math.min(length - 1, Math.floor(rng() * length));
}

/** 該武將頓悟的戰法收穫：先找沒學過的教官專屬戰法，學完才升既有戰法 1 級（未滿級者）；兩者都沒有回傳 null */
export function pickEpiphanyGain(winner: EpiphanyCandidate, mentorExclusive: readonly string[], rng: () => number): EpiphanyTacticGain | null {
    const learnedLib = new Set(winner.learned.map(toLibraryTacticId));
    const fresh = Array.from(new Set(mentorExclusive)).filter((id) => !learnedLib.has(toLibraryTacticId(id)));
    if (fresh.length > 0) return { kind: 'learn', tacticId: fresh[pickIndex(fresh.length, rng)] };
    const maxExp = (TACTIC_MAX_LEVEL - 1) * TACTIC_EXP_PER_LEVEL;
    const upgradable = Array.from(learnedLib).filter((id) => (winner.exp[id] ?? 0) < maxExp);
    if (upgradable.length === 0) return null;
    const tacticId = upgradable[pickIndex(upgradable.length, rng)];
    return { kind: 'level-up', tacticId, expAfter: Math.min(maxExp, (winner.exp[tacticId] ?? 0) + TACTIC_EXP_PER_LEVEL) };
}

/** 釋放敵將頓悟（含戰法收穫）：抽到的武將沒有任何戰法收穫時視為不觸發、不扣軍資 */
export function resolveReleaseEpiphanyWithTactic(input: ReleaseEpiphanyTacticInput): ReleaseEpiphanyTacticResult {
    const base = resolveReleaseEpiphany({ rosterIds: input.candidates.map((c) => c.id), supplies: input.supplies, rng: input.rng });
    if (!base.triggered) return { ...base, gain: null, suppliesSpent: 0 };
    const winner = input.candidates.find((c) => c.id === base.winnerId);
    const gain = winner ? pickEpiphanyGain(winner, input.mentorExclusive, input.rng) : null;
    if (!gain) {
        return { triggered: false, reason: 'no-tactic-gain', winnerId: null, suppliesAfter: input.supplies, gain: null, suppliesSpent: 0 };
    }
    return { ...base, gain, suppliesSpent: input.supplies - base.suppliesAfter };
}
