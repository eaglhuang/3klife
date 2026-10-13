// @spec-source → WBS v3 MERC-02（試用券／轉蛋產生 6 日傭兵，能力固定 100%，數值 = 原值 × 1.0）；傭兵系統規格書：試用轉永久
/**
 * MercenaryTrialTicket — 使用試用券產生 Trial 傭兵，純邏輯，不依賴 cc。
 *
 * - 消耗 1 張試用券，產生 daysLeft = TRIAL_DAYS 的 Trial 傭兵。
 * - 能力固定為原武將數值 × TRIAL_TICKET_ABILITY_RATIO（目前 1.0）。
 * - 沒有試用券則拒絕，錢包與數值都不變。
 *
 * 規格沒有寫試用券的存放欄位名稱，這裡用 trialTickets 暫定；接存檔時再對齊。
 * Unity 對照：像 Inventory.Consume(item)，先檢查數量，再回傳扣除後的新背包。
 */
import { createTrialMercenary, MercenaryState } from './MercenaryBond';

export interface TrialStats {
    STR: number;
    INT: number;
    POL: number;
    CHR: number;
    LUK: number;
}

export const TRIAL_TICKET_ABILITY_RATIO = 1.0;

export interface TrialTicketWallet {
    trialTickets: number;
}

export type TrialTicketRejectReason = 'no-ticket';

export interface TrialTicketResult {
    ok: boolean;
    reason?: TrialTicketRejectReason;
    wallet: TrialTicketWallet;
    mercenary?: MercenaryState;
    /** 只有 ok 時有值：傭兵的固定能力值，已依 TRIAL_TICKET_ABILITY_RATIO 換算。 */
    stats?: TrialStats;
}

/** 依比例換算數值：向下取整、不為負；不改來源物件。 */
export function scaleTrialStats(source: Readonly<TrialStats>, ratio: number): TrialStats {
    const scale = (value: number) => Math.max(0, Math.floor(value * ratio));
    return {
        STR: scale(source.STR),
        INT: scale(source.INT),
        POL: scale(source.POL),
        CHR: scale(source.CHR),
        LUK: scale(source.LUK),
    };
}

/**
 * 使用一張試用券產生 Trial 傭兵。回傳新錢包，不改輸入、不用亂數、不寫存檔。
 */
export function useTrialTicket(
    wallet: Readonly<TrialTicketWallet>,
    uid: string,
    originalStats: Readonly<TrialStats>,
): TrialTicketResult {
    if (wallet.trialTickets < 1) {
        return { ok: false, reason: 'no-ticket', wallet: { ...wallet } };
    }
    return {
        ok: true,
        wallet: { trialTickets: wallet.trialTickets - 1 },
        mercenary: createTrialMercenary(uid),
        stats: scaleTrialStats(originalStats, TRIAL_TICKET_ABILITY_RATIO),
    };
}
