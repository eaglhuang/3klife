// @spec-source → 戰場適性系統.md（競技場積分公式，名將挑戰賽用）；名將挑戰賽系統.md K 節（Monthly_Score 沿用同一公式）
/**
 * ArenaScore — 競技場參考戰力積分（純邏輯，不依賴 cc）
 *
 * Score = Σ[(屬性總和 × 地形適性倍率) + (戰法點數 × 剋制係數)] × 存活係數
 * - 屬性總和 = STR + INT + LEA + LUK（不含防守屬性）
 * - 存活係數 = 當前 HP / 最大 HP（0.0 ~ 1.0）
 * - 剋制係數 1.0 ~ 1.5，超出範圍時夾回；未指定視為 1.0
 *
 * Unity 對照：像一個 static 的 ScoreCalculator，輸入是快照資料，輸出一個數字，不碰場景。
 */

export type TerrainRank = 'S' | 'A' | 'B' | 'C' | 'D';

/** 地形適性倍率（規格表）；未知等級在 terrainMultiplierOf 退回 B（1.0，暫定） */
export const TERRAIN_MULTIPLIER: Readonly<Record<TerrainRank, number>> = {
    S: 1.5,
    A: 1.2,
    B: 1.0,
    C: 0.85,
    D: 0.7,
};

export const COUNTER_MIN = 1.0;
export const COUNTER_MAX = 1.5;

export interface ArenaMember {
    str: number;
    int: number;
    lea: number;
    luk: number;
    /** 已配備戰法的等級總和 */
    tacticPoints: number;
    /** 戰法對當前地形／天氣的剋制係數；未指定為 1.0 */
    counter?: number;
    terrain: TerrainRank | string;
    hp: number;
    maxHp: number;
}

function finiteOr(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function terrainMultiplierOf(rank: string): number {
    return TERRAIN_MULTIPLIER[rank as TerrainRank] ?? TERRAIN_MULTIPLIER.B;
}

/** 存活係數：current / max，夾在 0 ~ 1；maxHp ≤ 0 時為 0 */
export function survivalFactorOf(hp: number, maxHp: number): number {
    if (!(maxHp > 0)) return 0;
    return Math.min(1, Math.max(0, finiteOr(hp, 0) / maxHp));
}

export function counterOf(counter: number | undefined): number {
    return Math.min(COUNTER_MAX, Math.max(COUNTER_MIN, finiteOr(counter, COUNTER_MIN)));
}

/** 單一武將的積分 */
export function arenaScoreOf(member: ArenaMember): number {
    const attributeSum = finiteOr(member.str, 0) + finiteOr(member.int, 0) + finiteOr(member.lea, 0) + finiteOr(member.luk, 0);
    const terrain = terrainMultiplierOf(member.terrain);
    const tactic = finiteOr(member.tacticPoints, 0) * counterOf(member.counter);
    return (attributeSum * terrain + tactic) * survivalFactorOf(member.hp, member.maxHp);
}

/** 整組（例如名將挑戰賽的出戰名單）的積分：各成員相加 */
export function arenaScoreOfTeam(members: readonly ArenaMember[]): number {
    return members.reduce((sum, member) => sum + arenaScoreOf(member), 0);
}
