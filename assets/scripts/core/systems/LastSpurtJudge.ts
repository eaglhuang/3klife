// @spec-source → 育成與戰鬥公式基準手冊.md §2 分段戰鬥控制器「殘局判斷器」與 §4.2 殘局爆發；WBS FORM-10
/**
 * LastSpurtJudge — 殘局判斷器（純邏輯，不依賴 cc）
 *
 * 規格：第 5 回合（或場上存活人數 < 50%）切換為殘局模式。
 *
 * 暫定（可逆）：
 * - 存活比例以「雙方合計存活兵力 ÷ 戰場出現過的最高兵力」計算；規格沒說分陣營還是合計，先合計。
 * - 殘局一旦進入就不再退出（sticky），呼叫端負責保留旗標。
 * - 「累積加成」（Connection 監視器）與殘局的屬性權重、AP 規則的數字規格未給，本模組不處理。
 *
 * Unity 對照：像一個依回合數與場上剩餘單位判斷的 Phase 切換器，切換後只通知一次，不會因為數字回升又切回去。
 */

/** 規格：第 5 回合進入殘局 */
export const LAST_SPURT_TURN = 5;
/** 規格：場上存活低於 50% 進入殘局 */
export const LAST_SPURT_SURVIVOR_RATIO = 0.5;

export type LastSpurtReason = 'turn' | 'attrition';

export interface LastSpurtInput {
    /** 目前回合（從 1 開始） */
    turn: number;
    /** 雙方目前存活兵力數 */
    livingTroops: number;
    /** 戰場出現過的最高兵力數 */
    peakTroops: number;
}

/** 這一回合是否滿足殘局條件；不滿足回傳 null。回合條件優先於存活條件。 */
export function lastSpurtReasonOf(input: LastSpurtInput): LastSpurtReason | null {
    if (input.turn >= LAST_SPURT_TURN) return 'turn';
    if (input.peakTroops > 0 && input.livingTroops / input.peakTroops < LAST_SPURT_SURVIVOR_RATIO) return 'attrition';
    return null;
}
