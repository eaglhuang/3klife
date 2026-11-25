'use strict';

/**
 * 自動代打時 QA 腳本「補按結束回合」的決策（PROG-2-9803）。
 *
 * 舊行為的問題：回合停住超過 12 秒就每秒按一次結束回合並計數，但遊戲在回合推進中會靜默忽略結束回合，
 * 正常的推進演出就會被算成 fallback（首戰 37 次的來源）。
 *
 * 新規則：只有「回合推進演出已結束、按鈕確實可操作、回合停住超過門檻」才補按並計入 endTurnFallbacks。
 * 推進中、單挑／奧義演出中、等待出陣、戰鬥已結束時一律不按也不計。
 * 讀不到戰場狀態（state 為 null）時仍按一次以免卡死，但不計入 fallback，改記到 unknownStateClicks。
 *
 * @param {object} input
 * @param {boolean} input.autoPlay 是否開啟自動代打
 * @param {boolean} input.stalled 回合是否已停住超過門檻
 * @param {object|null} input.state battleState() 的結果（null＝找不到戰場）
 * @returns {{ click: boolean, count: boolean, unknownState: boolean, reason: string }}
 */
function decideEndTurnAction({ autoPlay, stalled, state }) {
  if (!autoPlay) return { click: true, count: false, unknownState: false, reason: 'manual-end-turn' };
  if (!stalled) return { click: false, count: false, unknownState: false, reason: 'auto-advancing' };
  if (!state) return { click: true, count: false, unknownState: true, reason: 'unknown-state' };
  if (state.advancing) return { click: false, count: false, unknownState: false, reason: 'turn-advancing' };
  if (state.ultCutin) return { click: false, count: false, unknownState: false, reason: 'ult-cutin' };
  if (state.duelPanel) return { click: false, count: false, unknownState: false, reason: 'duel-panel' };
  if (state.waitingDuel) return { click: false, count: false, unknownState: false, reason: 'waiting-duel-placement' };
  if (state.battleEnded) return { click: false, count: false, unknownState: false, reason: 'battle-ended' };
  if (state.canAdvance !== true) return { click: false, count: false, unknownState: false, reason: 'cannot-advance' };
  return { click: true, count: true, unknownState: false, reason: 'stalled-actionable' };
}

module.exports = { decideEndTurnAction };
