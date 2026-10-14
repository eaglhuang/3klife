// @spec-source → 教官系統（支援卡）.md (doc_spec_0027) §M 溢出轉化系統（M-2 溢出獎勵、M-3 觸發流程）；MENT-07（PROG-2-0539）
/**
 * MentorOverflow — 教官卡溢出轉化（純邏輯，不依賴 cc）
 *
 * 規則：重複抽到同名教官卡時，未滿 ★5 → 突破（MentorBreakthrough）；已滿 ★5 → 溢出，依稀有度轉為積分。
 * 積分（點數商店貨幣）的存檔與商店入口留給後續卡，這裡只算「入帳多少」與 Toast 文字。
 *
 * Unity 對照：像 Shop 的 Refund 規則表，輸入「目前狀態＋重複事件」，輸出結果與入帳金額，不直接改存檔。
 */
import { applyDuplicateMentorCard, MentorDuplicateResult } from './MentorBreakthrough';

/** 溢出獎勵積分（規格 M-2）：SSR 500、SR 100、R 20 */
export const MENTOR_OVERFLOW_SCORE: Readonly<Record<string, number>> = { SSR: 500, SR: 100, R: 20 };

/** 稀有度對應的溢出積分；未知稀有度為 0（不入帳，由上游資料把關） */
export function overflowScoreOf(rarity: string): number {
    return MENTOR_OVERFLOW_SCORE[rarity] ?? 0;
}

export interface MentorDuplicateOutcome {
    result: MentorDuplicateResult;
    /** 本次入帳的積分（只有溢出才有） */
    scoreGain: number;
}

/** 重複卡判定 + 溢出入帳：突破時 scoreGain 為 0，溢出時為稀有度積分。 */
export function resolveMentorDuplicate(currentStar: number | undefined, rarity: string): MentorDuplicateOutcome {
    const result = applyDuplicateMentorCard(currentStar);
    return { result, scoreGain: result.kind === 'overflow' ? overflowScoreOf(rarity) : 0 };
}

/** 溢出 Toast 文案（規格 M-3）：「{CardName} 已滿突破，轉化為積分×{N}」 */
export function overflowToastText(cardName: string, scoreGain: number): string {
    return `${cardName} 已滿突破，轉化為積分×${scoreGain}`;
}
