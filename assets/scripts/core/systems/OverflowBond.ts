// @spec-source → 轉蛋系統.md §J（結義點數 Bond_Points、結義金蘭卡）與 §F 轉生；數值系統.md「傭兵結義點數」BOND_COST；PROG-2-0315（WBS GCH-06）
/**
 * OverflowBond — 滿轉溢出轉結義點數（純邏輯，不依賴 cc）
 *
 * 武將已滿 5 轉還重複抽到時（Rebirth.applyDuplicatePull 回報 overflow），
 * 不再白送，改換成結義點數。結義點數用於傭兵轉永久（經濟系統.md）。
 *
 * 暫定數字（規格未定，PM 依可逆原則選定，待使用者裁決）：
 *   溢出獎勵依武將稀有度對應傭兵結義費用表（R100 / SR300 / SSR600 / UR1200），
 *   即一次溢出 = 一次結義的費用，方便玩家理解。
 *   稀有度對應：common→R、rare→SR、epic→SSR、legendary / mythic→UR。
 *
 * Unity 對照：類似掉落表 DropTable，溢出時依稀有度查表，回傳獎勵數量，
 * 由 GameSession 加進玩家存檔的貨幣欄位。
 */

export type OverflowRarityTier = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

/** 傭兵結義費用表（數值系統.md）：溢出獎勵以此為基準 */
export const BOND_POINTS_BY_RARITY: Readonly<Record<OverflowRarityTier, number>> = {
    common: 100,
    rare: 300,
    epic: 600,
    legendary: 1200,
    mythic: 1200,
};

/** 單次溢出可得的結義點數（未知稀有度視為 common） */
export function overflowBondPoints(rarityTier: string | undefined): number {
    if (rarityTier && Object.prototype.hasOwnProperty.call(BOND_POINTS_BY_RARITY, rarityTier)) {
        return BOND_POINTS_BY_RARITY[rarityTier as OverflowRarityTier];
    }
    return BOND_POINTS_BY_RARITY.common;
}

/** 存檔讀回的結義點數：非有限數或負數視為 0，小數無條件捨去。 */
export function normalizeBondPoints(value: unknown): number {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return 0;
    return Math.floor(value);
}

/** 武將稀有度：有明確 rarityTier 就用它，否則依 characterCategory 推斷（與轉蛋抽卡顯示一致） */
export function overflowRarityOf(general: { rarityTier?: string; characterCategory?: string }): OverflowRarityTier {
    if (general.rarityTier && Object.prototype.hasOwnProperty.call(BOND_POINTS_BY_RARITY, general.rarityTier)) {
        return general.rarityTier as OverflowRarityTier;
    }
    switch (general.characterCategory) {
        case 'mythical':
            return 'mythic';
        case 'titled':
            return 'legendary';
        case 'famed':
            return 'epic';
        case 'general':
            return 'rare';
        default:
            return 'common';
    }
}
