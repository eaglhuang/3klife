// @spec-source → 戰場部署系統.md (doc_spec_0040) §G 劇本相關；PROG-2-1766
/**
 * SortieDeployScripts — 戰場部署時顯示的文字（純邏輯，不依賴 cc）。
 *
 * Unity 對照：像一份 Localization Table 的格式化函式，畫面只拿結果字串。
 */

export const DELEGATE_OFF_LINE = '委任已關閉：回到手動部署';
export const DELEGATE_UNAVAILABLE_LINE = '這場戰鬥沒有出征軍勢，無法委任';
export const FOOD_EMPTY_LINE = '糧草耗盡……無法再出兵！';
const FOOD_SHORT_LINE = '糧草不足，無法部署';

/** 後勤官支援句；沒有後勤官或加成為 0 時回 null，不顯示 */
export function deputySupportLine(deputyName: string | null | undefined, foodCapBonus: number): string | null {
    if (!deputyName || foodCapBonus <= 0) return null;
    return `後勤官 ${deputyName} 押運補給，軍糧上限 +${foodCapBonus}！`;
}

export function delegateOnLine(generalName: string): string {
    return `${generalName} 接管指揮權——委任自動出兵。`;
}

/** 部署因糧草失敗時的提示：糧草已歸零才算耗盡，還有糧只是不夠這一隊 */
export function foodShortMessage(currentFood: number): string {
    return currentFood <= 0 ? FOOD_EMPTY_LINE : FOOD_SHORT_LINE;
}
