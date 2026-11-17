// @spec-source → 戰場武將單挑對決與斬將功能規格書 (doc_spec_0314) §4.1；PROG-2-9369
/**
 * DuelVictoryBuff — 單挑勝方的全軍暴擊加成（純邏輯，不依賴 cc）。
 *
 * 規格：勝方全軍暴擊率 +15% 持續 2 回合。以勝方陣營為鍵存在 BattleState，
 * 勝方自己的回合頭倒數一次；倒數到 0 即失效。
 *
 * Unity 對照：掛在陣營上的限時 Buff 資料，回合開始時 Tick。
 */
export interface DuelVictoryBuff {
    critBonus: number;
    remainingTurns: number;
}

/** 勝方回合頭倒數；到 0 回 null（失效） */
export function tickDuelVictoryBuff(buff: DuelVictoryBuff | null): DuelVictoryBuff | null {
    if (!buff) return null;
    const remainingTurns = buff.remainingTurns - 1;
    return remainingTurns > 0 ? { critBonus: buff.critBonus, remainingTurns } : null;
}

/** 目前的暴擊加成；沒有或已過期為 0 */
export function duelVictoryCritBonus(buff: DuelVictoryBuff | null | undefined): number {
    return buff && buff.remainingTurns > 0 ? buff.critBonus : 0;
}

/**
 * 起始回合數：勝方就是正在行動的一方時，當回合算第 1 回合；
 * 勝方不是行動方（被挑戰的一方贏了）時，下一次回合頭的倒數不該吃掉一回合，所以多給 1。
 */
export function duelVictoryBuffTurns(baseTurns: number, winnerIsActing: boolean): number {
    return baseTurns + (winnerIsActing ? 0 : 1);
}
