// @spec-source → 戰場適性系統.md §兵種 × 地形強弱勢（PROG-2-0088，WBS APT-04）
/**
 * TerrainTroopRules — 兵種站在特定地形上的固定強弱勢（純邏輯，不依賴 cc）
 *
 * 只收規格有明寫數字的效果；沒有數字的（例如步兵「易被騎兵衝鋒」、機械「射程最大化」）先不列，避免憑空加數值。
 * 這裡只回傳效果，不改傳入物件；接進戰鬥由呼叫端決定。
 *
 * Unity 對照：像 ScriptableObject 裡的「兵種 × 地形」查表，效果值由表決定，戰鬥腳本只讀結果。
 */
import { TerrainType, TroopType } from '../../shared/CommonEnums';

export interface TerrainTroopEffect {
    /** 移動格數增減（騎兵平原 +2、山地 −2、林地 −1） */
    moveDelta: number;
    /** 防禦加成比例（步兵山地 +30%） */
    defenseMult: number;
    /** 射程增減（弓兵水域 −1） */
    attackRangeDelta: number;
    /** 隱蔽加成比例（弓兵林地 +20%） */
    stealthBonus: number;
}

export const NO_TERRAIN_TROOP_EFFECT: TerrainTroopEffect = { moveDelta: 0, defenseMult: 0, attackRangeDelta: 0, stealthBonus: 0 };

const RULES: Readonly<Partial<Record<TroopType, Partial<Record<TerrainType, Partial<TerrainTroopEffect>>>>>> = {
    [TroopType.Cavalry]: {
        [TerrainType.Plain]: { moveDelta: 2 },
        [TerrainType.Mountain]: { moveDelta: -2 },
        [TerrainType.Forest]: { moveDelta: -1 },
    },
    [TroopType.Infantry]: {
        [TerrainType.Mountain]: { defenseMult: 0.3 },
    },
    [TroopType.Archer]: {
        [TerrainType.Forest]: { stealthBonus: 0.2 },
        [TerrainType.River]: { attackRangeDelta: -1 },
    },
};

/**
 * 林地 D 級「視野受限」簡化版（PROG-2-0789，協調者暫定）：
 * 站在林地且林地適性 D 的部隊，只能攻擊相鄰格（射程上限 1），不能對射程 2 以上的目標發動遠程攻擊或戰法。
 * 回傳射程上限；沒有上限時為 null。
 */
export const FOREST_D_ATTACK_RANGE_CAP = 1;

export function terrainAttackRangeCapOf(terrain: TerrainType, terrainGrade: string): number | null {
    return terrain === TerrainType.Forest && terrainGrade === 'D' ? FOREST_D_ATTACK_RANGE_CAP : null;
}

/** 兵種站在地形上的固定效果；沒有規則的組合回傳全 0 */
export function getTerrainTroopEffect(troop: TroopType, terrain: TerrainType): TerrainTroopEffect {
    const partial = RULES[troop]?.[terrain];
    return partial ? { ...NO_TERRAIN_TROOP_EFFECT, ...partial } : NO_TERRAIN_TROOP_EFFECT;
}
