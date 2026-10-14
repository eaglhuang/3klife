/**
 * TacticLearning — 戰法學習 TP 門檻（NUR-10 續，純邏輯，不依賴 cc）
 *
 * 暫定規則（PM 裁定 2026-10-14）：學習門檻 = 該戰法 TP 消耗 × 2；
 * 玩家持有 TP 達此門檻才可學習。
 *
 * Unity 對照：像 Skill.CanLearn(player)，只回傳 bool，不直接扣錢或改存檔。
 */
import { tacticLoadoutCapacity } from './TacticLoadout';

export const TACTIC_LEARN_THRESHOLD_MULTIPLIER = 2;

function isUsableNumber(value: number): boolean {
    return Number.isFinite(value);
}

/** 學習門檻：TP 消耗 × 2。非有限數或負值視為 0（不擋學習，交由上游資料驗證）。 */
export function tacticLearnThreshold(tpCost: number): number {
    if (!isUsableNumber(tpCost) || tpCost <= 0) return 0;
    return tpCost * TACTIC_LEARN_THRESHOLD_MULTIPLIER;
}

/** 持有 TP 是否達到學習門檻。持有值非有限數或為負時一律不可學。 */
export function canLearnTactic(heldTp: number, tpCost: number): boolean {
    if (!isUsableNumber(heldTp) || heldTp < 0) return false;
    return heldTp >= tacticLearnThreshold(tpCost);
}

export type TacticLearnBlock = 'INVALID_TACTIC' | 'ALREADY_LEARNED' | 'TP_SHORT' | 'SLOT_FULL';

export interface TacticLearnCheck {
    ok: boolean;
    /** 不可學的原因；ok 時沒有 */
    blocked?: TacticLearnBlock;
    /** 學習後的戰法清單（不可學時維持原樣） */
    learned: string[];
}

/**
 * 培育學戰法（純邏輯）：依序檢查 戰法 id → 是否已學 → TP 門檻 → 槽位（智力決定）。
 * 通過才回傳新清單；不扣 TP（PM 暫定：門檻只判定持有量，不消耗）。
 */
export function learnTacticInto(
    learned: readonly string[],
    tacticId: string,
    intelligence: number,
    heldTp: number,
    tpCost: number,
): TacticLearnCheck {
    if (!tacticId) return { ok: false, blocked: 'INVALID_TACTIC', learned: [...learned] };
    if (learned.includes(tacticId)) return { ok: false, blocked: 'ALREADY_LEARNED', learned: [...learned] };
    if (!canLearnTactic(heldTp, tpCost)) return { ok: false, blocked: 'TP_SHORT', learned: [...learned] };
    if (learned.length >= tacticLoadoutCapacity(intelligence)) return { ok: false, blocked: 'SLOT_FULL', learned: [...learned] };
    return { ok: true, learned: [...learned, tacticId] };
}
