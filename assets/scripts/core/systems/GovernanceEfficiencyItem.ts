// @spec-source → 領地治理系統.md §C 治理效率道具（WBS GOV-14）；使用者裁決 2026-11-08 商業化只做純邏輯接口；PROG-2-2134
/**
 * GovernanceEfficiencyItem — 治理效率道具（純邏輯，不依賴 cc）
 *
 * 使用後提升指定內政任務當季的產出倍率。不接支付，取得來源由之後的商城決定。
 * 暫定：倍率 ×1.2、效果只到當季結束、同任務同季不可重複使用（規格只寫「提升產出率」）。
 *
 * Unity 對照：像 ScriptableObject 表加一個靜態計算器，UI 只讀結果。
 */
import type { DomesticTaskId } from './DomesticTasks';
import {
    ITEM_GOV_BOOST_ARMS,
    ITEM_GOV_BOOST_COMMERCE,
    ITEM_GOV_BOOST_DIPLOMACY,
    ITEM_GOV_BOOST_FARMING,
    ITEM_GOV_BOOST_SCOUTING,
} from './ItemDef';

export const GOVERNANCE_EFFICIENCY_ITEMS: Readonly<Record<string, { task: DomesticTaskId; multiplier: number }>> = Object.freeze({
    [ITEM_GOV_BOOST_FARMING]: { task: 'farming', multiplier: 1.2 },
    [ITEM_GOV_BOOST_COMMERCE]: { task: 'commerce', multiplier: 1.2 },
    [ITEM_GOV_BOOST_DIPLOMACY]: { task: 'diplomacy', multiplier: 1.2 },
    [ITEM_GOV_BOOST_ARMS]: { task: 'arms', multiplier: 1.2 },
    [ITEM_GOV_BOOST_SCOUTING]: { task: 'scouting', multiplier: 1.2 },
});

export interface ActiveGovernanceBoost {
    itemId: string;
    season: number;
}

export type GovernanceBoostRejectReason = 'unknown-item' | 'already-active';

export type GovernanceBoostPlan =
    | { ok: true; boosts: ActiveGovernanceBoost[] }
    | { ok: false; reason: GovernanceBoostRejectReason };

function taskOf(itemId: string): DomesticTaskId | null {
    return Object.prototype.hasOwnProperty.call(GOVERNANCE_EFFICIENCY_ITEMS, itemId)
        ? GOVERNANCE_EFFICIENCY_ITEMS[itemId].task
        : null;
}

/** 規劃使用道具：不扣道具；過季的效果順手清掉，存檔不會越積越多 */
export function planGovernanceBoost(boosts: readonly ActiveGovernanceBoost[], itemId: string, season: number): GovernanceBoostPlan {
    const task = taskOf(itemId);
    if (!task) return { ok: false, reason: 'unknown-item' };
    const current = boosts.filter((boost) => boost.season === season);
    if (current.some((boost) => taskOf(boost.itemId) === task)) return { ok: false, reason: 'already-active' };
    return { ok: true, boosts: [...current.map((boost) => ({ ...boost })), { itemId, season }] };
}

/** 任務當季的道具倍率；沒有生效的道具時為 1 */
export function governanceBoostMultiplier(boosts: readonly ActiveGovernanceBoost[], taskId: string, season: number): number {
    return boosts.reduce((total, boost) => (
        boost.season === season && taskOf(boost.itemId) === taskId
            ? total * GOVERNANCE_EFFICIENCY_ITEMS[boost.itemId].multiplier
            : total
    ), 1);
}

/** 讀檔：丟掉壞資料與未知道具 */
export function normalizeGovernanceBoosts(raw: unknown): ActiveGovernanceBoost[] {
    if (!Array.isArray(raw)) return [];
    const out: ActiveGovernanceBoost[] = [];
    for (const entry of raw) {
        const record = entry as Partial<ActiveGovernanceBoost> | null;
        if (!record || typeof record.itemId !== 'string' || !taskOf(record.itemId)) continue;
        if (typeof record.season !== 'number' || !Number.isInteger(record.season)) continue;
        out.push({ itemId: record.itemId, season: record.season });
    }
    return out;
}
