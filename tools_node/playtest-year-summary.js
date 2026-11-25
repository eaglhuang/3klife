'use strict';

/**
 * 年循環每季摘要行的文字規則（PROG-2-10003）。
 *
 * 舊行為：「戰鬥 失敗/失敗；錯誤 1」把兩件事混在一起：
 *   - 戰鬥「失敗」是遊戲結算畫面的輸贏結果（我軍敗北），不是腳本錯誤，也沒有 console error／pageerror；
 *   - 「錯誤 N」是該季所有子步驟（內政、任務、培育…）失敗的筆數，跟戰鬥輸贏無關。
 * 新規則：輸贏顯示「勝利／敗北」，步驟失敗另計並說明不含戰鬥輸贏。
 */

/** 結算畫面的結果文字轉成摘要用字；極速決戰結果（「極速：…」）原樣保留 */
function battleResultLabel(battle) {
  if (!battle.ok) return '步驟失敗';
  const result = battle.result || '';
  if (/^(失敗|戰敗)$/.test(result)) return '敗北';
  return result || '?';
}

/**
 * @param {{ season: string|null, seasonAfter?: string|null, battles: Array<{ ok: boolean, result: string|null }>, errors: string[] }} yq
 * @returns {string}
 */
function formatYearQuarterLine(yq) {
  const labels = yq.battles.map(battleResultLabel).join('/') || '無';
  return `年循環 ${yq.season} → ${yq.seasonAfter || '?'}：戰鬥 ${labels}；步驟失敗 ${yq.errors.length}（戰鬥輸贏不算在內）`;
}

module.exports = { battleResultLabel, formatYearQuarterLine };
