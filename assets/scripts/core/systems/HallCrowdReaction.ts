// @spec-source → 大廳系統.md (doc_spec_0002) §E-5 第 6 點「高難任務被接取時，在場武將短時集體反應」（PROG-2-1740）
/**
 * HallCrowdReaction — 高難任務派遣時大廳人群的集體反應（純邏輯，不依賴 cc）
 *
 * 規格只寫「高難任務」與「短時集體反應」，沒有門檻與演出內容（暫定）：
 * - 高難＝五級難度中的高級（ADVANCED）與地獄（HELL）。
 * - 反應＝在場每位武將頭上跳出驚嘆號，持續 1.2 秒；地獄任務用兩個驚嘆號。
 *
 * Unity 對照：像 Animator 的 Trigger 參數表，資料決定要不要觸發、播什麼，View 只負責播放。
 */

export interface HallCrowdReaction {
    /** 頭上跳出的字 */
    text: string;
    /** 持續秒數 */
    durationSec: number;
}

export const HALL_CROWD_REACTIONS: Readonly<Record<string, HallCrowdReaction>> = Object.freeze({
    ADVANCED: Object.freeze({ text: '！', durationSec: 1.2 }),
    HELL: Object.freeze({ text: '！！', durationSec: 1.2 }),
});

/** 依任務難度回傳要播的集體反應；不是高難任務時回傳 null */
export function hallCrowdReactionOf(difficulty: string | null | undefined): HallCrowdReaction | null {
    if (!difficulty) return null;
    return HALL_CROWD_REACTIONS[difficulty] ?? null;
}
