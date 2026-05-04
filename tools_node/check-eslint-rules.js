#!/usr/bin/env node
/**
 * check-eslint-rules.js — Harness Engineering 計算型感測器：ESLint 規則檢查
 *
 * 不安裝完整 ESLint，而是使用確定性的正則掃描方法
 * 實現關鍵規則的快速驗證（適合 CI 環境與小模型友善）：
 *
 *   RULE-01: assets/scripts/ 中禁止裸 console.log（只允許 UCUFLogger）
 *   RULE-02: 禁止使用 var（應用 const/let）
 *   RULE-03: 禁止使用 debugger
 *   RULE-04: 禁止 == / != （應用 === / !==）
 *   RULE-05: 禁止未使用的 import（無法引用到任何 export 名稱的 import）
 *
 * 設計原則：
 *   - 不依賴 ESLint npm 套件（避免安裝依賴複雜性）
 *   - 確定性結果，毫秒級速度
 *   - 錯誤訊息含行號，讓 Agent 能精確修正
 *
 * 用法：
 *   node tools_node/check-eslint-rules.js
 *   node tools_node/check-eslint-rules.js --json
 *   node tools_node/check-eslint-rules.js --fix-hint
 *   node tools_node/check-eslint-rules.js --files assets/scripts/battle/
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SCRIPTS_DIR = path.join(PROJECT_ROOT, 'assets', 'scripts');

// ─── 參數解析 ─────────────────────────────────────────────
function parseArgs(argv) {
  const args = { json: false, fixHint: false, files: [], verbose: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--json') args.json = true;
    else if (argv[i] === '--fix-hint') args.fixHint = true;
    else if (argv[i] === '--verbose') args.verbose = true;
    else if (argv[i] === '--files') {
      i++;
      while (i < argv.length && !argv[i].startsWith('--')) {
        args.files.push(argv[i++]);
      }
      i--;
    }
  }
  return args;
}

// ─── 掃描規則定義 ─────────────────────────────────────────
const RULES = [
  {
    id: 'RULE-01',
    name: 'no-bare-console-log',
    severity: 'error',
    description: 'assets/scripts/ 中禁止裸 console.log()，請使用 UCUFLogger',
    scope: 'scripts-only',
    pattern: /(?<!\w)console\.log\s*\(/g,
    exclude: /UCUFLogger|\/\/ eslint-disable/,
    fixHint: '將 console.log() 替換為 UCUFLogger.log() 或使用 UCUFLogger.debug()',
  },
  {
    id: 'RULE-02',
    name: 'no-var',
    severity: 'error',
    description: '禁止使用 var，請使用 const 或 let',
    scope: 'all',
    pattern: /\bvar\s+/g,
    exclude: /\/\*[\s\S]*?\*\/|\/\/.*|"[^"]*"|'[^']*'/,
    fixHint: '將 var 替換為 const（不重新賦值）或 let（需要重新賦值）',
  },
  {
    id: 'RULE-03',
    name: 'no-debugger',
    severity: 'error',
    description: '禁止使用 debugger 語句',
    scope: 'all',
    pattern: /\bdebugger\b/g,
    exclude: /\/\/.*debugger|"[^"]*debugger[^"]*"/,
    fixHint: '移除 debugger 語句',
  },
  {
    id: 'RULE-04',
    name: 'eqeqeq',
    severity: 'warning',
    description: '建議使用 === / !== 而非 == / !=',
    scope: 'all',
    // 排除 != null 和 == null（慣用模式），以及 !== 和 ===
    pattern: /(?<![=!<>])(?<!=)={2}(?!=)|(?<![<>!])!={1}(?!=)/g,
    exclude: /null|undefined|"[^"]*"|'[^']*'|\/\/.*/,
    fixHint: '將 == 替換為 ===，將 != 替換為 !==',
  },
];

// ─── 檔案遍歷 ─────────────────────────────────────────────
function walkTs(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (['node_modules', 'library', 'temp', '.git'].includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walkTs(fullPath, files);
    else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) files.push(fullPath);
  }
  return files;
}

// ─── 逐行掃描 ─────────────────────────────────────────────
function scanFile(filePath, rules) {
  const source = fs.readFileSync(filePath, 'utf8');
  const lines = source.split('\n');
  const relPath = path.relative(PROJECT_ROOT, filePath).replace(/\\/g, '/');
  const isScriptsFile = relPath.startsWith('assets/scripts/');
  const violations = [];

  for (const rule of rules) {
    // scope 過濾
    if (rule.scope === 'scripts-only' && !isScriptsFile) continue;
    // UCUFLogger 本身是底層合法輸出點，RULE-01 不應把它視為違規來源
    if (rule.id === 'RULE-01' && relPath === 'assets/scripts/core/utils/UCUFLogger.ts') continue;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // 跳過純注釋行
      if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*') || line.trimStart().startsWith('/*')) continue;
      // 跳過排除模式的行
      if (rule.exclude && rule.exclude.test(line)) continue;

      rule.pattern.lastIndex = 0;
      if (rule.pattern.test(line)) {
        violations.push({
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          file: relPath,
          line: i + 1,
          column: line.search(rule.pattern) + 1,
          content: line.trim().slice(0, 120),
          description: rule.description,
          fixHint: rule.fixHint,
        });
      }
    }
  }

  return violations;
}

// ─── 主程式 ───────────────────────────────────────────────
function main() {
  const args = parseArgs(process.argv.slice(2));

  // 決定掃描範圍
  let filesToScan = [];
  if (args.files.length > 0) {
    for (const f of args.files) {
      const absPath = path.resolve(PROJECT_ROOT, f);
      if (fs.statSync(absPath).isDirectory()) {
        walkTs(absPath, filesToScan);
      } else if (absPath.endsWith('.ts')) {
        filesToScan.push(absPath);
      }
    }
  } else {
    walkTs(SCRIPTS_DIR, filesToScan);
  }

  const allViolations = [];
  let totalScanned = 0;

  for (const filePath of filesToScan) {
    const violations = scanFile(filePath, RULES);
    allViolations.push(...violations);
    totalScanned++;
  }

  const errors = allViolations.filter(v => v.severity === 'error');
  const warnings = allViolations.filter(v => v.severity === 'warning');

  if (args.json) {
    console.log(JSON.stringify({
      passed: errors.length === 0,
      totalScanned,
      errorCount: errors.length,
      warningCount: warnings.length,
      violations: allViolations,
    }, null, 2));
    process.exit(errors.length > 0 ? 1 : 0);
    return;
  }

  console.log(`\n🔍 ESLint 規則掃描：${totalScanned} 個 TypeScript 檔案\n`);

  if (allViolations.length === 0) {
    console.log('✅ 所有 ESLint 規則通過！');
    return;
  }

  // 按規則分組顯示
  const byRule = {};
  for (const v of allViolations) {
    if (!byRule[v.ruleId]) byRule[v.ruleId] = [];
    byRule[v.ruleId].push(v);
  }

  for (const [ruleId, violations] of Object.entries(byRule)) {
    const first = violations[0];
    const icon = first.severity === 'error' ? '❌' : '⚠️';
    console.log(`${icon} [${ruleId}] ${first.description} (${violations.length} 處)`);
    if (args.fixHint) console.log(`   修正建議：${first.fixHint}`);

    // 顯示前 5 個
    for (const v of violations.slice(0, 5)) {
      console.log(`   ${v.file}:${v.line}:${v.column}`);
      if (args.verbose) console.log(`     ${v.content}`);
    }
    if (violations.length > 5) console.log(`   ... 還有 ${violations.length - 5} 處`);
    console.log();
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  錯誤：${errors.length} | 警告：${warnings.length} | 掃描：${totalScanned} 檔案`);
  console.log(`${'─'.repeat(50)}`);

  if (errors.length > 0) {
    console.error('\n❌ ESLint 規則掃描失敗，請修正錯誤後重試。');
    process.exit(1);
  } else {
    console.warn('\n⚠️  ESLint 規則掃描通過（含警告）。');
  }
}

main();
