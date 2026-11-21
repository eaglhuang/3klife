// @spec-source → 學府支援卡與教官池規格書 (doc_spec_1264) §16 連線券來源；獎勵系統 Base (doc_spec_1186)；SUP-11（PROG-2-9245）
/**
 * SupportTicketSources — 連線券（錢包鍵 mentorTickets）的免費來源：該領哪個獎勵套件、何時領（純函式，不依賴 cc）。
 *
 * 張數全在 reward-config.json 的套件裡（BUNDLE_SUPPORT_TICKET_*），這裡只決定「哪一個套件、什麼時候」，
 * 真正入帳走共通 API 的 reward.claim（grantKey 冪等，重送不會重領）。第一版不販售（Q-S1 使用者裁決）。
 */

/** 結業（B 以上都給；S 評級另給較多）：規格「每屆結業 +10、S 評級 +15」 */
export const SUPPORT_TICKET_BUNDLES = Object.freeze({
    graduation: 'BUNDLE_SUPPORT_TICKET_GRAD',
    graduationS: 'BUNDLE_SUPPORT_TICKET_GRAD_S',
    academyTerm: 'BUNDLE_SUPPORT_TICKET_TERM',
    loginWeek: 'BUNDLE_SUPPORT_TICKET_LOGIN7',
});

/** 每連續登入幾天領一次簽到券 */
export const SUPPORT_TICKET_LOGIN_PERIOD = 7;
/** 學期評核回合（學府第 12、24 回合各一次；第 36 回合是結業，另算） */
export const SUPPORT_TICKET_TERM_TURNS: readonly number[] = Object.freeze([12, 24]);

export interface SupportTicketClaim {
    bundleId: string;
    /** 冪等鍵：同一件事重送回原結果、不重複入帳 */
    grantKey: string;
    /** reward.claim 的來源種類（要在套件 sources 內） */
    source: { kind: string; ref?: string };
}

/** 結業連線券：S 評級領 S 套件，其餘領一般套件 */
export function graduationTicketClaim(childId: string, grade: string): SupportTicketClaim {
    return {
        bundleId: grade === 'S' ? SUPPORT_TICKET_BUNDLES.graduationS : SUPPORT_TICKET_BUNDLES.graduation,
        grantKey: `support-ticket:graduation:${childId}`,
        source: { kind: 'academy', ref: childId },
    };
}

/** 學府學期任務連線券：該學員已過了哪幾個學期評核（回合數大於評核回合），每一個一份，冪等鍵含回合 */
export function termTicketClaims(childId: string, currentTurn: number): SupportTicketClaim[] {
    return SUPPORT_TICKET_TERM_TURNS.filter((turn) => currentTurn > turn).map((turn) => ({
        bundleId: SUPPORT_TICKET_BUNDLES.academyTerm,
        grantKey: `support-ticket:term:${childId}:${turn}`,
        source: { kind: 'academy', ref: `${childId}:${turn}` },
    }));
}

/** 簽到連線券：連續登入第 7、14、21…天各領一次；今天不是整週回 null */
export function loginTicketClaim(consecutiveDays: number, day: string): SupportTicketClaim | null {
    if (consecutiveDays <= 0 || consecutiveDays % SUPPORT_TICKET_LOGIN_PERIOD !== 0) return null;
    return { bundleId: SUPPORT_TICKET_BUNDLES.loginWeek, grantKey: `support-ticket:login:${day}`, source: { kind: 'login', ref: day } };
}
