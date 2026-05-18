#!/usr/bin/env node
'use strict';

/**
 * conflict-finder.js — TASK-DGB-0009
 *
 * 白話：Project Memory 讓你可以跨對話記住一些「共識」，
 * 但這些共識不能和比它更高權威的文件（ATMChart、governance-profile 等）衝突。
 *
 * 這個工具做的事：
 *   1. 掃 .memories/ 目錄（或你指定的目錄），找出所有 project-memory/v1 的記憶條目
 *   2. 掃 .atm/schema/governance-profile.schema.json 等高 authority 文件的「已宣告規則」
 *   3. 比較兩者：若 project memory 裡有規則 ID 或關鍵字和 governance 文件的已知規則重疊，
 *      就標記為衝突，輸出衝突報告
 *   4. 衝突等級：deny (會阻擋) / warn (只警告) / info (僅提示)
 *
 * 使用方式：
 *   node tools_node/conflict-finder.js [--memory-dir <path>] [--strict] [--json]
 *
 * Exit codes: 0 = clean / 1 = error / 2 = conflicts found (only when --strict)
 */

const fs = require('fs');
const path = require('path');
const config = require('./lib/project-config');

const ROOT = config.ROOT;

// ─── Authority 等級數值 ────────────────────────────────────────────────────────
const AUTHORITY_RANK = {
  'agent-runtime': 10,
  'project-memory': 20,
  'governance-profile': 30,
  'atm-charter': 40,
};

// 這些是 governance-profile 已宣告的能力 ID；
// 若 project memory 的 ruleId 或 keyValuePairs key 和這些匹配，視為潛在越界
const GOVERNED_CAPABILITY_IDS = new Set([
  'documentIdentity',
  'documentSharding',
  'taskCards',
  'scopeLock',
  'contextBudget',
  'encodingGuard',
  'handoff',
  'projectMemory',
]);

// governance-profile 中不允許被 project memory 覆蓋的頂層欄位
const PROTECTED_PROFILE_FIELDS = new Set([
  'schemaVersion',
  'profileId',
  'profileVersion',
  'releaseTrain',
  'migration',
]);

// ─── helpers ──────────────────────────────────────────────────────────────────

function loadMemoryEntries(memoryDir) {
  if (!fs.existsSync(memoryDir)) return [];
  const entries = [];

  function scan(dir) {
    let names;
    try { names = fs.readdirSync(dir); } catch { return; }
    for (const name of names) {
      const full = path.join(dir, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        scan(full);
      } else if (name.endsWith('.json')) {
        try {
          const data = JSON.parse(fs.readFileSync(full, 'utf8'));
          if (data && data.schemaVersion === 'project-memory/v1') {
            entries.push({ filePath: full, data });
          }
        } catch {
          // 非 JSON 或無效格式，忽略
        }
      }
    }
  }

  scan(memoryDir);
  return entries;
}

function loadGovernanceProfile() {
  const candidates = [
    path.join(ROOT, '.atm', 'schema', 'governance-profile.schema.json'),
    path.join(ROOT, '.atm', 'config.json'),
  ];
  const profiles = [];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        profiles.push({ filePath: p, data: JSON.parse(fs.readFileSync(p, 'utf8')) });
      } catch { /* skip */ }
    }
  }
  return profiles;
}

/**
 * 從 memory entry 收集所有 ruleId 和 keyValuePairs key
 */
function extractMemoryClaimedKeys(entry) {
  const keys = new Set();
  const { content } = entry;
  if (!content) return keys;

  if (Array.isArray(content.rules)) {
    for (const r of content.rules) {
      if (r.ruleId) keys.add(r.ruleId);
    }
  }
  if (content.keyValuePairs && typeof content.keyValuePairs === 'object') {
    for (const k of Object.keys(content.keyValuePairs)) {
      keys.add(k);
    }
  }
  return keys;
}

// ─── conflict detection ───────────────────────────────────────────────────────

function detectConflicts(memoryEntries) {
  const conflicts = [];

  for (const { filePath, data } of memoryEntries) {
    const entryRank = AUTHORITY_RANK[data.authorityLevel] || 0;
    const rel = path.relative(ROOT, filePath).replace(/\\/g, '/');

    // 1. Authority 越界：project memory 宣告了比自己更高的 authorityLevel
    if (entryRank >= AUTHORITY_RANK['governance-profile']) {
      conflicts.push({
        severity: 'deny',
        type: 'authority-level-violation',
        memoryId: data.id || '(unknown)',
        memoryFile: rel,
        message: `authorityLevel="${data.authorityLevel}" is reserved for governance-profile or higher; project-memory entries must use "project-memory" or "agent-runtime"`,
      });
    }

    // 2. ruleId / key 和受保護能力 ID 衝突
    const claimedKeys = extractMemoryClaimedKeys(data);
    for (const key of claimedKeys) {
      if (GOVERNED_CAPABILITY_IDS.has(key)) {
        const policy = data.overridePolicy || 'warn';
        conflicts.push({
          severity: policy === 'deny' ? 'deny' : policy === 'allow' ? 'info' : 'warn',
          type: 'governed-capability-overlap',
          memoryId: data.id || '(unknown)',
          memoryFile: rel,
          claimedKey: key,
          message: `key/ruleId "${key}" overlaps with a governed capability in governance-profile; ensure this does not redefine behaviour`,
        });
      }
      if (PROTECTED_PROFILE_FIELDS.has(key)) {
        conflicts.push({
          severity: 'deny',
          type: 'protected-field-override',
          memoryId: data.id || '(unknown)',
          memoryFile: rel,
          claimedKey: key,
          message: `key/ruleId "${key}" is a protected governance-profile field and cannot be overridden by project-memory`,
        });
      }
    }

    // 3. 已過期的條目警告
    if (data.expiresAt) {
      const exp = new Date(data.expiresAt);
      if (!isNaN(exp.getTime()) && exp < new Date()) {
        conflicts.push({
          severity: 'warn',
          type: 'expired-entry',
          memoryId: data.id || '(unknown)',
          memoryFile: rel,
          message: `Memory entry expired at ${data.expiresAt}; consider removing or refreshing`,
        });
      }
    }
  }

  return conflicts;
}

// ─── output formatting ────────────────────────────────────────────────────────

function printHumanReport(conflicts, memoryEntries) {
  const denyCount = conflicts.filter((c) => c.severity === 'deny').length;
  const warnCount = conflicts.filter((c) => c.severity === 'warn').length;
  const infoCount = conflicts.filter((c) => c.severity === 'info').length;

  console.log(`\nProject Memory Conflict Finder`);
  console.log(`${'─'.repeat(50)}`);
  console.log(`Scanned memory entries : ${memoryEntries.length}`);
  console.log(`Conflicts found        : ${conflicts.length} (deny=${denyCount} warn=${warnCount} info=${infoCount})`);
  console.log('');

  if (conflicts.length === 0) {
    console.log('✅ No conflicts detected.');
  } else {
    for (const c of conflicts) {
      const icon = c.severity === 'deny' ? '🚫' : c.severity === 'warn' ? '⚠️ ' : 'ℹ️ ';
      console.log(`${icon} [${c.severity.toUpperCase()}] ${c.type}`);
      console.log(`   memory-id : ${c.memoryId}`);
      console.log(`   file      : ${c.memoryFile}`);
      if (c.claimedKey) console.log(`   key       : ${c.claimedKey}`);
      console.log(`   message   : ${c.message}`);
      console.log('');
    }
  }
}

// ─── arg parsing ─────────────────────────────────────────────────────────────

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
    console.log('Usage: node tools_node/conflict-finder.js [--memory-dir <path>] [--strict] [--json]');
    console.log('');
    console.log('Scans project memory entries and detects conflicts with higher-authority documents.');
    console.log('');
    console.log('Options:');
    console.log('  --memory-dir <path>   Directory to scan for project-memory/v1 JSON files');
    console.log('                        (default: <repo-root>/.memories)');
    console.log('  --strict              Exit 2 if any deny-level conflicts are found');
    console.log('  --json                Output machine-readable JSON instead of human report');
    console.log('  --help, -h            Show this help');
    return 0;
  }

  const memoryEntries = loadMemoryEntries(args.memoryDir);
  loadGovernanceProfile(); // side-effect: loads governance files (future: cross-reference)
  const conflicts = detectConflicts(memoryEntries);

  if (args.json) {
    console.log(JSON.stringify({
      memoryDir: path.relative(ROOT, args.memoryDir).replace(/\\/g, '/'),
      scannedCount: memoryEntries.length,
      conflictCount: conflicts.length,
      conflicts,
    }, null, 2));
  } else {
    printHumanReport(conflicts, memoryEntries);
  }

  const hasDeny = conflicts.some((c) => c.severity === 'deny');
  if (args.strict && hasDeny) return 2;
  return 0;
}

if (require.main === module) {
  process.exitCode = run(process.argv.slice(2));
}

module.exports = { run, detectConflicts, loadMemoryEntries, AUTHORITY_RANK };
