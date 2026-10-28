// @spec-source → 治理模式他國AI系統.md (doc_spec_0020) E-9 勢力興衰、E-10 時代更迭觸發（PROG-2-1475）
/**
 * RivalRiseFall — 他國勢力每年評估強弱等級，以及判定是否觸發「天下大亂」時代更迭（純邏輯，不依賴 cc）
 *
 * 規格：
 * - 國力 = 兵力＋武將數×200＋領地×500＋名聲。
 * - >10000 HEGEMONY、>6000 STRONG、>3000 STABLE、>1000 DECLINING、其餘 COLLAPSING。
 * - HEGEMONY：他國敵對 +10／季；COLLAPSING：叛逃率 +20%、鄰國入侵機率 +50%。
 * - 時代更迭：最強勢力佔比 ≥ 0.9，或玩家領地 ≤ 2 且連續崩潰 ≥ 3 季。
 *
 * 暫定（可逆）：
 * - 每年評估以季數 % 4 === 0 判定。
 * - 叛逃率與入侵機率為加算值，基礎值由呼叫端決定。
 *
 * Unity 對照：像把勢力分級做成 enum＋查表的 ScriptableObject，年度 Tick 只算分數再查等級。
 */

export type NationStanding = 'HEGEMONY' | 'STRONG' | 'STABLE' | 'DECLINING' | 'COLLAPSING';

export interface NationPowerInput {
    readonly troops: number;
    readonly generalCount: number;
    readonly territories: number;
    readonly fame: number;
}

export const NATION_POWER_WEIGHT = Object.freeze({
    perGeneral: 200,
    perTerritory: 500,
});

/** 由高到低；國力嚴格大於門檻才算該等級 */
export const NATION_STANDING_THRESHOLDS: ReadonlyArray<readonly [NationStanding, number]> = Object.freeze([
    ['HEGEMONY', 10000],
    ['STRONG', 6000],
    ['STABLE', 3000],
    ['DECLINING', 1000],
] as const);

export interface NationStandingEffect {
    /** 其他國家對此勢力每季增加的敵對值 */
    readonly hostilityPerSeason: number;
    /** 武將叛逃率加算 */
    readonly defectionRateBonus: number;
    /** 鄰國入侵機率加算 */
    readonly invasionChanceBonus: number;
}

const NO_EFFECT: NationStandingEffect = Object.freeze({ hostilityPerSeason: 0, defectionRateBonus: 0, invasionChanceBonus: 0 });

export const NATION_STANDING_EFFECTS: Readonly<Record<NationStanding, NationStandingEffect>> = Object.freeze({
    HEGEMONY: { ...NO_EFFECT, hostilityPerSeason: 10 },
    STRONG: NO_EFFECT,
    STABLE: NO_EFFECT,
    DECLINING: NO_EFFECT,
    COLLAPSING: { ...NO_EFFECT, defectionRateBonus: 0.2, invasionChanceBonus: 0.5 },
});

export const SEASONS_PER_YEAR = 4;
export const ERA_SHIFT_DOMAIN_RATIO = 0.9;
export const ERA_SHIFT_PLAYER_MAX_TERRITORIES = 2;
export const ERA_SHIFT_PLAYER_COLLAPSE_SEASONS = 3;

export function nationPowerScore(input: NationPowerInput): number {
    return input.troops
        + input.generalCount * NATION_POWER_WEIGHT.perGeneral
        + input.territories * NATION_POWER_WEIGHT.perTerritory
        + input.fame;
}

export function nationStandingOf(power: number): NationStanding {
    for (const [standing, threshold] of NATION_STANDING_THRESHOLDS) {
        if (power > threshold) return standing;
    }
    return 'COLLAPSING';
}

/** E-9：每年（4 季）評估一次 */
export function shouldEvaluateStanding(season: number): boolean {
    return season % SEASONS_PER_YEAR === 0;
}

export interface EraShiftInput {
    /** 最強勢力的領土佔比 0~1 */
    readonly strongestDomainRatio: number;
    readonly playerTerritories: number;
    /** 玩家連續處於崩潰狀態的季數 */
    readonly playerCollapseSeasons: number;
}

/** E-10 最強勢力領土佔比：所有勢力（含玩家）中領土最多者的比例；無領土時為 0 */
export function strongestDomainRatioOf(territoryCounts: readonly number[]): number {
    const total = territoryCounts.reduce((sum, t) => sum + Math.max(0, t), 0);
    if (total <= 0) return 0;
    return Math.max(0, ...territoryCounts) / total;
}

/** E-10：是否觸發天下大亂重組 */
export function shouldTriggerEraShift(input: EraShiftInput): boolean {
    if (input.strongestDomainRatio >= ERA_SHIFT_DOMAIN_RATIO) return true;
    return input.playerTerritories <= ERA_SHIFT_PLAYER_MAX_TERRITORIES
        && input.playerCollapseSeasons >= ERA_SHIFT_PLAYER_COLLAPSE_SEASONS;
}
