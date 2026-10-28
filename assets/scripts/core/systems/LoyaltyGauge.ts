// @spec-source → 武將人物介面規格補遺_2026-04-14.md §2.1 忠誠度條（HUM-04）
/**
 * LoyaltyGauge — 武將忠誠度條的顯示數值（HUM-04，純邏輯，不依賴 cc）
 *
 * 規格重點：
 * - 數值 0~100；低於 60 顯示橙色警示；低於 30 顯示紅色（隨時可能下野或被勸降）
 * - 轉蛋武將鎖定為 100，顯示鎖定圖標
 * - 沒有忠誠紀錄的武將，以開局初值顯示且不鎖定（暫定，見 PR 備註）
 *
 * Unity 對照：像一個 ViewModel 的 getter，把存檔裡的紀錄換算成條的值、顏色等級與鎖定旗標，
 * 由 View 元件照著畫，不自己判斷規則。
 */
import { TALLY_LOYALTY_LOCK_VALUE, type TallyLoyaltyState } from './TigerTallyLoyalty';

/** 沒有紀錄時的開局初值，與 GameSession 的 TALLY_LOYALTY_INITIAL 同值（該常數未匯出，這裡不反向依賴 GameSession） */
const LOYALTY_INITIAL_WHEN_MISSING = 50;
export const LOYALTY_WARN_BELOW = 60;
export const LOYALTY_DANGER_BELOW = 30;

export type LoyaltyTier = 'normal' | 'warn' | 'danger';

export interface LoyaltyGaugeView {
    /** 顯示用數值，0~100 */
    value: number;
    /** 條的填充比例，0~1 */
    ratio: number;
    tier: LoyaltyTier;
    locked: boolean;
}

/** 依忠誠紀錄算出條的顯示內容；紀錄不存在時用開局初值（不鎖定） */
export function loyaltyGaugeOf(state: Pick<TallyLoyaltyState, 'loyalty' | 'isGachaHero'> | null | undefined): LoyaltyGaugeView {
    if (state?.isGachaHero) {
        return { value: TALLY_LOYALTY_LOCK_VALUE, ratio: 1, tier: 'normal', locked: true };
    }
    const raw = state?.loyalty ?? LOYALTY_INITIAL_WHEN_MISSING;
    const value = Number.isFinite(raw) ? Math.min(100, Math.max(0, Math.round(raw))) : 0;
    const tier: LoyaltyTier = value < LOYALTY_DANGER_BELOW ? 'danger' : value < LOYALTY_WARN_BELOW ? 'warn' : 'normal';
    return { value, ratio: value / 100, tier, locked: false };
}
