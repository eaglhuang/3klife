// @spec-source → WBS v3 MERC-04（結義轉永久：結義點數 R100/SR300/SSR600/UR1200；SSR/UR 雙軌美酒路徑依 Q42）、MERC-12（結義後保留數值快照）；傭兵系統規格書：試用轉永久 §5「結義後轉正」
/**
 * MercenaryBondPermanent — 傭兵結義後轉為永久武將的點數扣除與數值快照，純邏輯，不依賴 cc。
 *
 * - 點數路徑：依稀有度扣結義點數，點數不足則拒絕，且不扣任何點數。
 * - 美酒路徑（SSR/UR）：依 Q42 裁決，目前未定，回傳 'wine-path-undecided'，不做扣除。
 * - 快照：結義成功時保留當下的 Stats 作為永久武將初始值（MERC-12）。
 *
 * 規格沒有寫結義點數的來源，這裡只負責扣除；點數來源由後續工單接線。
 * Unity 對照：像商店的 PurchaseOrder，先檢查餘額，再回傳新餘額，不直接改存檔。
 */

export const BOND_POINT_COST = Object.freeze({ R: 100, SR: 300, SSR: 600, UR: 1200 });
export type BondRarity = keyof typeof BOND_POINT_COST;
export type BondPath = 'points' | 'wine';

export interface BondStats {
    STR: number;
    INT: number;
    POL: number;
    CHR: number;
    LUK: number;
}

export interface BondPointsWallet {
    bondPoints: number;
}

export type BondRejectReason = 'insufficient-points' | 'wine-path-undecided' | 'unknown-rarity';

export interface BondPermanentResult {
    ok: boolean;
    reason?: BondRejectReason;
    wallet: BondPointsWallet;
    /** 只有 ok 時有值：結義當下的數值快照，複製後與原物件分離。 */
    snapshot?: BondStats;
    pointsSpent: number;
}

export function isBondRarity(value: string): value is BondRarity {
    return Object.prototype.hasOwnProperty.call(BOND_POINT_COST, value);
}

/** 複製數值快照（MERC-12）：之後傭兵數值再變動也不影響永久武將的初始值。 */
export function snapshotBondStats(stats: Readonly<BondStats>): BondStats {
    return { STR: stats.STR, INT: stats.INT, POL: stats.POL, CHR: stats.CHR, LUK: stats.LUK };
}

/**
 * 結義轉永久。點數足夠才扣點並回傳快照；否則不變動錢包。
 * 回傳新錢包，不改輸入、不用亂數、不寫存檔。
 */
export function bondToPermanent(
    wallet: Readonly<BondPointsWallet>,
    rarity: string,
    path: BondPath,
    stats: Readonly<BondStats>,
): BondPermanentResult {
    const reject = (reason: BondRejectReason): BondPermanentResult => ({
        ok: false,
        reason,
        wallet: { ...wallet },
        pointsSpent: 0,
    });
    if (!isBondRarity(rarity)) return reject('unknown-rarity');
    if (path === 'wine') return reject('wine-path-undecided');
    const cost = BOND_POINT_COST[rarity];
    if (wallet.bondPoints < cost) return reject('insufficient-points');
    return {
        ok: true,
        wallet: { bondPoints: wallet.bondPoints - cost },
        snapshot: snapshotBondStats(stats),
        pointsSpent: cost,
    };
}
