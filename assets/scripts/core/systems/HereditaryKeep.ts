// @spec-source → 領地治理系統.md §E 世襲主城保護（Home_City.Is_Protected、Min_Guaranteed_Territory、背水一戰）；WBS v16.2 GOV-09（PROG-2-0971）
/**
 * HereditaryKeep — 世襲主城保護與背水一戰（純邏輯，不依賴 cc）。
 *
 * - 主城永久不可攻陷，因此玩家至少保有一個領地。
 * - 外圍城池全數失守（領地只剩主城）時，主城防禦 ×2、兵力生產 +50%。
 * - 所有函式都回傳新值，不改輸入。
 *
 * Unity 對照：像一個有 Invulnerable 標記的 GameObject，
 * 其他物件被摧毀時照常移除，但這個標記的物件永遠不會被 Destroy，
 * 並在場上只剩它時打開一組 Buff。
 */

export const LAST_STAND_DEFENSE_MULTIPLIER = 2;
/** 兵力生產加成（+50%） */
export const LAST_STAND_TROOP_PRODUCTION_BONUS = 0.5;

export interface KeepTerritory {
    id: string;
    isHome: boolean;
}

export interface LastStandModifiers {
    defenseMultiplier: number;
    troopProductionBonus: number;
}

export type TerritoryLossRejectReason = 'home-city-protected' | 'territory-not-found';

export interface TerritoryLossResult {
    ok: boolean;
    reason?: TerritoryLossRejectReason;
    territories: KeepTerritory[];
}

/** 主城不可被攻陷，其他領地可以。 */
export function canCaptureTerritory(territory: Readonly<KeepTerritory>): boolean {
    return !territory.isHome;
}

/** 嘗試讓一塊領地失守：主城拒絕，找不到的 ID 也拒絕；成功時回傳移除後的新清單。 */
export function attemptTerritoryLoss(territories: readonly KeepTerritory[], territoryId: string): TerritoryLossResult {
    const target = territories.find(t => t.id === territoryId);
    if (!target) return { ok: false, reason: 'territory-not-found', territories: territories.map(t => ({ ...t })) };
    if (!canCaptureTerritory(target)) {
        return { ok: false, reason: 'home-city-protected', territories: territories.map(t => ({ ...t })) };
    }
    return { ok: true, territories: territories.filter(t => t.id !== territoryId).map(t => ({ ...t })) };
}

/** 領地只剩主城時才觸發背水一戰；否則回傳無加成。 */
export function lastStandModifiers(territories: readonly KeepTerritory[]): LastStandModifiers {
    const onlyHomeLeft = territories.length === 1 && territories[0].isHome;
    if (!onlyHomeLeft) return { defenseMultiplier: 1, troopProductionBonus: 0 };
    return {
        defenseMultiplier: LAST_STAND_DEFENSE_MULTIPLIER,
        troopProductionBonus: LAST_STAND_TROOP_PRODUCTION_BONUS,
    };
}
