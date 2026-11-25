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
 * @param {{ weather?: string|null, tactic?: { ok?: boolean, tacticId?: string|null, reason?: string|null, fallbackFrom?: string|null, fallbackReason?: string|null, nodes?: number|null, hooks?: number|null, attempts?: number, noEnemyPolls?: number }|null }} info
 * @returns {string}
 */
function formatFirstBattleLine(info) {
  const weather = (info && info.weather) || '?';
  const t = (info && info.tactic) || null;
  if (!t || !t.ok) {
    const reason = (t && t.reason) || '未嘗試';
    // 嘗試統計（PROG-2-10014）：嘗試幾次、幾次因場上沒有存活敵軍而未試放；沒帶統計時維持舊格式
    const hasStats = t && Number.isFinite(t.attempts);
    const stats = hasStats ? `；嘗試 ${t.attempts} 次、無敵軍空檔 ${Number.isFinite(t.noEnemyPolls) ? t.noEnemyPolls : 0} 次` : '';
    return `首戰天氣 ${weather}；計謀 失敗（${reason}${stats}）；格子特效 無`;
  }
  const fallback = t.fallbackFrom ? `（${t.fallbackFrom} 改放：${t.fallbackReason || '未達施放條件'}）` : '';
  const nodes = Number.isFinite(t.nodes) ? t.nodes : '?';
  const hooks = Number.isFinite(t.hooks) ? `（hook ${t.hooks}）` : '';
  return `首戰天氣 ${weather}；計謀 ${t.tacticId || '?'} 成功${fallback}；格子特效 ${nodes}${hooks}`;
}

/**
 * 已知環境錯誤判斷（PROG-2-10014）：線上 HTTPS 網頁版連本機 NPC brain（POST http://127.0.0.1:8765/v1/npc/dialogue）
 * 被 Chrome 本機網路存取檢查擋下，屬預期環境錯誤，不計入 console error 數，報告另列。
 * 三種樣態：ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS、ERR_FAILED、CORS loopback。
 * 觸發點在大廳端（LobbyScene、AvatarTalkBubble），不是戰場。
 * 暫時性：線上版本來應打 Render 中台，待線上版改打中台後移除本函式；只認 127.0.0.1:8765，其他網址的 NPC 錯誤仍計入錯誤數。
 * @param {string} text console error／requestfailed 文字
 * @returns {boolean}
 */
function isKnownEnvError(text) {
  const t = String(text || '');
  if (!/127\.0\.0\.1:8765\/v1\/npc\/dialogue/.test(t)) return false;
  return /ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS|ERR_FAILED|CORS[\s\S]*loopback|loopback[\s\S]*CORS/i.test(t);
}

const SEASON_LABELS = ['春', '夏', '秋', '冬'];
const ordinalLabel = (o) => (Number.isFinite(o) ? `第 ${Math.floor(o / 4)} 年${SEASON_LABELS[o % 4]}` : '?');

/**
 * 首年全程實玩斷言（--full-year，純函式）：吃 year-report 的季資料，吐檢查清單與摘要行；失敗帶「哪一步＋原因」。
 * 季資料欄位：ordinal、season、seasonAfterOrdinal、topBefore／topAfter（含 jade、silver）、battles（ok、result、tactic.ok）、yearEndBattles、errors。
 * config：minCasts（整年最少放招，預設 1）、yearEndOrdinal（年終守城所在季，預設 7＝第 1 年冬）、expectEndOrdinal（換年後序數，預設 8）、minDistinctSeasons（預設 4）。
 * @param {{ startOrdinal: number|null, baselineAdvances: number, endOrdinal: number|null, quarters: object[], config?: object }} input
 * @returns {{ ok: boolean, checks: Array<{ name: string, ok: boolean, reason: string|null }>, lines: string[] }}
 */
function evaluateFullYear(input) {
  const cfg = Object.assign({ minCasts: 1, yearEndOrdinal: 7, expectEndOrdinal: 8, minDistinctSeasons: 4 }, input.config || {});
  const checks = [];
  const check = (name, ok, reason) => checks.push({ name, ok: Boolean(ok), reason: ok ? null : reason });
  const lines = [];
  const advanced = new Set();
  const base = input.baselineAdvances || 0;
  if (Number.isFinite(input.startOrdinal)) for (let i = 0; i < base; i++) advanced.add((((input.startOrdinal - base + i) % 4) + 4) % 4);
  // 原第 10 步的首戰（開年前已打的那場）也算整年的放招與進戰場
  let casts = input.baselineCasts || 0;
  let battleSeasons = input.baselineBattles || 0;
  for (const q of input.quarters || []) {
    const label = q.season || ordinalLabel(q.ordinal);
    const advOk = Number.isFinite(q.ordinal) && q.seasonAfterOrdinal === q.ordinal + 1;
    if (advOk) advanced.add(q.ordinal % 4);
    const bs = q.battles || [];
    const entered = bs.filter((b) => b.ok && !/^極速/.test(b.result || '')).length;
    if (entered) battleSeasons += 1;
    const qc = bs.filter((b) => b.tactic && b.tactic.ok).length;
    casts += qc;
    const t0 = q.topBefore || {};
    const t1 = q.topAfter || {};
    const d = (k) => (Number.isFinite(t0[k]) && Number.isFinite(t1[k]) ? `${t0[k]}→${t1[k]}` : '?');
    lines.push(`${label}：推進${advOk ? '成功' : '失敗'}；玉 ${d('jade')}；銀兩 ${d('silver')}；進戰場 ${entered} 場；放技能 ${qc} 次；年終守城 ${q.yearEndBattles || 0} 場`);
    const advErr = (q.errors || []).find((e) => /^advance：/.test(e)) || '無';
    if (!advOk) check(`${label} 推進一季`, false, `季別沒有從 ${ordinalLabel(q.ordinal)} 前進一季（advance 錯誤：${advErr}）`);
    if (q.ordinal === cfg.yearEndOrdinal) check('年終守城結算', (q.yearEndBattles || 0) >= 1 && advOk, `${label} 換季沒有進年終守城戰場或沒打到結算（守城 ${q.yearEndBattles || 0} 場；advance 錯誤：${advErr}）`);
  }
  check('四季各推進一次', advanced.size >= cfg.minDistinctSeasons, `只推進過 ${Array.from(advanced).map((i) => SEASON_LABELS[i]).join('、') || '無'}，不足 ${cfg.minDistinctSeasons} 個不同季別`);
  check('戰鬥中手動放技能', casts >= cfg.minCasts, `整年放招 ${casts} 次，少於 ${cfg.minCasts}（看各場 tactic.reason 與天氣；火計需 WINDY）`);
  check('有進戰場', battleSeasons >= 1, '整年沒有任何一季真的進入戰場（只有極速決戰或步驟失敗）');
  check('換年後年份加一且為第一季', input.endOrdinal === cfg.expectEndOrdinal, `期望 ${ordinalLabel(cfg.expectEndOrdinal)}，實際 ${ordinalLabel(input.endOrdinal)}`);
  const failed = checks.filter((c) => !c.ok);
  lines.push(`整年：放招 ${casts} 次；進戰場季數 ${battleSeasons}；終點 ${ordinalLabel(input.endOrdinal)}；${failed.length ? '失敗 ' + failed.map((c) => `【${c.name}】${c.reason}`).join('；') : '全部通過'}`);
  return { ok: !failed.length, checks, lines };
}

module.exports = { evaluateFullYear, battleResultLabel, formatYearQuarterLine, formatFirstBattleLine, isKnownEnvError };
