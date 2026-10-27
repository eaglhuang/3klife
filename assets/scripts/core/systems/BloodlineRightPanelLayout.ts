// @spec-source → 武將人物介面規格書 §6.3 右半區六塊順序、§12 BATTLE_LOCKED；英靈世家系統 E-4 命槽規則；WBS GDUI-05（PROG-2-1266）
/**
 * BloodlineRightPanelLayout — 命頁右半區六塊資訊欄的固定順序與英靈卡命槽操作（純邏輯，不依賴 cc）
 *
 * 六塊由上到下固定排列，順序不可亂；cc 端只依此陣列依序掛載。
 * 命槽為單插槽：插入 / 替換 / 卸下 / 設為主卡 / 查看詳情，依目前狀態與戰鬥鎖定決定哪些可按。
 *
 * 暫定：
 *   - 「設為主卡」只在已裝配且非主卡時可用。
 *   - 戰鬥中（BATTLE_LOCKED）只允許查看詳情。
 *   - 替換時回傳 warnPassiveLoss，提示原卡被動將解除（E-4 第 3 條）。
 *
 * Unity 對照：像 Inspector 裡固定順序的 VerticalLayoutGroup，
 * 再加上一個單格 Slot，依 Slot 內容與 Battle 狀態切換按鈕的 interactable。
 */

/** 右半區六塊，順序即畫面由上到下的順序 */
export const BLOODLINE_RIGHT_PANEL_BLOCKS = [
    'bloodlineSummary',
    'bloodlineBeast',
    'bloodlineUltimate',
    'specialFactors',
    'birthBurstAwakening',
    'spiritSlot',
] as const;

export type BloodlineRightPanelBlock = typeof BLOODLINE_RIGHT_PANEL_BLOCKS[number];

export type SpiritSlotAction = 'insert' | 'replace' | 'unequip' | 'setMain' | 'detail';

export interface SpiritSlotState {
    /** 命槽內是否已裝配英靈卡 */
    occupied: boolean;
    /** 目前裝配的英靈卡是否為主卡；未裝配時無意義 */
    isMain: boolean;
    /** 戰鬥中不可更換英靈卡 */
    battleLocked: boolean;
}

export interface SpiritSlotActionAvailability {
    action: SpiritSlotAction;
    enabled: boolean;
}

export interface SpiritSlotActionPlan {
    actions: SpiritSlotActionAvailability[];
    /** 替換時為 true：cc 需先提示原卡被動將解除 */
    warnPassiveLoss: boolean;
}

/**
 * 依命槽狀態回傳五個操作的可用性（固定順序：插入、替換、卸下、設為主卡、查看詳情）。
 * 查看詳情只要有卡就可用，不受戰鬥鎖定影響。
 */
export function spiritSlotActions(state: SpiritSlotState): SpiritSlotActionPlan {
    const editable = !state.battleLocked;
    const enabled: Record<SpiritSlotAction, boolean> = {
        insert: editable && !state.occupied,
        replace: editable && state.occupied,
        unequip: editable && state.occupied,
        setMain: editable && state.occupied && !state.isMain,
        detail: state.occupied,
    };
    const order: SpiritSlotAction[] = ['insert', 'replace', 'unequip', 'setMain', 'detail'];
    return {
        actions: order.map((action) => ({ action, enabled: enabled[action] })),
        warnPassiveLoss: state.occupied,
    };
}
