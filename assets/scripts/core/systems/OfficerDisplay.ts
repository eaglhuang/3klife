// @spec-source → 官職系統.md（§文案 UI_OFFICER_TITLE / UI_OFFICER_EXP）；WBS OFC-08 顯示段
/**
 * OfficerDisplay — 大廳官職區塊的顯示資料（純邏輯，不依賴 cc）
 *
 * 只組出文字與進度，不碰畫面。UI 拿到的是現成字串，直接塞進 Label 即可。
 *
 * 暫定（規格沒寫，可逆）：
 * - 最高階（霸府重臣）沒有下一階門檻，經驗欄顯示「{Current}/MAX」。
 *
 * Unity 對照：像 ViewModel 把 PlayerRank 算成 UI 要的字串與 fillAmount，
 * View 只負責顯示。
 */
import type { OfficerState } from './OfficerState';
import { OFFICER_TIER_MAX, OFFICER_TIER_EXP_THRESHOLDS } from './OfficerState';

/** 顯示用階位名稱（F-2）；資料檔未載入時的備援，與 officer-tiers.json 的 title 一致 */
const OFFICER_TIER_TITLES: readonly string[] = ['鄉里義士', '縣府佐官', '郡守', '州牧', '霸府重臣'];

export interface OfficerDisplayRow {
    tier: number;
    title: string;
}

export interface OfficerDisplay {
    /** UI_OFFICER_TITLE 區塊標題：「官職」 */
    sectionTitle: string;
    /** 目前階位名稱，例如「郡守」 */
    rankName: string;
    /** UI_OFFICER_EXP：「官職經驗：{Current}/{Next}」 */
    expLabel: string;
    /** 0~1 的進度；最高階為 1 */
    progress: number;
}

/** 組大廳官職區塊的顯示資料；rows 為資料檔列，未載入時用備援名稱。 */
export function officerDisplayOf(state: OfficerState, rows: readonly OfficerDisplayRow[] | null = null): OfficerDisplay {
    const tier = state.currentTier;
    const rankName = rows?.find((row) => row.tier === tier)?.title ?? OFFICER_TIER_TITLES[tier - 1] ?? '';
    const exp = state.officerExp;
    if (tier >= OFFICER_TIER_MAX) {
        return { sectionTitle: '官職', rankName, expLabel: `官職經驗：${exp}/MAX`, progress: 1 };
    }
    const floor = OFFICER_TIER_EXP_THRESHOLDS[tier] ?? 0;
    const next = OFFICER_TIER_EXP_THRESHOLDS[tier + 1];
    const progress = Math.min(1, Math.max(0, (exp - floor) / (next - floor)));
    return { sectionTitle: '官職', rankName, expLabel: `官職經驗：${exp}/${next}`, progress };
}
