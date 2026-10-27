// @spec-source → 關卡設計系統.md §E 戰法槽位與子嗣養成聯動（E-1 學習數 ≠ 裝備數、關卡寫明推薦槽數）；培育系統 §F-7 戰法槽位（PROG-2-1312，WBS LVL-05）
/**
 * StageLoadoutSlots — 關卡推薦對策槽位數與出征槽位缺口（純邏輯，不依賴 cc）
 *
 * - 關卡規格必須寫明「推薦至少幾個對策槽位」；沒有寫時，以強制攜帶的戰法數為準。
 * - 推薦槽數限制在 1 ~ TACTIC_LOADOUT_MAX（規格上限 4 槽）。
 * - 槽位容量沿用 tacticLoadoutCapacity（由智力決定）。
 *
 * 暫定：規格寫「f(智力, 培育, 關卡等級)」，但培育與關卡等級沒有定義加成，本檔只計入智力，待企劃補定。
 *
 * Unity 對照：像 Inspector 上的 Required Slots 欄位，與角色的 Slot Count 比對，差幾格就顯示缺口。
 */
import { TACTIC_LOADOUT_MAX, tacticLoadoutCapacity } from './TacticLoadout';

export const STAGE_RECOMMENDED_SLOT_MIN = 1;

/** 關卡推薦對策槽位數：有明寫用明寫的值；沒寫用強制攜帶戰法數；結果夾在 1 ~ 4。 */
export function recommendedSlotCountOf(declared: number | undefined, requiredLoadout: readonly string[]): number {
    const raw = declared !== undefined && Number.isFinite(declared) ? declared : requiredLoadout.length;
    return Math.min(TACTIC_LOADOUT_MAX, Math.max(STAGE_RECOMMENDED_SLOT_MIN, Math.floor(raw)));
}

export interface LoadoutSlotGap {
    capacity: number;
    recommended: number;
    /** 還缺幾個槽位；0 代表足夠 */
    gap: number;
}

/** 武將依智力可裝備的槽位，與關卡推薦槽數比對，回傳缺口。 */
export function loadoutSlotGapOf(intelligence: number, recommendedSlots: number): LoadoutSlotGap {
    const capacity = tacticLoadoutCapacity(intelligence);
    const recommended = Math.min(TACTIC_LOADOUT_MAX, Math.max(STAGE_RECOMMENDED_SLOT_MIN, Math.floor(recommendedSlots)));
    return { capacity, recommended, gap: Math.max(0, recommended - capacity) };
}
