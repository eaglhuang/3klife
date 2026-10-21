// @spec-source → 奧義系統.md §奧義傷害公式；數值系統.md E-6「奧義 Base Power」（PROG-2-0925，NUM-09）
/**
 * UltimateDamage — 奧義傷害純公式（純邏輯，不依賴 cc）
 *
 * 規格：ult_damage = base_power × (1 + ult_level × 0.15) × stat_modifier
 * - base_power 依奧義等級查表（1=200、2=300、3=400、4=500、5=700），數值來自 NumericalConfig.Ult_Base_Power。
 * - stat_modifier 依武力／智力等主屬性決定，規格未給公式，由呼叫端傳入（待 PM 裁定）。
 *
 * Unity 對照：像 ScriptableObject 上的數值欄位加上一個計算函式，資料與公式分開放，
 * 公式本身不寫死任何一張表。
 */

/** 奧義等級上限（規格：奧義 1~5） */
export const ULT_LEVEL_MIN = 1;
export const ULT_LEVEL_MAX = 5;
/** 每級奧義的傷害加成係數（規格：1 + ult_level × 0.15） */
export const ULT_LEVEL_DAMAGE_STEP = 0.15;

/**
 * 依奧義等級取 base_power。等級不在 1~5 或表內查不到時回傳 null，不猜測。
 */
export function ultBasePowerOf(ultLevel: number, basePowerTable: Readonly<Record<string, number>>): number | null {
    if (!Number.isInteger(ultLevel) || ultLevel < ULT_LEVEL_MIN || ultLevel > ULT_LEVEL_MAX) return null;
    const value = basePowerTable[String(ultLevel)];
    return Number.isFinite(value) ? value : null;
}

/**
 * 奧義傷害：base_power × (1 + ult_level × 0.15) × stat_modifier。
 * 任一輸入無效（非有限數、等級超界、主屬性係數 < 0）時回傳 0，不猜測。
 */
export function ultDamage(basePower: number, ultLevel: number, statModifier: number): number {
    if (!Number.isFinite(basePower) || basePower < 0) return 0;
    if (!Number.isInteger(ultLevel) || ultLevel < ULT_LEVEL_MIN || ultLevel > ULT_LEVEL_MAX) return 0;
    if (!Number.isFinite(statModifier) || statModifier < 0) return 0;
    return basePower * (1 + ultLevel * ULT_LEVEL_DAMAGE_STEP) * statModifier;
}
