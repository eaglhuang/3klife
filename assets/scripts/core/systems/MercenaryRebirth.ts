// @spec-source → 傭兵系統（試用）MERC-09 二轉機制；裁決 2026-11-08 二轉上限 +5%（五轉累積 +25%）；轉生屬性上限突破與奧義傷害數值模型規格書 (doc_spec_0341) §1
/**
 * MercenaryRebirth — 已結義傭兵再抽到同名卡的自動二轉（純邏輯，不依賴 cc）。
 *
 * 規則：
 * - 傭兵結義轉正後，再從轉蛋抽到同名卡時自動轉生，不跳復生重練／血脈灌注的分流彈窗。
 * - 單項五維上限沿用 reincarnationStatCap：每轉 +5，五轉 125（+25%）。
 *
 * 暫定：轉數直接當作上限階數，所以一轉（初見）是 105。程式的轉數從 1 起算，
 * 規格的階數從 0 起算，兩者要同時滿足「每轉 +5%」與「五轉 +25%」只能這樣對應。
 * Unity 對照：像把轉生表再包一層查詢，呼叫端只問「這個人現在上限多少」。
 */
import { REINCARNATION_TUNING, reincarnationStatCap } from './ReincarnationUltModel';
import { normalizeRebirthCount } from './Rebirth';

interface BondedMercenaryLike {
    status: string;
    generalId?: string;
}

/** 已結義（永久）傭兵對應的武將 id */
export function bondedMercenaryGeneralIds(mercenaries: readonly BondedMercenaryLike[]): Set<string> {
    const ids = new Set<string>();
    for (const mercenary of mercenaries) {
        if (mercenary.status === 'Bonded' && mercenary.generalId) ids.add(mercenary.generalId);
    }
    return ids;
}

/** 該轉數的單項五維上限 */
export function mercenaryRebirthStatCap(rebirthCount: number | undefined): number {
    return reincarnationStatCap(normalizeRebirthCount(rebirthCount));
}

/** 該轉數相對基礎上限的加成比例（五轉 0.25） */
export function mercenaryRebirthCapBonus(rebirthCount: number | undefined): number {
    return (normalizeRebirthCount(rebirthCount) * REINCARNATION_TUNING.perLevel) / REINCARNATION_TUNING.baseCap;
}

/** 重複卡要跳分流彈窗的武將 id：名冊裡排除已結義傭兵（他們自動二轉） */
export function duplicatePopupGeneralIds(rosterIds: Iterable<string>, bondedIds: ReadonlySet<string>): Set<string> {
    const ids = new Set<string>();
    for (const id of rosterIds) {
        if (!bondedIds.has(id)) ids.add(id);
    }
    return ids;
}
