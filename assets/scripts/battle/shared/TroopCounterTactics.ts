// @spec-source → 戰場策略相剋與即時將階晉升功能規格書.md (doc_spec_0309) §3；PROG-2-1905
/**
 * TroopCounterTactics — 兵種動態相剋的戰術機制（純邏輯，不依賴 cc）。
 *
 * 疊在既有五角剋制倍率（Constants.TROOP_COUNTER_MAP）之上，不改它：
 * - 拒馬槍陣：騎兵正面衝鋒槍兵 → 傷害 0、反傷 120%、騎兵停滯 1 回合。
 * - 縱深突襲：騎兵打弓兵 → 傷害 +35%、必暴、弓兵下回合不能射擊。
 * - 高地射程：弓兵在山地 → 射程 +1；打無盾步兵 +25%。
 * - 林地疾襲：南蠻豹騎在林地 → 移動 +2、無視減速、攻擊必暴 ×1.5。
 * - 蠻王狂嘯：南蠻勇士耗 50 怒氣，周圍 2 格敵軍怯戰（攻 -20%、防 -15%，2 回合）。
 *
 * 南蠻兵種目前沒有獨立 TroopType，以 unitTag 區分。
 *
 * Unity 對照：一張 ScriptableObject 規則表＋一個純函式 Evaluate(ctx)，戰鬥結算時查一次。
 */
import { TerrainType, TroopType } from '../../core/config/Constants';

export type NanmanTroopTag = 'nanman-warrior' | 'nanman-leopard';

export type CounterMechanicId = 'JUMA_PIKE_WALL' | 'DEEP_RAID' | 'HIGH_GROUND_VOLLEY' | 'FOREST_RAID';

export const TROOP_COUNTER_TUNING = {
    pikeReflectPct: 120,
    pikeStallTurns: 1,
    deepRaidDamagePct: 135,
    deepRaidNoShootTurns: 1,
    highGroundRangeBonus: 1,
    highGroundDamagePct: 125,
    forestMoveBonus: 2,
    forestCritMultiplier: 1.5,
    roarRageCost: 50,
    roarRadius: 2,
    roarAttackPct: -20,
    roarDefensePct: -15,
    roarTurns: 2,
} as const;

export const COUNTER_MECHANIC_NAMES: Record<CounterMechanicId, string> = {
    JUMA_PIKE_WALL: '拒馬槍陣',
    DEEP_RAID: '縱深突襲',
    HIGH_GROUND_VOLLEY: '高地射程',
    FOREST_RAID: '林地疾襲',
};

export interface CounterContext {
    attackerTroop: TroopType;
    defenderTroop: TroopType;
    attackerTag?: NanmanTroopTag;
    /** 攻擊者所在地形 */
    attackerTerrain: TerrainType;
    /** 是否為衝鋒（移動後近戰） */
    isCharge?: boolean;
    /** 是否正面接敵（拒馬只擋正面） */
    frontal?: boolean;
    /** 防守方是否有盾牌保護 */
    defenderShielded?: boolean;
}

export interface CounterOutcome {
    mechanic: CounterMechanicId | null;
    /** 對防守方傷害百分比（100 = 不變） */
    damagePct: number;
    /** 攻擊方承受的反傷（佔原傷害的百分比） */
    reflectPct: number;
    forceCrit: boolean;
    /** 必暴時的暴擊倍率；0 表示用戰場預設 */
    critMultiplier: number;
    attackerStalledTurns: number;
    defenderNoShootTurns: number;
}

const NEUTRAL: CounterOutcome = {
    mechanic: null, damagePct: 100, reflectPct: 0, forceCrit: false, critMultiplier: 0, attackerStalledTurns: 0, defenderNoShootTurns: 0,
};

const HIGH_GROUND: ReadonlySet<TerrainType> = new Set([TerrainType.Mountain]);

export function evaluateTroopCounter(ctx: Readonly<CounterContext>): CounterOutcome {
    const t = TROOP_COUNTER_TUNING;
    if (ctx.attackerTag === 'nanman-leopard' && ctx.attackerTerrain === TerrainType.Forest) {
        return { ...NEUTRAL, mechanic: 'FOREST_RAID', forceCrit: true, critMultiplier: t.forestCritMultiplier };
    }
    if (ctx.attackerTroop === TroopType.Cavalry && ctx.defenderTroop === TroopType.Pikeman && ctx.isCharge && ctx.frontal) {
        return { ...NEUTRAL, mechanic: 'JUMA_PIKE_WALL', damagePct: 0, reflectPct: t.pikeReflectPct, attackerStalledTurns: t.pikeStallTurns };
    }
    if (ctx.attackerTroop === TroopType.Cavalry && ctx.defenderTroop === TroopType.Archer) {
        return { ...NEUTRAL, mechanic: 'DEEP_RAID', damagePct: t.deepRaidDamagePct, forceCrit: true, defenderNoShootTurns: t.deepRaidNoShootTurns };
    }
    if (ctx.attackerTroop === TroopType.Archer && HIGH_GROUND.has(ctx.attackerTerrain)
        && ctx.defenderTroop === TroopType.Infantry && !ctx.defenderShielded) {
        return { ...NEUTRAL, mechanic: 'HIGH_GROUND_VOLLEY', damagePct: t.highGroundDamagePct };
    }
    return { ...NEUTRAL };
}

/** 反傷量：原本會打出的傷害 × 反傷百分比 */
export function counterReflectDamage(rawDamage: number, outcome: Readonly<CounterOutcome>): number {
    return Math.floor(Math.max(0, rawDamage) * outcome.reflectPct / 100);
}

/** 弓兵在高地的射程加成 */
export function troopRangeBonus(troop: TroopType, terrain: TerrainType): number {
    return troop === TroopType.Archer && HIGH_GROUND.has(terrain) ? TROOP_COUNTER_TUNING.highGroundRangeBonus : 0;
}

/** 移動力加成；豹騎在林地 +2 並無視林地減速 */
export function troopMoveModifier(tag: NanmanTroopTag | undefined, terrain: TerrainType): { moveBonus: number; ignoreTerrainPenalty: boolean } {
    if (tag === 'nanman-leopard' && terrain === TerrainType.Forest) {
        return { moveBonus: TROOP_COUNTER_TUNING.forestMoveBonus, ignoreTerrainPenalty: true };
    }
    return { moveBonus: 0, ignoreTerrainPenalty: false };
}

export interface GridPos { lane: number; depth: number; }

export interface RoarTarget { uid: string; pos: GridPos; }

export interface NanmanRoarResult {
    rageAfter: number;
    affectedUids: string[];
    debuff: { name: string; attackPct: number; defensePct: number; turns: number };
}

/** 蠻王狂嘯：怒氣不足回傳 null；範圍以格距（切比雪夫距離）≤ 2 計 */
export function resolveNanmanRoar(caster: GridPos, rage: number, enemies: readonly RoarTarget[]): NanmanRoarResult | null {
    const t = TROOP_COUNTER_TUNING;
    if (rage < t.roarRageCost) return null;
    const affectedUids = enemies
        .filter((e) => Math.max(Math.abs(e.pos.lane - caster.lane), Math.abs(e.pos.depth - caster.depth)) <= t.roarRadius)
        .map((e) => e.uid);
    return {
        rageAfter: rage - t.roarRageCost,
        affectedUids,
        debuff: { name: '怯戰', attackPct: t.roarAttackPct, defensePct: t.roarDefensePct, turns: t.roarTurns },
    };
}
