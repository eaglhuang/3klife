// @spec-source → 武將帶兵統御上限與戰場戰損回寫數值錨點規格書.md（doc_spec_0357）；PROG-2-2043
/**
 * CommandSortieLoss — 帶兵上限錨點版公式、出陣閾值與戰損 6:4 回寫（純邏輯，不依賴 cc）
 *
 * - §1 CommandCapacity = 1,000 + LDR×50 + Fame×2 + RankBonus（校尉 500／雜號將軍 2,500／大將軍 10,000）。
 * - §3 SortiePool = min(帶兵上限, 城市駐軍, 關卡上限)；< 500 不得出陣。
 * - §4 戰損：傷兵 floor(60%) 回傷兵營、其餘陣亡永久扣；傷兵每季康復 30%（向下取整）。
 * 既有 SortieDeploy.computeCommandCapacity 是另一版（依將階底數、保底 8,000），兩版並存待裁決。
 */

export const COMMAND_BASE_CAPACITY = 1000;
export const COMMAND_PER_LDR = 50;
export const COMMAND_PER_FAME = 2;
export const COMMAND_RANK_BONUS = { none: 0, colonel: 500, generalTitled: 2500, grandGeneral: 10000 } as const;
export type CommandRankTier = keyof typeof COMMAND_RANK_BONUS;

export const SORTIE_MIN_DEPLOY_TROOPS = 500;
export const LOST_TROOPS_WOUNDED_RATIO = 0.6;
export const WOUNDED_QUARTER_RECOVERY_RATIO = 0.3;

function nonNeg(value: number): number {
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

export function computeAnchorCommandCapacity(ldr: number, fame: number, rank: CommandRankTier): number {
    return COMMAND_BASE_CAPACITY + nonNeg(ldr) * COMMAND_PER_LDR + nonNeg(fame) * COMMAND_PER_FAME + COMMAND_RANK_BONUS[rank];
}

export interface SortiePoolCheck {
    sortiePool: number;
    canDeploy: boolean;
}

export function checkSortiePool(commandCapacity: number, cityAvailableTroops: number, stageTroopCap: number): SortiePoolCheck {
    const sortiePool = Math.min(nonNeg(commandCapacity), nonNeg(cityAvailableTroops), nonNeg(stageTroopCap));
    return { sortiePool, canDeploy: sortiePool >= SORTIE_MIN_DEPLOY_TROOPS };
}

export interface LostTroopsSplit {
    wounded: number;
    dead: number;
}

/** Wounded + Dead 恆等於 LostTroops */
export function splitLostTroops(lostTroops: number): LostTroopsSplit {
    const lost = nonNeg(lostTroops);
    const wounded = Math.floor(lost * LOST_TROOPS_WOUNDED_RATIO);
    return { wounded, dead: lost - wounded };
}

export interface CityTroopLedger {
    /** 城市總預備兵員 */
    reserveTroops: number;
    woundedCamp: number;
}

/** 戰後回寫：全部損失先離開預備兵員，傷兵進傷兵營，陣亡不回來 */
export function applyBattleLoss(ledger: CityTroopLedger, lostTroops: number): CityTroopLedger {
    const { wounded } = splitLostTroops(lostTroops);
    return {
        reserveTroops: Math.max(0, ledger.reserveTroops - nonNeg(lostTroops)),
        woundedCamp: ledger.woundedCamp + wounded,
    };
}

/** 季末傷兵營自然康復 30% 回預備兵員 */
export function recoverWoundedQuarter(ledger: CityTroopLedger): CityTroopLedger {
    const healed = Math.floor(ledger.woundedCamp * WOUNDED_QUARTER_RECOVERY_RATIO);
    return { reserveTroops: ledger.reserveTroops + healed, woundedCamp: ledger.woundedCamp - healed };
}
