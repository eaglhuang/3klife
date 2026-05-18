#!/usr/bin/env node
'use strict';

/**
 * memory-authority-boundary-validator.js — TASK-DGB-0009
 *
 * 白話：Project Memory 條目必須待在自己的「管轄邊界」內。
 * 這個工具逐條驗證每個 project-memory 條目：
 *   1. authorityLevel 必須是 "project-memory" 或 "agent-runtime"（不能更高）
 *   2. 格式必須符合 project-memory-schema.json
 *   3. overridePolicy 如果是 "deny"，content.rules 必須有至少一條 ruleId
 *   4. 若 id 重複（同一 memoryDir 有多個條目用同一 id），報告衝突
 *   5. 可選：若有 sourceRef，確認參照路徑存在
 *
 * 與 conflict-finder.js 的分工：
 *   - conflict-finder.js：找「內容語意」的跨文件衝突（內容 vs. governance 規則）
 *   - memory-authority-boundary-validator.js：找「格式 + 結構 + authority」的合規問題
 *
 * 使用方式：
 *   node tools_node/memory-authority-boundary-validator.js [--memory-dir <path>] [--strict] [--json]
 *
 * Exit codes: 0 = all valid / 1 = error / 2 = invalid entries (only when --strict)
 */

const fs = require('fs');
const path = require('path');
const config = require('./lib/project-config');

const ROOT = config.ROOT;

// 允許 project memory 使用的 authorityLevel 值
const ALLOWED_AUTHORITY_LEVELS = new Set(['project-memory', 'agent-runtime']);

// id 格式: pm-<kebab-case>
const ID_PATTERN = /^pm-[a-z0-9-]+$/;

// ─── schema 欄位規格（輕量版，不依賴 AJV，保持零額外相依）─────────────────────

const REQUIRED_FIELDS = ['schemaVersion', 'kind', 'id', 'capturedAt', 'authorityLevel', 'scope', 'content'];

function validateEntry(data, filePath) {
  const issues = [];
  const rel = path.relative(ROOT, filePath).replace(/\\/g, '/');

  // 1. 必填欄位
  for (const field of REQUIRED_FIELDS) {
    if (data[field] === undefined || data[field] === null) {
      issues.push({ severity: 'error', field, message: `Missing required field "${field}"` });
    }
  }

  // 2. schemaVersion
  if (data.schemaVersion !== 'project-memory/v1') {
    issues.push({ severity: 'error', field: 'schemaVersion', message: `Expected "project-memory/v1", got "${data.schemaVersion}"` });
  }

  // 3. kind
  if (data.kind !== 'project-memory') {
    issues.push({ severity: 'error', field: 'kind', message: `Expected "project-memory", got "${data.kind}"` });
  }

  // 4. id 格式
  if (data.id && !ID_PATTERN.test(data.id)) {
    issues.push({ severity: 'error', field: 'id', message: `id "${data.id}" does not match pattern pm-<kebab-case>` });
  }

  // 5. capturedAt 格式
  if (data.capturedAt) {
    const d = new Date(data.capturedAt);
    if (isNaN(d.getTime())) {
      issues.push({ severity: 'error', field: 'capturedAt', message: `capturedAt "${data.capturedAt}" is not a valid ISO 8601 date-time` });
    }
  }

  // 6. authorityLevel 越界
  if (data.authorityLevel && !ALLOWED_AUTHORITY_LEVELS.has(data.authorityLevel)) {
    issues.push({
      severity: 'error',
      field: 'authorityLevel',
      message: `authorityLevel "${data.authorityLevel}" is above project-memory boundary; allowed values: ${[...ALLOWED_AUTHORITY_LEVELS].join(', ')}`,
    });
  }

  // 7. scope 非空字串
  if (typeof data.scope === 'string' && data.scope.trim().length === 0) {
    issues.push({ severity: 'warn', field: 'scope', message: 'scope is an empty string; provide a meaningful domain name' });
  }

  // 8. content.summary 非空
  if (data.content && typeof data.content.summary === 'string' && data.content.summary.trim().length === 0) {
    issues.push({ severity: 'warn', field: 'content.summary', message: 'content.summary is empty; add a meaningful description' });
  }

  // 9. overridePolicy=deny 時必須有 rules
  if (data.overridePolicy === 'deny') {
    const hasRules = Array.isArray(data.content?.rules) && data.content.rules.length > 0;
    if (!hasRules) {
      issues.push({
        severity: 'warn',
        field: 'overridePolicy',
        message: 'overridePolicy is "deny" but content.rules is empty; add at least one ruleId to clarify what is being protected',
      });
    }
  }

  // 10. rules 中的 ruleId 格式檢查
  if (Array.isArray(data.content?.rules)) {
    for (const rule of data.content.rules) {
      if (!rule.ruleId || typeof rule.ruleId !== 'string') {
        issues.push({ severity: 'error', field: 'content.rules[].ruleId', message: 'Each rule must have a non-empty ruleId string' });
      }
      if (!rule.description || typeof rule.description !== 'string') {
        issues.push({ severity: 'error', field: 'content.rules[].description', message: 'Each rule must have a non-empty description' });
      }
    }
  }

  // 11. keyValuePairs 值必須全是 string
  if (data.content?.keyValuePairs && typeof data.content.keyValuePairs === 'object') {
    for (const [k, v] of Object.entries(data.content.keyValuePairs)) {
      if (typeof v !== 'string') {
        issues.push({
          severity: 'error',
          field: `content.keyValuePairs.${k}`,
          message: `keyValuePairs value for "${k}" must be a string, got ${typeof v}`,
        });
      }
    }
  }

  // 12. sourceRef 存在性（可選，若有則警告不存在）
  if (data.sourceRef && typeof data.sourceRef === 'string') {
    const refPath = path.isAbsolute(data.sourceRef)
      ? data.sourceRef
      : path.join(ROOT, data.sourceRef);
    if (!fs.existsSync(refPath)) {
      issues.push({
        severity: 'warn',
        field: 'sourceRef',
        message: `sourceRef "${data.sourceRef}" does not exist in the workspace`,
      });
    }
  }

  return { id: data.id || '(unknown)', file: rel, issues };
}

// ─── scan ─────────────────────────────────────────────────────────────────────

function scanMemoryDir(memoryDir) {
  const results = [];
  if (!fs.existsSync(memoryDir)) return results;

  function scan(dir) {
    let names;
    try { names = fs.readdirSync(dir); } catch { return; }
    for (const name of names) {
      const full = path.join(dir, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        scan(full);
      } else if (name.endsWith('.json')) {
        let data;
        try {
          data = JSON.parse(fs.readFileSync(full, 'utf8'));
        } catch (err) {
          results.push({
            id: '(parse-error)',
            file: path.relative(ROOT, full).replace(/\\/g, '/'),
            issues: [{ severity: 'error', field: 'json', message: `JSON parse error: ${err.message}` }],
          });
          continue;
        }
        if (data && data.schemaVersion === 'project-memory/v1') {
          results.push(validateEntry(data, full));
        }
      }
    }
  }

  scan(memoryDir);
  return results;
}

/**
 * 找出重複 id 的條目
 */
function findDuplicateIds(results) {
  const idToFiles = {};
  for (const r of results) {
    if (!r.id || r.id === '(unknown)' || r.id === '(parse-error)') continue;
    if (!idToFiles[r.id]) idToFiles[r.id] = [];
    idToFiles[r.id].push(r.file);
  }
  const dupes = [];
  for (const [id, files] of Object.entries(idToFiles)) {
    if (files.length > 1) dupes.push({ id, files });
  }
  return dupes;
}

// ─── output ───────────────────────────────────────────────────────────────────

function printHumanReport(results, dupes) {
  const totalEntries = results.length;
  const invalidEntries = results.filter((r) => r.issues.some((i) => i.severity === 'error')).length;
  const warnEntries = results.filter((r) => r.issues.some((i) => i.severity === 'warn')).length;

  console.log('\nMemory Authority Boundary Validator');
  console.log('─'.repeat(50));
  console.log(`Scanned entries : ${totalEntries}`);
  console.log(`Invalid entries : ${invalidEntries}`);
  console.log(`With warnings   : ${warnEntries}`);
  console.log(`Duplicate IDs   : ${dupes.length}`);
  console.log('');

  for (const dupe of dupes) {
    console.log(`🚫 [DUPLICATE-ID] id="${dupe.id}" appears in ${dupe.files.length} files:`);
    for (const f of dupe.files) console.log(`   - ${f}`);
    console.log('');
  }

  for (const r of results) {
    if (r.issues.length === 0) continue;
    const hasError = r.issues.some((i) => i.severity === 'error');
    const icon = hasError ? '🚫' : '⚠️ ';
    console.log(`${icon} ${r.id} (${r.file})`);
    for (const issue of r.issues) {
      const sIcon = issue.severity === 'error' ? '  ✖' : '  ⚠';
      console.log(`${sIcon} [${issue.field}] ${issue.message}`);
    }
    console.log('');
  }

  if (invalidEntries === 0 && dupes.length === 0) {
    console.log('✅ All memory entries pass authority boundary validation.');
  }
}

// ─── args ─────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const parsed = {
    memoryDir: path.join(ROOT, '.memories'),
    strict: false,
    json: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const tok = argv[i];
    if (tok === '--memory-dir') { parsed.memoryDir = path.resolve(argv[i + 1] || ''); i += 1; }
    else if (tok === '--strict') { parsed.strict = true; }
    else if (tok === '--json') { parsed.json = true; }
    else if (tok === '--help' || tok === '-h') { parsed.help = true; }
  }
  return parsed;
}

// ─── main ─────────────────────────────────────────────────────────────────────

function run(argv) {
  const args = parseArgs(argv);

  if (args.help) {
    console.log('Usage: node tools_node/memory-authority-boundary-validator.js [options]');
    console.log('');
    console.log('Validates project-memory/v1 entries against authority boundary rules.');
    console.log('');
    console.log('Options:');
    console.log('  --memory-dir <path>   Directory to scan (default: <repo-root>/.memories)');
    console.log('  --strict              Exit 2 if any invalid entries are found');
    console.log('  --json                Output machine-readable JSON');
    console.log('  --help, -h            Show this help');
    return 0;
  }

  const results = scanMemoryDir(args.memoryDir);
  const dupes = findDuplicateIds(results);

  if (args.json) {
    const errorCount = results.reduce((n, r) => n + r.issues.filter((i) => i.severity === 'error').length, 0);
    console.log(JSON.stringify({
      memoryDir: path.relative(ROOT, args.memoryDir).replace(/\\/g, '/'),
      scannedCount: results.length,
      invalidEntries: results.filter((r) => r.issues.some((i) => i.severity === 'error')).length,
      errorCount,
      duplicateIds: dupes,
      results,
    }, null, 2));
  } else {
    printHumanReport(results, dupes);
  }

  const hasErrors = results.some((r) => r.issues.some((i) => i.severity === 'error')) || dupes.length > 0;
  if (args.strict && hasErrors) return 2;
  return 0;
}

if (require.main === module) {
  process.exitCode = run(process.argv.slice(2));
}

module.exports = { run, validateEntry, scanMemoryDir, findDuplicateIds };
