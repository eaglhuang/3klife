// @spec-source → 家族子嗣與血統總規格書 (doc_spec_1241) 3.2 配偶三來源；PROG-2-9613
/**
 * MatchmakerGuideManager — 結緣媒人導流判定與文案邏輯（純函式，不依賴 cc）。
 *
 * 世界觀硬規則：
 * 1. 主角戴頭盔穿越，不死不老無年齡，程式中無主角年齡欄位，絕不使用及冠年齡。
 * 2. 首次觸發：開場教學（首戰、首子流程）結束後第一次換季，排入一次性【紅娘叩門】（promptType: 'first-visit'）。
 *    存檔旗標 matchmakerFirstVisitDone 確保讀檔或後續換季不重複。
 * 3. 常規導流：每年春季（第 1 季）換季時，若配偶數未達幕府等級上限且本年剩餘媒人次數 remaining > 0，
 *    排入常規【媒人求見】（promptType: 'spring-visit'）。
 */

export interface MatchmakerTriggerInput {
    totalSeasonsElapsed: number;
    currentSeason: number;       // 1 ~ 4（1 為春季）
    isOpeningDone: boolean;      // 開場流程是否結束（openingPhase === null）
    firstVisitDone: boolean;     // 存檔旗標：是否已完成首次紅娘叩門
    spouseCount: number;         // 目前配偶數
    spouseCap: number;           // 幕府等級對應的配偶上限
    remainingOffers: number;     // 本年媒人說親剩餘次數
}

export type MatchmakerPromptType = 'first-visit' | 'spring-visit';

export interface MatchmakerGuideTriggerResult {
    promptType: MatchmakerPromptType;
    remaining: number;
    speechTextKey: string;
    titleKey: string;
}

export const MATCHMAKER_FIRST_VISIT_SPEECH = '城外紅娘特來叩門道喜，為主公挑選了幾位良家女子，主公可願一見？';
export const MATCHMAKER_SPRING_VISIT_SPEECH = '開春吉時，媒婆帶著十里八鄉的名冊前來求見，主公要不要挑挑看？';
export const MATCHMAKER_FIRST_VISIT_TITLE = '紅娘叩門・喜結良緣';
export const MATCHMAKER_SPRING_VISIT_TITLE = '新春說親・良緣締結';

/** 判定本季是否觸發媒人導流 */
export function checkMatchmakerTrigger(input: MatchmakerTriggerInput): MatchmakerGuideTriggerResult | null {
    // 開場尚未完成，絕不導流
    if (!input.isOpeningDone) {
        return null;
    }

    // 1. 首次叩門：開場已過、尚未完成首次叩門、且至少經歷過 1 季換季
    if (!input.firstVisitDone && input.totalSeasonsElapsed >= 1) {
        return {
            promptType: 'first-visit',
            remaining: input.remainingOffers,
            speechTextKey: 'MATCHMAKER_FIRST_VISIT_SPEECH',
            titleKey: 'MATCHMAKER_FIRST_VISIT_TITLE',
        };
    }

    // 2. 常規春季導流：春季（currentSeason === 1）、配偶未達上限、且本年尚有說親次數
    if (input.currentSeason === 1 && input.spouseCount < input.spouseCap && input.remainingOffers > 0) {
        return {
            promptType: 'spring-visit',
            remaining: input.remainingOffers,
            speechTextKey: 'MATCHMAKER_SPRING_VISIT_SPEECH',
            titleKey: 'MATCHMAKER_SPRING_VISIT_TITLE',
        };
    }

    return null;
}
