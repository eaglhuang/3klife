#!/usr/bin/env node

'use strict';

// TASK-MEM-0002 — memory-manager 最小回歸。
// 覆蓋：壞 frontmatter 紅、合法目錄綠、rebuild-index 冪等、stale-report 分類。

const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const TOOL = path.join(ROOT, 'tools_node', 'memory-manager.js');

function fail(message) {
  console.error(`[memory-manager.test] ${message}`);
  process.exitCode = 1;
  throw new Error(message);
}

function assert(cond, message) { if (!cond) fail(message); }

function run(args) {
  return cp.spawnSync(process.execPath, [TOOL, ...args], { cwd: ROOT, encoding: 'utf8' });
}

function writeMemory(dir, file, front) {
  const body = ['---', ...Object.entries(front).map(([k, v]) => `${k}: ${v}`), '---', '', '# body', ''].join('\n');
  fs.writeFileSync(path.join(dir, file), body, 'utf8');
}

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'keep-memory-test-'));
// 測試目錄必須在 ROOT 之下 rebuild-index 才能算相對路徑 → 用真實 keep-memory 做唯讀驗證，
// 壞夾具用 temp 目錄（validate / stale-report 不依賴 ROOT 相對性）。
try {
  // 1. 合法檔 → validate 綠
  writeMemory(temp, 'gotcha_good.md', {
    name: 'gotcha-good', description: 'ok', type: 'gotcha',
    updated: '2026-07-13', repo: '3KLife', status: 'active'
  });
  assert(run(['validate', temp]).status === 0, 'valid dir must pass validate');

  // 2. 壞 frontmatter → validate 紅（缺欄位 + 非法 type + 相對日期）
  writeMemory(temp, 'gotcha_bad.md', { name: 'gotcha-bad', type: 'vibes', updated: 'last week' });
  const bad = run(['validate', temp]);
  assert(bad.status !== 0, 'bad frontmatter must fail validate');
  assert(/missing frontmatter field 'description'/.test(bad.stderr), 'must name the missing field');
  assert(/type 'vibes' not in/.test(bad.stderr), 'must reject unknown type');
  assert(/must be an absolute YYYY-MM-DD date/.test(bad.stderr), 'must reject relative dates');
  fs.unlinkSync(path.join(temp, 'gotcha_bad.md'));

  // 3. 重複 name → 紅
  writeMemory(temp, 'gotcha_dupe.md', {
    name: 'gotcha-good', description: 'dupe', type: 'gotcha',
    updated: '2026-07-13', repo: '3KLife', status: 'active'
  });
  assert(/duplicate name/.test(run(['validate', temp]).stderr), 'duplicate name must fail');
  fs.unlinkSync(path.join(temp, 'gotcha_dupe.md'));

  // 4. stale-report：造假今天日期 → status 型 31 天紅、gotcha 型 31 天綠
  writeMemory(temp, 'status_old.md', {
    name: 'status-old', description: 'old snapshot', type: 'status',
    updated: '2026-07-13', repo: '3KLife', status: 'active'
  });
  const staleOut = run(['stale-report', temp, '--today', '2026-08-14']).stdout;
  assert(/status-old \(status\) is 32d old/.test(staleOut), 'status memory over 30d must be flagged');
  assert(!/gotcha-good/.test(staleOut), 'gotcha under 180d must not be flagged');

  // 5. rebuild-index 對真實 keep-memory 目錄冪等（跑兩次第二次 up-to-date、summary 無殘 diff）
  const before = fs.readFileSync(path.join(ROOT, 'docs', 'keep.summary.md'), 'utf8');
  assert(run(['rebuild-index', 'docs/keep-memory']).status === 0, 'rebuild-index must succeed');
  const second = run(['rebuild-index', 'docs/keep-memory']);
  assert(second.status === 0 && /already up to date/.test(second.stdout), 'second rebuild must be a no-op');
  const after = fs.readFileSync(path.join(ROOT, 'docs', 'keep.summary.md'), 'utf8');
  assert(before.replace(/\r\n/g, '\n').includes('<!-- keep-memory-index:start -->'), 'summary must contain index markers');
  assert(after.indexOf('<!-- keep-memory-index:start -->') === after.lastIndexOf('<!-- keep-memory-index:start -->'), 'markers must stay unique');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

// TASK-MEM-0006 — patrol 聚合：stale 分類 + orphan 判紅（budget 對真實目錄應在預算內）
{
  const temp2 = fs.mkdtempSync(path.join(os.tmpdir(), 'keep-memory-patrol-'));
  try {
    writeMemory(temp2, 'status_old.md', {
      name: 'status-old', description: 'old', type: 'status',
      updated: '2026-06-01', repo: '3KLife', status: 'active'
    });
    const patrol = run(['patrol', temp2, '--today', '2026-07-15']).stdout;
    assert(/stale: status-old \(status\) 44d > 30d/.test(patrol), 'patrol must flag stale status memory with age');
    assert(/point-in-time observation/.test(patrol), 'patrol must carry the verify-before-asserting hint');
    assert(/orphan: active memory 'status-old' missing from summary index/.test(patrol), 'patrol must flag unindexed active memory');
    assert(/advisory only, nothing blocked/.test(patrol), 'patrol must state advisory-only');
  } finally {
    fs.rmSync(temp2, { recursive: true, force: true });
  }
  const real = run(['patrol', 'docs/keep-memory']);
  assert(real.status === 0, 'patrol on real dir must exit 0 (advisory only)');
}

console.log('[memory-manager.test] ok (validate red/green, duplicate, stale classification, rebuild idempotent, patrol aggregate)');
