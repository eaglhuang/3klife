#!/usr/bin/env node
/**
 * check-api-bypass.js — 防繞過共通 API 的基準棘輪（PROG-2-9201；共用框架總綱 doc_spec_1182 §5.10）
 *
 * 玩法與 UI 程式不准直接改重要數值或直接寫存檔，必須走 IApiClient（assets/scripts/shared/api、core/api）。
 * 本腳本掃 assets/scripts，數「繞過點」（庫存寫入、貨幣寫入、存檔寫入、localStorage、受保護欄位賦值），
 * 與 tools_node/api-bypass-baseline.json 比較：每個「檔案×規則」的數量只准減、不准增，新增即 exit 1。
 * 比照 tools_node/test-tsc-baseline.json 的棘輪做法；遷移完成一塊，就用 --update 把基準往下調。
 *
 * 用法：
 *   node tools_node/check-api-bypass.js            # 檢查（compute-gate 呼叫）
 *   node tools_node/check-api-bypass.js --update   # 把基準調低到目前數字（有任何增加時拒絕）
 *   node tools_node/check-api-bypass.js --json
 *
 * 例外：adapter 目錄（assets/scripts/shared/api、assets/scripts/core/api）與家族登記表本體（shared/family，權威端實作）整個不掃；
 * 設定檔 exemptions 列出的「檔案×規則」豁免（clientOwned：音效、設定、收藏等），清單固定在基準檔，
 * 不得就地新增，需總 PM 審核。檔案頂端寫 `// api-bypass-allowed: <原因>` 的檔案同樣豁免該檔所有規則（同需審核）。
 */
'use strict';

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SCRIPTS_DIR = path.join(PROJECT_ROOT, 'assets', 'scripts');
const BASELINE_PATH = path.join(__dirname, 'api-bypass-baseline.json');

/** 不掃的 adapter 目錄（相對 assets/scripts，正斜線） */
const ADAPTER_DIRS = ['shared/api/', 'core/api/', 'shared/family/'];

/**
 * 偵測規則。每條對「去除註解後的單行」比對；排除函式／方法定義行（那是權威實作本身，不是呼叫端）。
 * 規則名稱即基準檔的 key。
 */
const RULES = [
  { id: 'inventory-write', desc: '直接改庫存（addItem／consumeItem／addItems）', re: /\b(?:addItem|consumeItem|addItems)\s*\(/g },
  { id: 'currency-write', desc: '直接扣發貨幣（spendCurrency／grantCurrency／setGachaWalletSave）', re: /\b(?:spendCurrency|grantCurrency|setGachaWalletSave|setGachaPityBook)\s*\(/g },
  { id: 'save-write', desc: '直接使用存檔後端（PlayerSaveService、PlayerRosterService 寫入）', re: /\bnew\s+PlayerSaveService\b|\bPlayerRosterService\s*\.\s*(?:replaceAll|save|add|remove)\w*\s*\(/g },
  { id: 'local-storage', desc: '直接使用 localStorage（clientOwned 以外都應走 save.commit）', re: /\blocalStorage\b/g },
  { id: 'protected-assign', desc: '對受保護欄位賦值（_inventory／_gachaWallet／_fame 等）', re: /\b_(?:inventory|gachaWallet|gachaPity|fame|scorePoints|oracleCount)\s*(?:[+\-*]?=(?!=)|\+\+|--)/g },
  { id: 'academy-write', desc: '學府修業直連 GameSession 寫入（new GameAcademySaveStore／session.setAcademyRecord；應走 save.write／task.advance／rng.issueSeed，PROG-2-9215）', re: /\bnew\s+GameAcademySaveStore\b|\bsession\s*\.\s*setAcademyRecord\s*\(/g },
  { id: 'skill-write', desc: '直接改技能持有（learnedTactics／skillMeta／skillModifiers 賦值或 push；應走 skill.grant／learn／applyModifier；學府修業中的 state 快照不算）', re: /(?<!\bstate)\.\s*(?:learnedTactics|skillMeta|skillModifiers)\s*(?:=(?!=)|\.\s*(?:push|unshift|splice|pop|shift)\s*\()/g },
  { id: 'family-write', desc: '直接寫家族登記表（addFamilyMember／removeFamilyMember／markFamilyBranch；應走家族命令，TC-FAM-09，doc_spec_1241）', re: /\b(?:addFamilyMember|removeFamilyMember|markFamilyBranch)\s*\(/g },
];

const WRITE_NAMES = 'addItem|consumeItem|addItems|spendCurrency|grantCurrency|setGachaWalletSave|setGachaPityBook|addFamilyMember|removeFamilyMember|markFamilyBranch';

/** 是否為定義行（宣告函式／方法／介面簽名本身）而非呼叫 */
function isDefinitionLine(line) {
  const names = `(?:${WRITE_NAMES})`;
  if (new RegExp(String.raw`^\s*(?:export\s+)?(?:(?:public|private|protected|static|async|abstract)\s+)+${names}\b`).test(line)) return true;
  if (new RegExp(String.raw`^\s*(?:export\s+)?(?:async\s+)?function\s+${names}\b`).test(line)) return true;
  // 沒有修飾詞的簽名：第一個參數帶型別註解（介面方法或類別方法）
  if (new RegExp(String.raw`^\s*${names}\s*(?:<[^>]*>)?\(\s*\w+\??\s*:`).test(line)) return true;
  return false;
}

/** 去掉註解與字串內容，保留行數（字串內的文字不算呼叫） */
function stripComments(source) {
  let out = '';
  let i = 0;
  const n = source.length;
  while (i < n) {
    const c = source[i];
    const d = source[i + 1];
    if (c === '/' && d === '/') {
      while (i < n && source[i] !== '\n') i += 1;
    } else if (c === '/' && d === '*') {
      i += 2;
      while (i < n && !(source[i] === '*' && source[i + 1] === '/')) {
        if (source[i] === '\n') out += '\n';
        i += 1;
      }
      i += 2;
    } else if (c === '"' || c === "'" || c === '`') {
      const quote = c;
      out += quote;
      i += 1;
      while (i < n && source[i] !== quote) {
        if (source[i] === '\\') i += 1;
        if (source[i] === '\n') out += '\n';
        i += 1;
      }
      out += quote;
      i += 1;
    } else {
      out += c;
      i += 1;
    }
  }
  return out;
}

/** 掃一段原始碼，回傳 { ruleId: count } */
function scanSource(source) {
  const lines = stripComments(source).split('\n');
  const counts = {};
  for (const line of lines) {
    if (!line.trim()) continue;
    if (isDefinitionLine(line)) continue;
    for (const rule of RULES) {
      rule.re.lastIndex = 0;
      const matches = line.match(rule.re);
      if (matches) counts[rule.id] = (counts[rule.id] || 0) + matches.length;
    }
  }
  return counts;
}

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '_pending-delete') continue;
      walk(full, out);
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      out.push(full);
    }
  }
  return out;
}

function hasAllowedHeader(source) {
  return /^\s*(?:\/\/\s*api-bypass-allowed:|\/\*\s*api-bypass-allowed:)/m.test(source.split('\n').slice(0, 5).join('\n'));
}

/** 掃全專案，回傳 { 'rel/path.ts': { ruleId: count } } */
function scanProject(baseline) {
  const exemptions = (baseline && baseline.exemptions) || [];
  const result = {};
  for (const file of walk(SCRIPTS_DIR, [])) {
    const rel = path.relative(SCRIPTS_DIR, file).split(path.sep).join('/');
    if (ADAPTER_DIRS.some((d) => rel.startsWith(d))) continue;
    const source = fs.readFileSync(file, 'utf8');
    if (hasAllowedHeader(source)) continue;
    const counts = scanSource(source);
    for (const ex of exemptions) {
      if (ex.file === rel) for (const r of ex.rules) delete counts[r];
    }
    if (Object.keys(counts).length > 0) result[rel] = counts;
  }
  return result;
}

function totalOf(perFile) {
  let total = 0;
  const perRule = {};
  for (const counts of Object.values(perFile)) {
    for (const [rule, n] of Object.entries(counts)) {
      total += n;
      perRule[rule] = (perRule[rule] || 0) + n;
    }
  }
  return { total, perRule };
}

function loadBaseline() {
  if (!fs.existsSync(BASELINE_PATH)) return null;
  return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
}

/** 比較目前與基準：回傳 { increases: [...], decreases: [...] } */
function compare(current, baseline) {
  const base = (baseline && baseline.perFile) || {};
  const increases = [];
  const decreases = [];
  const files = new Set([...Object.keys(current), ...Object.keys(base)]);
  for (const file of files) {
    const cur = current[file] || {};
    const old = base[file] || {};
    for (const rule of new Set([...Object.keys(cur), ...Object.keys(old)])) {
      const a = cur[rule] || 0;
      const b = old[rule] || 0;
      if (a > b) increases.push({ file, rule, baseline: b, current: a });
      else if (a < b) decreases.push({ file, rule, baseline: b, current: a });
    }
  }
  return { increases, decreases };
}

function main(argv) {
  const json = argv.includes('--json');
  const update = argv.includes('--update');
  const baseline = loadBaseline();
  const current = scanProject(baseline);
  const { total, perRule } = totalOf(current);
  const { increases, decreases } = compare(current, baseline);
  const baseTotal = baseline ? baseline.total : null;

  if (update) {
    if (increases.length > 0 && baseline) {
      console.error('[api-bypass] 拒絕更新基準：有繞過點增加（基準只准減不准增）。');
      for (const x of increases) console.error(`  ${x.file} [${x.rule}] ${x.baseline} -> ${x.current}`);
      process.exit(1);
    }
    const next = {
      $comment: '防繞過共通 API 的基準棘輪（check-api-bypass.js；總綱 doc_spec_1182 §5.10）。只能往下調（遷移完成後用 --update），不得往上調；新增繞過點即 exit 1。exemptions 為 clientOwned 豁免清單，需總 PM 審核才能新增。',
      total,
      perRule,
      exemptions: (baseline && baseline.exemptions) || [],
      perFile: Object.fromEntries(Object.keys(current).sort().map((k) => [k, current[k]])),
    };
    fs.writeFileSync(BASELINE_PATH, JSON.stringify(next, null, 2) + '\n', 'utf8');
    console.log(`[api-bypass] 基準已更新：${baseTotal === null ? '新建' : `${baseTotal} -> `}${total}`);
    return 0;
  }

  if (!baseline) {
    console.error('[api-bypass] 找不到 tools_node/api-bypass-baseline.json；請先執行 --update 建立基準。');
    return 1;
  }

  if (json) {
    console.log(JSON.stringify({ total, baselineTotal: baseTotal, perRule, increases, decreases }, null, 2));
  } else {
    console.log(`[api-bypass] 繞過點 ${total}（基準 ${baseTotal}）`);
    for (const rule of RULES) console.log(`  ${rule.id}: ${perRule[rule.id] || 0}  ${rule.desc}`);
  }

  if (increases.length > 0) {
    console.error('\n[api-bypass] 失敗：新增了繞過共通 API 的程式（玩法／UI 不可直接改重要數值或直接寫存檔）：');
    for (const x of increases) console.error(`  ${x.file}  [${x.rule}]  基準 ${x.baseline} -> 目前 ${x.current}`);
    console.error('修正方式：改呼叫 services().api.cmd(...)（命令見 assets/scripts/shared/api/ApiCommands.ts）；若是 clientOwned 偏好設定，請總 PM 將檔案加入基準檔 exemptions。');
    return 1;
  }
  if (decreases.length > 0 && !json) {
    console.log(`[api-bypass] 繞過點已減少 ${decreases.length} 處，可執行 node tools_node/check-api-bypass.js --update 把基準往下調。`);
  }
  return 0;
}

if (require.main === module) {
  process.exit(main(process.argv.slice(2)));
}

module.exports = { scanSource, stripComments, compare, RULES, isDefinitionLine };
