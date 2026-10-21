// @spec-source → 武將人物介面規格書.md §4 UI 規則 2、§6.7（升星、覺醒、名聲的分工）；GDUI-08（PROG-2-0747）
/**
 * StarUpMaterial — 升星素材路由（純邏輯，不依賴 cc）
 *
 * 史實名將升星吃同模板轉蛋卡；子孫武將升星吃譜牒印記（Lineage_Seal）；
 * 其餘（子嗣、一般隨機武將，或子孫沒有 Lineage_Seal 規則）不顯示升星。
 *
 * 暫定：子孫判定與 Lineage_Seal 規則由呼叫端傳入，武將模型目前沒有這兩個欄位。
 */

export type StarUpMaterial = 'TEMPLATE_CARD' | 'LINEAGE_SEAL';

export interface StarUpMaterialInput {
    /** 史實名將（generals.json 的 isHistorical） */
    isHistorical: boolean;
    /** 子孫武將（非史實、由家族傳承產生） */
    isDescendant: boolean;
    /** 此武將是否有 Lineage_Seal 規則 */
    lineageSealRule: boolean;
}

/** 回傳升星素材；null 代表這位武將不顯示升星 */
export function starUpMaterialOf(input: StarUpMaterialInput): StarUpMaterial | null {
    if (input.isHistorical) return 'TEMPLATE_CARD';
    if (input.isDescendant && input.lineageSealRule) return 'LINEAGE_SEAL';
    return null;
}
