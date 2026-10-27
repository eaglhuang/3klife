// @spec-source → 經濟系統.md (doc_spec_0032)「地窖保護與每日補貼」；交叉索引 Sec D「經濟補貼提示」；PROG-2-1340、PROG-2-1342
/**
 * DailySubsidyNotice — 每日補貼的大廳提示文字（純邏輯，不依賴 cc）。
 *
 * 規格沒有補貼提示的字串 key，暫用「每日補貼：糧草 +400、黃金 +150、城市兵源 +200」；沒補時回空字串。
 * Unity 對照：Presenter 的格式化函式，View 只負責 toast。
 */
import type { SubsidyResourceKey } from '../../core/systems/DailySubsidy';
import { CELLAR_PROTECTION } from '../../core/systems/CellarProtection';

/** 顯示順序與名稱（沿用經濟系統 UI_RES_* 的資源名） */
export const DAILY_SUBSIDY_LABELS: readonly { key: SubsidyResourceKey; label: string }[] = [
    { key: 'food', label: '糧草' },
    { key: 'gold', label: '黃金' },
    { key: 'troops', label: '城市兵源' },
];

export function dailySubsidyText(grants: Partial<Record<SubsidyResourceKey, number>>): string {
    const parts = DAILY_SUBSIDY_LABELS.filter(({ key }) => (grants[key] ?? 0) > 0).map(({ key, label }) => `${label} +${grants[key]}`);
    return parts.length > 0 ? `每日補貼：${parts.join('、')}` : '';
}

/** 戰敗地窖保護提示（PROG-2-1342，文案暫定）：「地窖保護：保住糧草 N（保底 F）」；沒觸發回空字串 */
export function cellarProtectionText(savedFood: number, floor: number = CELLAR_PROTECTION.foodFloor): string {
    return savedFood > 0 ? `地窖保護：保住糧草 ${savedFood}（保底 ${floor}）` : '';
}
