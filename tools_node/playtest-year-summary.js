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

/**
 * 首戰探針摘要行（PROG-2-10010）：天氣、計謀施放成敗、格子特效數。
 * 例：首戰天氣 WINDY；計謀 tactic-fire-scheme 成功；格子特效 3（hook 1）
 * 火計天氣不符改放別的：首戰天氣 SUNNY；計謀 X 成功（火計 tactic-fire-scheme 改放：CONDITION_UNMET）；格子特效 0（hook 0）
 * 全部失敗：首戰天氣 SUNNY；計謀 失敗（原因）；格子特效 無
 *
 * @param {{ weather?: string|null, tactic?: { ok?: boolean, tacticId?: string|null, reason?: string|null, fallbackFrom?: string|null, fallbackReason?: string|null, nodes?: number|null, hooks?: number|null }|null }} info
 * @returns {string}
 */
function formatFirstBattleLine(info) {
  const weather = (info && info.weather) || '?';
  const t = (info && info.tactic) || null;
  if (!t || !t.ok) {
    const reason = (t && t.reason) || '未嘗試';
    return `首戰天氣 ${weather}；計謀 失敗（${reason}）；格子特效 無`;
  }
  const fallback = t.fallbackFrom ? `（${t.fallbackFrom} 改放：${t.fallbackReason || '未達施放條件'}）` : '';
  const nodes = Number.isFinite(t.nodes) ? t.nodes : '?';
  const hooks = Number.isFinite(t.hooks) ? `（hook ${t.hooks}）` : '';
  return `首戰天氣 ${weather}；計謀 ${t.tacticId || '?'} 成功${fallback}；格子特效 ${nodes}${hooks}`;
}

module.exports = { battleResultLabel, formatYearQuarterLine, formatFirstBattleLine };
