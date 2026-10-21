// @spec-source → 奧義系統.md §轉生解鎖規則；WBS ULT-03（PROG-2-1059）
/**
 * UltimateSlotUnlock — 依轉生次數解鎖奧義欄位（純邏輯，不依賴 cc）
 *
 * 規則：奧義欄位的 unlockReincarnation 小於等於武將轉數即解鎖（1 轉開奧義 1，5 轉全開）。
 * 轉數缺欄位的舊武將視為 1 轉（沿用 normalizeRebirthCount）。
 *
 * Unity 對照：像 Inspector 上的解鎖旗標，轉數變動時重新計算一次，寫回武將的槽位清單。
 */
import type { GeneralUltimateSlotConfig } from '../models/GeneralUnit';
import { normalizeRebirthCount } from './Rebirth';

export function isUltimateSlotUnlocked(slot: Pick<GeneralUltimateSlotConfig, 'unlockReincarnation'>, rebirthCount: number | undefined): boolean {
    return slot.unlockReincarnation <= normalizeRebirthCount(rebirthCount);
}

/** 回傳新的槽位清單，每格帶 isUnlocked；不修改輸入 */
export function withUltimateUnlockState(slots: readonly GeneralUltimateSlotConfig[], rebirthCount: number | undefined): GeneralUltimateSlotConfig[] {
    return slots.map((slot) => ({ ...slot, isUnlocked: isUltimateSlotUnlocked(slot, rebirthCount) }));
}
