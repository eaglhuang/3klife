// @spec-source → 宿敵血統交融與狼性突變功能規格書 (doc_spec_0311) §2~§5（REV-04、KIN-05，PROG-2-1938）
/**
 * RivalBreedingOutcome — 宿敵配種的代價、雙峰 EP、狼性突變與混種奧義（純邏輯，不依賴 cc）。
 *
 * 規格定案：
 * - 代價：受孕率 ×0.70、雙方各多扣 20 精力、雙方家族親密度 -15。
 * - EP：基礎 EP = 雙親平均 EP - 10；天命 roll ≥ 80 時再補 +25（淨 +15）。
 * - 狼性白色因子：突變率 35%，雙親精力皆 < 40% 時提高到 50%。
 * - 混種奧義：5 歲開獎時雙親家族親密度 ≥ 80 且子嗣 EP ≥ 85，依雙親宿敵配方查表解鎖。
 *
 * 宿敵判定與受孕率倍率既有實作在 HistoricalPairs（KIN-04），本檔只補其餘結算。
 * 暫定：混種奧義效果的戰場結算與開獎 UI 接線另卡。
 * Unity 對照：像配種結算的一組 static helper，配方表是一張唯讀查表。
 */

export const RIVAL_CONCEPTION_RATE_MOD = 0.7;
export const RIVAL_EXTRA_VITALITY_COST = 20;
export const RIVAL_AFFINITY_COST = 15;
export const RIVAL_EP_PENALTY = 10;
export const RIVAL_DESTINY_ROLL_THRESHOLD = 80;
export const RIVAL_DESTINY_EP_BONUS = 25;
export const WOLF_MUTATION_BASE_CHANCE = 0.35;
export const WOLF_MUTATION_LOW_VITALITY_BONUS = 0.15;
/** 雙親精力皆低於此比例視為絕境受孕 */
export const WOLF_LOW_VITALITY_RATIO = 0.4;
export const HYBRID_ULTIMATE_MIN_AFFINITY = 80;
export const HYBRID_ULTIMATE_MIN_EP = 85;

/** 白色稀有因子：狼性 */
export const WOLF_FACTOR_ID = 'lupine-ferocity';

/** 宿敵配方 → 混種奧義（規格 §4，配方不分先後） */
export const HYBRID_ULTIMATE_RECIPES: readonly { a: string; b: string; ultimateId: string; name: string }[] = [
    { a: 'wolf-gaze', b: 'divine-calc', ultimateId: 'hybrid-ghost-eight-formation', name: '神鬼八陣破' },
    { a: 'demon-valor', b: 'ambitious-hero', ultimateId: 'hybrid-asura-slash', name: '修羅霸烈斬' },
    { a: 'zhou-fire', b: 'iron-wall', ultimateId: 'hybrid-jianghuai-beacon', name: '江淮烽火決' },
];

export interface RivalBreedingResult {
    isRival: boolean;
    conceptionRateMod: number;
    extraVitalityCost: number;
    /** 親密度變化（負數） */
    affinityCost: number;
    /** 相對雙親平均 EP 的修正：-10 或 +15 */
    epModifier: number;
    hasWolfGene: boolean;
    hybridUltimateId?: string;
}

export interface RivalBreedingInput {
    isRival: boolean;
    /** 天命 roll 0~100 */
    destinyRoll: number;
    /** 雙親目前精力比例 0~1 */
    parentVitalityRatios: readonly [number, number];
}

/** 狼性突變機率：35%，雙親精力皆 < 40% 時 50%。 */
export function wolfMutationChance(parentVitalityRatios: readonly [number, number]): number {
    const low = parentVitalityRatios.every((r) => Number.isFinite(r) && r < WOLF_LOW_VITALITY_RATIO);
    return WOLF_MUTATION_BASE_CHANCE + (low ? WOLF_MUTATION_LOW_VITALITY_BONUS : 0);
}

/** EP 修正：天命突破時淨 +15，否則 -10。 */
export function rivalEpModifier(destinyRoll: number): number {
    const breakthrough = Number.isFinite(destinyRoll) && destinyRoll >= RIVAL_DESTINY_ROLL_THRESHOLD;
    return -RIVAL_EP_PENALTY + (breakthrough ? RIVAL_DESTINY_EP_BONUS : 0);
}

/** 結緣當下的宿敵結算；非宿敵回傳無修正。random 回傳 [0,1)。 */
export function resolveRivalBreeding(input: Readonly<RivalBreedingInput>, random: () => number): RivalBreedingResult {
    if (!input.isRival) {
        return { isRival: false, conceptionRateMod: 1, extraVitalityCost: 0, affinityCost: 0, epModifier: 0, hasWolfGene: false };
    }
    const r = random();
    return {
        isRival: true,
        conceptionRateMod: RIVAL_CONCEPTION_RATE_MOD,
        extraVitalityCost: RIVAL_EXTRA_VITALITY_COST,
        affinityCost: -RIVAL_AFFINITY_COST,
        epModifier: rivalEpModifier(input.destinyRoll),
        hasWolfGene: Number.isFinite(r) && r < wolfMutationChance(input.parentVitalityRatios),
    };
}

/** 子嗣 EP = 雙親平均 EP + 宿敵修正。 */
export function rivalChildEp(parentEps: readonly [number, number], epModifier: number): number {
    return (parentEps[0] + parentEps[1]) / 2 + epModifier;
}

/** 5 歲開獎：依雙親宿敵配方、家族親密度與子嗣 EP 查混種奧義；不符回 null。 */
export function hybridUltimateFor(
    parentRecipes: readonly [string, string], familyAffinity: number, childEp: number,
): string | null {
    if (!(familyAffinity >= HYBRID_ULTIMATE_MIN_AFFINITY) || !(childEp >= HYBRID_ULTIMATE_MIN_EP)) return null;
    const [x, y] = parentRecipes;
    const hit = HYBRID_ULTIMATE_RECIPES.find((r) => (r.a === x && r.b === y) || (r.a === y && r.b === x));
    return hit?.ultimateId ?? null;
}
