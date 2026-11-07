// @spec-source → 延壽仙丹時間加速與不老傳說功能規格書 (doc_spec_0316) §2~§5（TIME-11、LIFE-08、LIFE-12，PROG-2-1942）
/**
 * LongevityRules — 延壽丹次數上限、九轉金丹、韶光符跳季、歲寒禮包與不老傳說回收（純邏輯，不依賴 cc）。
 *
 * 規格定案：
 * - 延壽丹每將終生最多 3 顆（每顆 +3 歲）；九轉還魂金丹 +5 歲、終生 1 顆；陣亡不可服。
 * - 韶光符：跳過當季，推進 1 季（第 4 季後回到第 1 季並換年）。
 * - 第 4 季末發歲寒禮包：補元散 ×2、求籤令 ×1、軍需糧草包 ×1；ClanTier ≥ 2 另得先祖歲賜。
 * - 不老傳說：活動期間 1 位受印名將壽命上限 161 季、活力不衰；活動結束回歸自然上限，
 *   若已超齡給 2 季恩典期，退役轉教官時宗祠聲望 +10。
 *
 * 單顆延壽丹的扣道具與上限計算沿用 LongevityPill.useLongevityPill，本檔補次數守門與其餘規則。
 * 暫定：九轉金丹的鎖血、韶光符的稅收／冷卻結算、禮包隨機精元材料與道具登錄另卡。
 * Unity 對照：像一組 static 規則表，由 GameSession 依結果改存檔。
 */

export const LONGEVITY_PILL_LIFETIME_CAP = 3;
export const NINE_TURN_ELIXIR_YEARS = 5;
export const IMMORTAL_LIFESPAN_SEASONS = 161;
export const IMMORTAL_EVICTION_GRACE_SEASONS = 2;
export const IMMORTAL_RETIRE_SHRINE_BONUS = 10;
export const CARE_PACKAGE_CLAN_TIER = 2;

export type LongevityItemKind = 'pill' | 'nineTurn';

export interface LongevityUseRecord {
    generalId: string;
    pillConsumedCount: number;
    nineTurnConsumed: boolean;
    totalYearsExtended: number;
}

export function emptyLongevityRecord(generalId: string): LongevityUseRecord {
    return { generalId, pillConsumedCount: 0, nineTurnConsumed: false, totalYearsExtended: 0 };
}

export type LongevityUseCheck = { ok: true; years: number } | { ok: false; reason: 'dead' | 'limit' };

/** 服丹前守門：陣亡拒絕；延壽丹滿 3 顆、九轉金丹已服過拒絕。 */
export function checkLongevityUse(record: LongevityUseRecord, kind: LongevityItemKind, isDead: boolean): LongevityUseCheck {
    if (isDead) return { ok: false, reason: 'dead' };
    if (kind === 'pill') return record.pillConsumedCount >= LONGEVITY_PILL_LIFETIME_CAP ? { ok: false, reason: 'limit' } : { ok: true, years: 3 };
    return record.nineTurnConsumed ? { ok: false, reason: 'limit' } : { ok: true, years: NINE_TURN_ELIXIR_YEARS };
}

/** 服丹成功後更新紀錄（呼叫端須先通過 checkLongevityUse）。 */
export function recordLongevityUse(record: LongevityUseRecord, kind: LongevityItemKind, years: number): LongevityUseRecord {
    return kind === 'pill'
        ? { ...record, pillConsumedCount: record.pillConsumedCount + 1, totalYearsExtended: record.totalYearsExtended + years }
        : { ...record, nineTurnConsumed: true, totalYearsExtended: record.totalYearsExtended + years };
}

export interface SeasonClock {
    year: number;
    /** 1~4 */
    season: number;
}

/** 韶光符：推進 1 季，第 4 季後換年。 */
export function advanceSeasonByTimeWarp(clock: SeasonClock): SeasonClock {
    return clock.season >= 4 ? { year: clock.year + 1, season: 1 } : { year: clock.year, season: clock.season + 1 };
}

export interface CarePackage {
    items: Readonly<Record<string, number>>;
    ancestorBlessing: boolean;
}

/** 歲寒禮包：只在第 4 季末發放；ClanTier ≥ 2 另得先祖歲賜。 */
export function seasonEndCarePackage(season: number, clanTier: number): CarePackage | null {
    if (season !== 4) return null;
    return {
        items: { ITEM_ELIXIR: 2, ITEM_ORACLE: 1, ITEM_SUPPLY_PACK: 1 },
        ancestorBlessing: clanTier >= CARE_PACKAGE_CLAN_TIER,
    };
}

export interface ImmortalEventState {
    isActive: boolean;
    blessedGeneralId: string | null;
    gracePeriodRemainingSeasons: number;
}

/** 活動期間受印名將的壽命上限（季）；其他武將維持自然上限。 */
export function effectiveLifespanSeasons(state: ImmortalEventState, generalId: string, naturalSeasons: number): number {
    return state.isActive && state.blessedGeneralId === generalId ? Math.max(naturalSeasons, IMMORTAL_LIFESPAN_SEASONS) : naturalSeasons;
}

/** 受印名將活力不衰。 */
export function isVitalityDecayFrozen(state: ImmortalEventState, generalId: string): boolean {
    return state.isActive && state.blessedGeneralId === generalId;
}

export interface ImmortalEvictionResult {
    state: ImmortalEventState;
    /** 已超齡者給恩典期，退役轉教官時加宗祠聲望 */
    retireShrineBonus: number;
}

/** 活動結束平滑回收：超齡給 2 季恩典期與 +10 宗祠聲望，否則直接回歸自然上限。 */
export function endImmortalEvent(state: ImmortalEventState, ageSeasons: number, naturalSeasons: number): ImmortalEvictionResult {
    const overAge = state.blessedGeneralId !== null && ageSeasons >= naturalSeasons;
    return {
        state: { isActive: false, blessedGeneralId: null, gracePeriodRemainingSeasons: overAge ? IMMORTAL_EVICTION_GRACE_SEASONS : 0 },
        retireShrineBonus: overAge ? IMMORTAL_RETIRE_SHRINE_BONUS : 0,
    };
}

/** 恩典期每季遞減；回傳 0 表示恩典結束，交回正常壽終判定。 */
export function tickImmortalGrace(state: ImmortalEventState): ImmortalEventState {
    return { ...state, gracePeriodRemainingSeasons: Math.max(0, state.gracePeriodRemainingSeasons - 1) };
}
