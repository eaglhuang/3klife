// @spec-source → 培育系統.md (doc_spec_0026) §功能清單 #5 事件系統、§G 劇本（受傷事件）
/**
 * NurtureEvents — 培育回合的受傷與好感事件擲骰（純邏輯，不依賴 cc）
 *
 * 只處理「受傷」與「好感」兩種隨機事件。「覺醒」已由 FactorAwakening.rollNurtureAwakening 負責，這裡不重複擲。
 *   - 受傷：訓練過度，本回合無法行動（規格 Events_Log: Injury, Penalty: Skip_1_round）
 *   - 好感：訓練回合的好感事件，結果只回傳 +1 好感，寫入與效果交給上層
 *
 * 暫定（規格只有事件種類，沒有機率）：
 *   - 受傷基礎機率 3% / 訓練回合；休息回合不擲。
 *   - 好感機率 5% / 訓練回合；受傷後不再擲好感。
 *
 * Unity 對照：像一個 EventRoller，每回合呼叫一次，只回傳「這回合發生了哪些事件」，不直接改武將。
 */
import type { RandomSource } from './GeneralAging';

export const NURTURE_INJURY_CHANCE = 0.03;
export const NURTURE_AFFECTION_CHANCE = 0.05;

export interface NurtureRoundEvents {
    /** 受傷：本回合訓練無效，下一回合跳過 */
    injured: boolean;
    /** 好感 +1（受傷時不會發生） */
    affection: boolean;
}

/**
 * 每回合擲一次。休息回合（isTraining = false）不擲任何事件，不消耗亂數。
 * 擲骰順序固定：先受傷，未受傷才擲好感。
 */
export function rollNurtureRoundEvents(isTraining: boolean, random: RandomSource): NurtureRoundEvents {
    if (!isTraining) return { injured: false, affection: false };
    const injured = random() < NURTURE_INJURY_CHANCE;
    if (injured) return { injured: true, affection: false };
    const affection = random() < NURTURE_AFFECTION_CHANCE;
    return { injured: false, affection };
}
