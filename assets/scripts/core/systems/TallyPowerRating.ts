// @spec-source → 虎符戰力綜合評級與升星突破成本模型規格書.md（doc_spec_0349）；PROG-2-2035
/**
 * TallyPowerRating — 虎符綜合戰力評分與升星成本（純邏輯，不依賴 cc）
 *
 * - §1 TallyPower = floor(500 × 品質 × (1 + (星 − 1) × 0.25) × 共鳴 × 地形適性)
 * - §2 升星百分之百成功；碎片、精華、銅錢任一不足即拒絕且不扣資源。
 * 既有 BattlePowerRating.calculateTallyPowerMod（每星 +8%）是戰力總評用的另一套係數，未改，取捨待裁決。
 */

export type TallyQuality = 'White' | 'Green' | 'Blue' | 'Purple' | 'Gold' | 'Red';
export type TallyResonance = 'Exclusive' | 'Faction' | 'None';
export type TallyAptitudeRank = 'S' | 'A' | 'B' | 'C' | 'D';

export const TALLY_BASE_RATING = 500;
export const TALLY_STAR_BONUS_PER_LEVEL = 0.25;
export const TALLY_STAR_RANGE = { min: 1, max: 5 };

export const TALLY_QUALITY_MOD: Readonly<Record<TallyQuality, number>> = { White: 1.0, Green: 1.2, Blue: 1.5, Purple: 2.0, Gold: 2.8, Red: 4.0 };
export const TALLY_RESONANCE_MOD: Readonly<Record<TallyResonance, number>> = { Exclusive: 1.35, Faction: 1.15, None: 1.0 };
export const TALLY_APTITUDE_MOD: Readonly<Record<TallyAptitudeRank, number>> = { S: 1.2, A: 1.1, B: 1.0, C: 0.9, D: 0.8 };

export interface TallyPowerInput {
    baseRating?: number;
    quality: TallyQuality;
    starLevel: number;
    resonanceType: TallyResonance;
    aptitudeRank: TallyAptitudeRank;
}

function clampStar(star: number): number {
    return Math.min(TALLY_STAR_RANGE.max, Math.max(TALLY_STAR_RANGE.min, Math.floor(star)));
}

/** §3 綜合戰力（整數） */
export function computeTallyBattlePower(input: TallyPowerInput): number {
    const starMod = 1 + (clampStar(input.starLevel) - 1) * TALLY_STAR_BONUS_PER_LEVEL;
    // 乘數先合併再乘基底，並以 1e-9 修正浮點誤差（例：500×1.2×…）避免整數邊界被 floor 吃掉
    const raw = (input.baseRating ?? TALLY_BASE_RATING)
        * TALLY_QUALITY_MOD[input.quality]
        * starMod
        * TALLY_RESONANCE_MOD[input.resonanceType]
        * TALLY_APTITUDE_MOD[input.aptitudeRank];
    return Math.floor(raw + 1e-9);
}

export interface TallyStarCost {
    shards: number;
    essence: number;
    copper: number;
    unlock: string;
}

/** §2 升到該星所需材料（鍵為目標星） */
export const TALLY_STAR_UP_COST: Readonly<Record<2 | 3 | 4 | 5, TallyStarCost>> = {
    2: { shards: 20, essence: 100, copper: 5000, unlock: 'move+1' },
    3: { shards: 50, essence: 250, copper: 15000, unlock: 'exclusive-tactic-damage+15%' },
    4: { shards: 100, essence: 500, copper: 40000, unlock: 'sortie-grain-cost-20%' },
    5: { shards: 200, essence: 1000, copper: 100000, unlock: 'army-resonance-aura' },
};

export interface TallyWallet {
    shards: number;
    essence: number;
    copper: number;
}

export type TallyStarUpResult =
    | { ok: true; star: number; wallet: TallyWallet; unlock: string }
    | { ok: false; reason: 'max-star' | 'insufficient'; missing: Array<keyof TallyWallet>; wallet: TallyWallet };

/** §4-2 升星原子扣減：全部足夠才一起扣；否則原錢包原樣回傳 */
export function tryTallyStarUp(currentStar: number, wallet: TallyWallet): TallyStarUpResult {
    const star = clampStar(currentStar);
    if (star >= TALLY_STAR_RANGE.max) return { ok: false, reason: 'max-star', missing: [], wallet };
    const target = (star + 1) as 2 | 3 | 4 | 5;
    const cost = TALLY_STAR_UP_COST[target];
    const missing = (['shards', 'essence', 'copper'] as const).filter((key) => wallet[key] < cost[key]);
    if (missing.length > 0) return { ok: false, reason: 'insufficient', missing, wallet };
    return {
        ok: true,
        star: target,
        unlock: cost.unlock,
        wallet: { shards: wallet.shards - cost.shards, essence: wallet.essence - cost.essence, copper: wallet.copper - cost.copper },
    };
}
