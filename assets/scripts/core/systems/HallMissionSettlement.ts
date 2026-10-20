// @spec-source → 官職系統.md（F-1 經驗來源、UI_OFFICER_PROMOTE）；大廳系統 §E-3（難度）；WBS OFC-03 / OFC-08
/**
 * HallMissionSettlement — 大廳任務結算轉官職經驗、晉升提示文案（純邏輯，不依賴 cc）
 *
 * 任務完成或失敗時，把大廳任務的難度與任務牆轉成 F-1 的 OfficerTaskResult，
 * 交給 GameSession.gainOfficerExp 入帳。晉升時產生 UI_OFFICER_PROMOTE 文案。
 *
 * 暫定（規格缺，可逆）：
 * - 大廳難度 EASY / NORMAL / ELITE / ADVANCED / HELL 對應官職難度 EASY / NORMAL / ELITE / HIGH / HELL（與大廳資料一致，皆大寫）。
 * - 任務牆 Military / Domestic 對應 MILITARY / DOMESTIC；Expedition 牆暫無對應（回傳 null，不入帳）。
 * - 晉升的一次性獎勵內容規格沒寫，本次不發獎，只出提示。
 *
 * Unity 對照：像任務結束時的 Reward Calculator，把任務資料轉成經驗值，
 * 再交給 PlayerRank 的 AddExp 處理升級。
 */
import type { OfficerDifficulty, OfficerTaskResult } from './OfficerState';
import type { HallBoardKey } from './HallMissionBoard';
import type { OfficerDisplayRow } from './OfficerDisplay';

export interface HallMissionOutcome {
    /** 大廳任務難度（EASY / NORMAL / ELITE / ADVANCED / HELL，與大廳資料一致） */
    difficulty: string;
    /** 任務所在的任務牆 */
    board: HallBoardKey;
    success: boolean;
}

const HALL_DIFFICULTY_TO_OFFICER: Readonly<Record<string, OfficerDifficulty>> = {
    EASY: 'EASY',
    NORMAL: 'NORMAL',
    ELITE: 'ELITE',
    ADVANCED: 'HIGH',
    HELL: 'HELL',
};

const HALL_BOARD_TO_DOMAIN: Readonly<Partial<Record<HallBoardKey, OfficerTaskResult['boardType']>>> = {
    Military: 'MILITARY',
    Domestic: 'DOMESTIC',
};

/** 大廳任務結算 → F-1 任務結果；無法對應（未知難度或無對應牆）回傳 null。 */
export function hallMissionToOfficerTask(outcome: HallMissionOutcome): OfficerTaskResult | null {
    const difficulty = HALL_DIFFICULTY_TO_OFFICER[outcome.difficulty];
    const boardType = HALL_BOARD_TO_DOMAIN[outcome.board];
    if (!difficulty || !boardType) return null;
    return { difficulty, boardType, success: outcome.success };
}

/** 晉升提示文案（UI_OFFICER_PROMOTE「晉升 {RankName}」），由低到高逐階一行。 */
export function officerPromotionNoticeOf(promotedTiers: readonly number[], rows: readonly OfficerDisplayRow[] | null = null): string[] {
    return promotedTiers.map((tier) => {
        const rankName = rows?.find((row) => row.tier === tier)?.title ?? '';
        return `晉升 ${rankName}`;
    });
}
