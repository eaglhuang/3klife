// @spec-source → 教官系統（支援卡）.md；PROG-2-9160（使用者裁決 2026-11-19：新玩家第一胎要被引導去抽教官）
/**
 * MentorGuidance — 新玩家「沒有教官」引導的判斷與文案（純函式，不依賴 cc）
 *
 * 開局錢包已送支援券（見 GachaWalletRules.STARTER_GACHA_WALLET.mentorTickets），
 * 但入學至少要帶 1 位教官，新玩家不知道要去教官池抽。培育入學畫面在這種情況顯示一顆按鈕，
 * 直接開轉蛋並切到教官池；玩家第一次擁有教官後記旗標，之後不再出現。
 *
 * Unity 對照：像新手教學的「提示氣泡」，條件與文案抽成函式，場景只負責顯示。
 */

/** 引導按鈕文字 */
export const MENTOR_GUIDE_BUTTON_LABEL = '去教官池抽教官';

export interface MentorGuidanceInput {
    /** 目前可帶入的教官卡數（含先祖、不含好友借用） */
    ownedMentorCount: number;
    /** 是否已有好友借用教官（有借用就能入學，不需要引導） */
    hasBorrowed: boolean;
    /** 存檔旗標：玩家曾經擁有過教官 */
    guideDone: boolean;
}

export interface MentorGuidanceResult {
    /** 要不要顯示引導按鈕與提示 */
    show: boolean;
    /** 要不要把旗標記為完成（玩家已擁有教官，引導從此不再出現） */
    markDone: boolean;
}

/** 引導只出現到玩家第一次擁有教官為止；沒有教官且尚未記旗標才顯示 */
export function evaluateMentorGuidance(input: MentorGuidanceInput): MentorGuidanceResult {
    if (input.ownedMentorCount > 0) return { show: false, markDone: !input.guideDone };
    if (input.guideDone) return { show: false, markDone: false };
    return { show: !input.hasBorrowed, markDone: false };
}

/** 入學畫面的引導提示；支援券用實際持有數（開局贈送的會被抽掉，不寫死數量） */
export function mentorGuidanceHint(mentorTickets: number): string {
    return mentorTickets > 0
        ? `入學要帶至少 1 位教官：開局贈送的支援券可抽教官，你現有 ${mentorTickets} 張，點下方按鈕到「教官池」抽`
        : '入學要帶至少 1 位教官：支援券已用完，可到「教官池」補券，或讓武將 65 歲退役轉教官';
}
