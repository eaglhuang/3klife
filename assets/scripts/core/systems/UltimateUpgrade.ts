// @spec-source → 奧義系統.md §E 製作功能清單 #7 奧義升級、#8 奧義圖鑑；§H UI_ULT_LEVEL、UI_ULT_UPGRADE；WBS ULT-16（PROG-2-1251）
/**
 * UltimateUpgrade — 奧義升級與奧義圖鑑（純邏輯，不依賴 cc）
 *
 * 規則：
 *   - 重複抽到同一武將時，本次之前已解鎖的奧義欄位升 1 級；本次新解鎖的欄位從 Lv 1 開始。
 *   - 未解鎖欄位等級為 0；已解鎖但存檔缺等級的欄位視為 Lv 1。
 *   - 奧義圖鑑列出所有已解鎖的奧義，解鎖與否以轉數判定，不信任存檔的 isUnlocked 旗標。
 *
 * 暫定：
 *   - 升級上限規格未寫，本卡不設上限；傷害係數 1 + Lv × 0.15 照 UltimateDamage。
 *   - 同一批抽到多張重複時，逐張各升一次（與轉生累加一致）。
 *
 * Unity 對照：像 ScriptableObject 上的 Level 欄位，每次重複抽卡就像呼叫一次 LevelUp()；
 * 圖鑑則是對全部武將跑一次 Where(unlocked) 的清單。
 */
import type { GeneralUltimateSlotConfig } from '../models/GeneralUnit';
import { isUltimateSlotUnlocked } from './UltimateSlotUnlock';

/** 單一奧義欄位目前的等級；未解鎖為 0，已解鎖缺欄位為 1 */
export function ultimateLevelOf(
    slot: Pick<GeneralUltimateSlotConfig, 'unlockReincarnation' | 'ultLevel'>,
    rebirthCount: number | undefined,
): number {
    if (!isUltimateSlotUnlocked(slot, rebirthCount)) return 0;
    const raw = slot.ultLevel;
    return typeof raw === 'number' && Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1;
}

/**
 * 重複抽到時的奧義升級：回傳新的槽位清單，不修改輸入。
 * rebirthBefore 是本次重複前的轉數，rebirthAfter 是本次之後的轉數。
 */
export function upgradeUltimatesOnDuplicate(
    slots: readonly GeneralUltimateSlotConfig[],
    rebirthBefore: number | undefined,
    rebirthAfter: number | undefined,
): GeneralUltimateSlotConfig[] {
    return slots.map((slot) => {
        const wasUnlocked = isUltimateSlotUnlocked(slot, rebirthBefore);
        const nowUnlocked = isUltimateSlotUnlocked(slot, rebirthAfter);
        if (!nowUnlocked) return { ...slot, isUnlocked: false, ultLevel: 0 };
        if (!wasUnlocked) return { ...slot, isUnlocked: true, ultLevel: 1 };
        return { ...slot, isUnlocked: true, ultLevel: ultimateLevelOf(slot, rebirthBefore) + 1 };
    });
}

export interface UltimateCodexGeneral {
    id: string;
    rebirthCount?: number;
    ultimateSlots?: readonly GeneralUltimateSlotConfig[];
}

export interface UltimateCodexRow {
    generalId: string;
    ultimateId: string;
    slot: number;
    level: number;
}

/** 奧義圖鑑：列出所有已解鎖的奧義，依武將清單順序、欄位順序排列 */
export function buildUltimateCodex(generals: readonly UltimateCodexGeneral[]): UltimateCodexRow[] {
    const rows: UltimateCodexRow[] = [];
    for (const general of generals) {
        for (const slot of general.ultimateSlots ?? []) {
            if (!isUltimateSlotUnlocked(slot, general.rebirthCount)) continue;
            rows.push({
                generalId: general.id,
                ultimateId: slot.ultimateId,
                slot: slot.slot,
                level: ultimateLevelOf(slot, general.rebirthCount),
            });
        }
    }
    return rows;
}
