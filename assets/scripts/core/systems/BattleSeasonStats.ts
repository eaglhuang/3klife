/**
 * BattleSeasonStats — 武將賽季戰績：賽季分段累加與切換重置（純邏輯，不依賴 cc）
 *
 * 規格來源：武將戰績系統.md §F「Season_Stats」與 §H 項目 9「賽季戰績重置」。
 * 本模組只負責分段統計與切換時的歸檔，不做獎勵結算（獎勵規格未定，待 PM 定調後另接）。
 *
 * 賽季切換採「惰性重置」：累加時若 seasonId 與目前賽季不同，先重置為新賽季再累加，
 * 舊存檔沒有 season 欄位時也能直接套用。
 *
 * Unity 對照：像每賽季換一本新的計分表，上一季的表先收進 Archive，
 * 新表從零開始；計分表本身不決定獎勵，獎勵由賽季結算流程另外讀取 Archive。
 */

import type { BattlePerformance } from './BattleRecordStats';

export type BattleOutcome = 'win' | 'lose' | 'draw';

export interface SeasonStats {
    seasonId: string;
    wins: number;
    losses: number;
    kills: number;
    totalDamage: number;
    guardianPower: number;
}

export interface SeasonRollover {
    /** 切換前的賽季統計；若上一季完全沒有戰績則為 null，不寫入歸檔 */
    archived: SeasonStats | null;
    /** 切換後的新賽季統計（全部歸零） */
    current: SeasonStats;
}

function nonNeg(value: number | undefined): number {
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

export function emptySeasonStats(seasonId: string): SeasonStats {
    return { seasonId, wins: 0, losses: 0, kills: 0, totalDamage: 0, guardianPower: 0 };
}

/** 舊存檔沒有賽季欄位時回傳 null；賽季 ID 不是有效字串也視為沒有 */
export function normalizeSeasonStats(raw: unknown): SeasonStats | null {
    if (!raw || typeof raw !== 'object') return null;
    const source = raw as Partial<SeasonStats>;
    if (typeof source.seasonId !== 'string' || source.seasonId.length === 0) return null;
    return {
        seasonId: source.seasonId,
        wins: nonNeg(source.wins),
        losses: nonNeg(source.losses),
        kills: nonNeg(source.kills),
        totalDamage: nonNeg(source.totalDamage),
        guardianPower: nonNeg(source.guardianPower),
    };
}

/**
 * 把一場戰鬥累加進賽季統計，回傳新物件（不改動傳入的物件）。
 * 賽季 ID 不同時，先從零開始（舊賽季資料不在這裡歸檔，請用 rolloverSeason）。
 * 平手不計勝場也不計敗場，但表現數值仍累加。
 */
export function accumulateSeasonBattle(
    current: SeasonStats | null | undefined,
    seasonId: string,
    outcome: BattleOutcome,
    performance: BattlePerformance,
): SeasonStats {
    const base = current && current.seasonId === seasonId ? current : emptySeasonStats(seasonId);
    return {
        seasonId,
        wins: base.wins + (outcome === 'win' ? 1 : 0),
        losses: base.losses + (outcome === 'lose' ? 1 : 0),
        kills: base.kills + nonNeg(performance.kills),
        totalDamage: base.totalDamage + nonNeg(performance.damageDealt),
        guardianPower: base.guardianPower + nonNeg(performance.damageTaken) + nonNeg(performance.healingDone),
    };
}

/**
 * 賽季切換：把上一季收進歸檔，回傳新賽季的空統計。
 * 同一賽季重複呼叫不會歸檔（冪等），避免跨季多次結算時重複寫入。
 */
export function rolloverSeason(current: SeasonStats | null | undefined, nextSeasonId: string): SeasonRollover {
    if (current && current.seasonId === nextSeasonId) {
        return { archived: null, current };
    }
    const hasActivity = !!current && (current.wins + current.losses + current.kills + current.totalDamage + current.guardianPower) > 0;
    return {
        archived: current && hasActivity ? current : null,
        current: emptySeasonStats(nextSeasonId),
    };
}
