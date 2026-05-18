#!/usr/bin/env node
'use strict';

/**
 * upgrade-planner.js — TASK-DGB-0010
 *
 * 白話：當你要把 governance profile 從舊版升到新版時，
 * 這個工具幫你列出「升級計畫」：
 *   1. 比較 current 和 target 兩個 profile JSON 的版本差異
 *   2. 找出哪些 capability 被新增、移除、模式改變（版本 drift）
 *   3. 列出每個差異對應的影響檔案（允許你用 --map 自訂）
 *   4. 輸出 dry-run 升級步驟清單（你自己確認後才動）
 *
 * 使用方式：
 *   node tools_node/upgrade-planner.js --current .atm/compatibility-matrix.json --target <new-profile.json> [--dry-run] [--json]
 *
 *   若省略 --target，則只解析 --current 並列出版本資訊。
 *
 * Exit codes: 0 = success / 1 = error
 */

const fs = require('fs');
const path = require('path');
const config = require('./lib/project-config');

const ROOT = config.ROOT;

// ─── 預設能力 → 影響檔案對照表 ──────────────────────────────────────────────────
// 若使用者沒有提供自訂 --map，用這份預設對照
const CAPABILITY_FILE_MAP = {
  documentIdentity:   ['tools_node/doc-id-registry.js', 'tools_node/assign-doc-id.js', 'tools_node/inject-doc-ids.js'],
  documentSharding:   ['tools_node/shard-manager.js', 'tools_node/check-doc-shard-health.js'],
  taskCards:          ['tools_node/task-card-opener.js', 'tools_node/task-lock.js', 'docs/tasks/'],
  scopeLock:          ['tools_node/scope-guard-validator.js', 'tools_node/file-ownership-checker.js', '.task-locks/'],
  contextBudget:      ['tools_node/check-context-budget.js', '.atm/context-budget-policy.json'],
  encodingGuard:      ['tools_node/check-encoding-integrity.js', '.atm/encoding-guard-profile.json'],
  handoff:            ['tools_node/turn-report-generator.js', 'tools_node/schemas/handoff-schema.json'],
  projectMemory:      ['tools_node/conflict-finder.js', 'tools_node/memory-authority-boundary-validator.js', '.memories/'],
};

// ─── semver 比較 ──────────────────────────────────────────────────────────────

function parseSemver(v) {
  const m = String(v || '0.0.0').match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return [0, 0, 0];
  return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
}

function semverCompare(a, b) {
  const [ma, mi, pa] = parseSemver(a);
  const [mb, mi2, pb] = parseSemver(b);
  if (ma !== mb) return ma - mb;
  if (mi !== mi2) return mi - mi2;
  return pa - pb;
}

function semverBump(a, b) {
  const diff = semverCompare(b, a);
  if (diff === 0) return 'none';
  const [ma, mi] = parseSemver(a);
  const [mb, mi2] = parseSemver(b);
  if (mb > ma) return 'major';
  if (mi2 > mi) return 'minor';
  return 'patch';
}

// ─── profile loader ───────────────────────────────────────────────────────────

function loadProfile(filePath) {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(ROOT, filePath);
  if (!fs.existsSync(abs)) throw new Error(`Profile not found: ${abs}`);
  try {
    return JSON.parse(fs.readFileSync(abs, 'utf8'));
  } catch (err) {
    throw new Error(`Failed to parse profile JSON at ${abs}: ${err.message}`);
  }
}

// ─── diff logic ───────────────────────────────────────────────────────────────

function diffProfiles(current, target) {
  const diffs = [];

  // 1. profileVersion drift
  const verBump = semverBump(current.profileVersion || '0.0.0', target.profileVersion || '0.0.0');
  if (verBump !== 'none') {
    diffs.push({
      type: 'profile-version',
      field: 'profileVersion',
      from: current.profileVersion,
      to: target.profileVersion,
      bumpType: verBump,
      affectedFiles: [],
      step: `Update profileVersion from ${current.profileVersion} to ${target.profileVersion}`,
    });
  }

  // 2. releaseTrain drift
  for (const key of ['frameworkVersion', 'atmChartVersion', 'minimumFrameworkVersion']) {
    const fromVal = current.releaseTrain?.[key];
    const toVal = target.releaseTrain?.[key];
    if (fromVal !== toVal) {
      diffs.push({
        type: 'release-train',
        field: `releaseTrain.${key}`,
        from: fromVal,
        to: toVal,
        bumpType: semverBump(fromVal || '0.0.0', toVal || '0.0.0'),
        affectedFiles: [],
        step: `Update releaseTrain.${key} from ${fromVal} to ${toVal}`,
      });
    }
  }

  // 3. capability drift
  const allCapabilities = new Set([
    ...Object.keys(current.capabilities || {}),
    ...Object.keys(target.capabilities || {}),
  ]);

  for (const cap of allCapabilities) {
    const fromCap = current.capabilities?.[cap];
    const toCap = target.capabilities?.[cap];

    if (!fromCap && toCap) {
      diffs.push({
        type: 'capability-added',
        capability: cap,
        from: null,
        to: toCap,
        affectedFiles: CAPABILITY_FILE_MAP[cap] || [],
        step: `Add capability "${cap}" (enabled=${toCap.enabled}, mode=${toCap.mode}, version=${toCap.version})`,
      });
      continue;
    }

    if (fromCap && !toCap) {
      diffs.push({
        type: 'capability-removed',
        capability: cap,
        from: fromCap,
        to: null,
        affectedFiles: CAPABILITY_FILE_MAP[cap] || [],
        step: `Remove capability "${cap}" — audit ${(CAPABILITY_FILE_MAP[cap] || []).join(', ')} for cleanup`,
      });
      continue;
    }

    if (fromCap && toCap) {
      const changes = [];
      if (fromCap.enabled !== toCap.enabled) changes.push({ key: 'enabled', from: fromCap.enabled, to: toCap.enabled });
      if (fromCap.mode !== toCap.mode) changes.push({ key: 'mode', from: fromCap.mode, to: toCap.mode });
      if (fromCap.version !== toCap.version) changes.push({ key: 'version', from: fromCap.version, to: toCap.version });

      if (changes.length > 0) {
        const stepParts = changes.map((c) => `${c.key}: ${c.from} → ${c.to}`).join(', ');
        diffs.push({
          type: 'capability-changed',
          capability: cap,
          changes,
          affectedFiles: CAPABILITY_FILE_MAP[cap] || [],
          step: `Update capability "${cap}": ${stepParts}`,
        });
      }
    }
  }

  // 4. migration strategy
  if (current.migration?.strategy !== target.migration?.strategy) {
    diffs.push({
      type: 'migration-strategy',
      field: 'migration.strategy',
      from: current.migration?.strategy,
      to: target.migration?.strategy,
      affectedFiles: [],
      step: `Update migration strategy from "${current.migration?.strategy}" to "${target.migration?.strategy}"`,
    });
  }

  return diffs;
}

// ─── output ───────────────────────────────────────────────────────────────────

function printHumanPlan(current, target, diffs) {
  const fromVer = current.profileVersion || '(unknown)';
  const toVer = target ? (target.profileVersion || '(unknown)') : '(no target)';

  console.log('\nGovernance Profile Upgrade Planner');
  console.log('─'.repeat(50));
  console.log(`Current : ${current.profileId || '(unknown)'} v${fromVer}`);
  if (target) console.log(`Target  : ${target.profileId || '(unknown)'} v${toVer}`);
  console.log(`Changes : ${diffs.length}`);
  console.log('');

  if (diffs.length === 0) {
    console.log('✅ Current and target profiles are identical. No upgrade needed.');
    return;
  }

  let stepNum = 1;
  for (const d of diffs) {
    const icon = d.type.includes('removed') ? '➖' : d.type.includes('added') ? '➕' : '🔄';
    console.log(`Step ${stepNum}: ${icon} ${d.step}`);
    if (d.affectedFiles && d.affectedFiles.length > 0) {
      console.log(`          Affected files:`);
      for (const f of d.affectedFiles) console.log(`            - ${f}`);
    }
    console.log('');
    stepNum += 1;
  }

  // 自動生成 rollback hint
  console.log('─'.repeat(50));
  console.log('Rollback hint:');
  console.log('  node tools_node/backup-validator.js --profile .atm/compatibility-matrix.json');
  console.log('  # 確認備份後再套用升級；如需回滾，執行以下指令：');
  const rollbackCmd = current.migration?.rollbackCommand || '# (no rollbackCommand in current profile)';
  console.log(`  ${rollbackCmd}`);
}

// ─── args ─────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const parsed = {
    current: path.join(ROOT, '.atm', 'compatibility-matrix.json'),
    target: '',
    dryRun: false,
    json: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const tok = argv[i];
    if (tok === '--current') { parsed.current = argv[i + 1] || ''; i += 1; }
    else if (tok === '--target') { parsed.target = argv[i + 1] || ''; i += 1; }
    else if (tok === '--dry-run') { parsed.dryRun = true; }
    else if (tok === '--json') { parsed.json = true; }
    else if (tok === '--help' || tok === '-h') { parsed.help = true; }
  }
  return parsed;
}

// ─── main ─────────────────────────────────────────────────────────────────────

function run(argv) {
  const args = parseArgs(argv);

  if (args.help) {
    console.log('Usage: node tools_node/upgrade-planner.js [options]');
    console.log('');
    console.log('Plans governance profile upgrades by diffing current vs target profiles.');
    console.log('');
    console.log('Options:');
    console.log('  --current <path>   Path to current profile JSON (default: .atm/compatibility-matrix.json)');
    console.log('  --target <path>    Path to target profile JSON (required for diff)');
    console.log('  --dry-run          Alias for listing plan without applying changes (default mode)');
    console.log('  --json             Output machine-readable JSON');
    console.log('  --help, -h         Show this help');
    console.log('');
    console.log('Examples:');
    console.log('  node tools_node/upgrade-planner.js --current .atm/compatibility-matrix.json --target .atm/candidate-v0.2.json');
    return 0;
  }

  let current;
  try {
    current = loadProfile(args.current);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    return 1;
  }

  let target = null;
  if (args.target) {
    try {
      target = loadProfile(args.target);
    } catch (err) {
      console.error(`Error: ${err.message}`);
      return 1;
    }
  }

  const diffs = target ? diffProfiles(current, target) : [];

  if (args.json) {
    console.log(JSON.stringify({
      current: {
        profileId: current.profileId,
        profileVersion: current.profileVersion,
        path: args.current,
      },
      target: target ? {
        profileId: target.profileId,
        profileVersion: target.profileVersion,
        path: args.target,
      } : null,
      diffCount: diffs.length,
      diffs,
    }, null, 2));
  } else {
    printHumanPlan(current, target, diffs);
  }

  return 0;
}

if (require.main === module) {
  process.exitCode = run(process.argv.slice(2));
}

module.exports = { run, diffProfiles, semverBump, parseSemver };
