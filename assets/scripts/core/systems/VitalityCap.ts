// @spec-source → 數值系統.md (doc_spec_0016) Q46 裁決（男 +20%）、3KLife-規格決策題 Q17 推薦 A
/**
 * VitalityCap — 男女精力上限基礎值（純邏輯，不依賴 cc）
 *
 * 規格（數值系統 Q46 選項 A）：男性上限 120、女性上限 100，強化男性戰場持久力。
 * 只有資料缺少 vitality / maxVitality 時才用這裡的基礎值當預設；已存檔的武將沿用自己的數值。
 *
 * Unity 對照：像 ScriptableObject 上的預設欄位，性別不同填不同的 Default Value。
 */

/** 男性精力上限基礎值（數值系統 Q46：100 × 1.2） */
export const VITALITY_MAX_MALE = 120;
/** 女性精力上限基礎值（數值系統 Q46） */
export const VITALITY_MAX_FEMALE = 100;
/** 性別未知時沿用舊預設 100 */
export const VITALITY_MAX_UNKNOWN = 100;

/** 依性別回傳精力上限基礎值；性別字串與 BreedingSystem.isMale / isFemale 同一套寫法。 */
export function baseVitalityMaxOf(gender: string | undefined): number {
    const g = (gender ?? '').trim().toLowerCase();
    if (g === '男' || g === 'male' || g === 'm') return VITALITY_MAX_MALE;
    if (g === '女' || g === 'female' || g === 'f') return VITALITY_MAX_FEMALE;
    return VITALITY_MAX_UNKNOWN;
}
