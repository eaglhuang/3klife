#!/usr/bin/env node

'use strict';

// TASK-MEM-0002 — keep-memory 記憶筆記層管理工具。
// 獨立於 shard-manager.js（extraction-first：新能力開新原子）。
// 子命令：validate | rebuild-index | stale-report | patrol(TASK-MEM-0006 保留位)

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SUMMARY_PATH = path.join(ROOT, 'docs', 'keep.summary.md');
const INDEX_START = '<!-- keep-memory-index:start -->';
const INDEX_END = '<!-- keep-memory-index:end -->';
const TYPES = ['gotcha', 'feedback', 'status', 'reference'];
const STATUSES = ['active', 'superseded', 'retired'];
const STALE_DAYS = { status: 30, gotcha: 180, feedback: 180, reference: 180 };
const INDEX_BUDGET_LINES = 30;

function fail(message) {
  console.error(`[memory-manager] ${message}`);
  process.exitCode = 1;
}

function parseFrontmatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!match) return null;
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const m = /^([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*(.*)$/.exec(line);
    if (m) data[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
  }
  return data;
}

function listMemoryFiles(dir) {
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.md') && f.toLowerCase() !== 'readme.md')
    .sort()
    .map((f) => path.join(dir, f));
}

function validateFile(filePath, seenNames) {
  const problems = [];
  const front = parseFrontmatter(fs.readFileSync(filePath, 'utf8'));
  if (!front) return [`${path.basename(filePath)}: missing frontmatter block`];
  for (const field of ['name', 'description', 'type', 'updated', 'repo', 'status']) {
    if (!front[field]) problems.push(`${path.basename(filePath)}: missing frontmatter field '${field}'`);
  }
  if (front.type && !TYPES.includes(front.type)) {
    problems.push(`${path.basename(filePath)}: type '${front.type}' not in ${TYPES.join('|')}`);
  }
  if (front.status && !STATUSES.includes(front.status)) {
    problems.push(`${path.basename(filePath)}: status '${front.status}' not in ${STATUSES.join('|')}`);
  }
  if (front.updated && !/^\d{4}-\d{2}-\d{2}$/.test(front.updated)) {
    problems.push(`${path.basename(filePath)}: updated '${front.updated}' must be an absolute YYYY-MM-DD date`);
  }
  if (front.name) {
    if (seenNames.has(front.name)) problems.push(`${path.basename(filePath)}: duplicate name '${front.name}'`);
    seenNames.set(front.name, filePath);
  }
  return problems;
}

function runValidate(dir) {
  const seenNames = new Map();
  let problems = [];
  for (const file of listMemoryFiles(dir)) problems = problems.concat(validateFile(file, seenNames));
  if (problems.length > 0) {
    for (const p of problems) console.error(`[memory-manager:validate] ${p}`);
    fail(`${problems.length} contract violation(s) in ${path.relative(ROOT, dir)}`);
    return;
  }
  console.log(`[memory-manager:validate] ok (${listMemoryFiles(dir).length} memory file(s) pass the contract)`);
}

function buildIndexLines(dir) {
  const lines = [];
  for (const file of listMemoryFiles(dir)) {
    const front = parseFrontmatter(fs.readFileSync(file, 'utf8')) || {};
    if (front.status !== 'active') continue;
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    lines.push(`- [${front.name}](${rel}) — ${front.description}`);
  }
  return lines;
}

function runRebuildIndex(dir) {
  const summary = fs.readFileSync(SUMMARY_PATH, 'utf8');
  const start = summary.indexOf(INDEX_START);
  const end = summary.indexOf(INDEX_END);
  if (start < 0 || end < 0 || end < start) {
    fail(`summary index markers not found in ${path.relative(ROOT, SUMMARY_PATH)}`);
    return;
  }
  const lines = buildIndexLines(dir);
  const next = summary.slice(0, start + INDEX_START.length) + '\n' + lines.join('\n') + '\n' + summary.slice(end);
  if (next === summary) {
    console.log('[memory-manager:rebuild-index] ok (index already up to date)');
    return;
  }
  fs.writeFileSync(SUMMARY_PATH, next, 'utf8');
  console.log(`[memory-manager:rebuild-index] ok (${lines.length} entr${lines.length === 1 ? 'y' : 'ies'} written)`);
}

function runStaleReport(dir, today) {
  const now = today ? new Date(today) : new Date();
  const stale = [];
  for (const file of listMemoryFiles(dir)) {
    const front = parseFrontmatter(fs.readFileSync(file, 'utf8')) || {};
    if (front.status !== 'active' || !front.updated) continue;
    const ageDays = Math.floor((now - new Date(front.updated)) / 86400000);
    const threshold = STALE_DAYS[front.type] || 180;
    if (ageDays > threshold) stale.push({ name: front.name, type: front.type, ageDays, threshold });
  }
  if (stale.length === 0) {
    console.log('[memory-manager:stale-report] ok (no stale active memories)');
    return;
  }
  for (const s of stale) {
    console.log(`[memory-manager:stale-report] ${s.name} (${s.type}) is ${s.ageDays}d old (threshold ${s.threshold}d) — point-in-time observation, verify before asserting; consolidation candidate`);
  }
  console.log(`[memory-manager:stale-report] ${stale.length} consolidation candidate(s); advisory only`);
}

// TASK-MEM-0006 — patrol：stale / budget / orphan 三面聚合報告（advisory，不改檔、不擋流程）。
function collectStale(dir, today) {
  const now = today ? new Date(today) : new Date();
  const stale = [];
  for (const file of listMemoryFiles(dir)) {
    const front = parseFrontmatter(fs.readFileSync(file, 'utf8')) || {};
    if (front.status !== 'active' || !front.updated) continue;
    const ageDays = Math.floor((now - new Date(front.updated)) / 86400000);
    const threshold = STALE_DAYS[front.type] || 180;
    if (ageDays > threshold) stale.push({ name: front.name, type: front.type, ageDays, threshold });
  }
  return stale;
}

function readIndexSection() {
  const summary = fs.readFileSync(SUMMARY_PATH, 'utf8');
  const start = summary.indexOf(INDEX_START);
  const end = summary.indexOf(INDEX_END);
  if (start < 0 || end < 0 || end < start) return null;
  return summary.slice(start + INDEX_START.length, end).split(/\r?\n/).filter((l) => l.trim().startsWith('- ['));
}

function runPatrol(dir, today) {
  let advisories = 0;
  // 1. stale
  const stale = collectStale(dir, today);
  for (const s of stale) {
    console.log(`[memory-manager:patrol] stale: ${s.name} (${s.type}) ${s.ageDays}d > ${s.threshold}d — point-in-time observation, verify before asserting; consolidation candidate`);
  }
  advisories += stale.length;
  // 2. budget
  const indexLines = readIndexSection();
  if (indexLines === null) {
    console.log('[memory-manager:patrol] budget: summary index markers missing — run rebuild-index setup first');
    advisories += 1;
  } else if (indexLines.length > INDEX_BUDGET_LINES) {
    console.log(`[memory-manager:patrol] budget: index has ${indexLines.length} entries > ${INDEX_BUDGET_LINES} budget — run the atm-memory-consolidate skill`);
    advisories += 1;
  }
  // 3. orphan（雙向：檔案無索引行 / 索引行無檔案）
  const activeNames = new Set();
  for (const file of listMemoryFiles(dir)) {
    const front = parseFrontmatter(fs.readFileSync(file, 'utf8')) || {};
    if (front.status === 'active' && front.name) activeNames.add(front.name);
  }
  const indexedNames = new Set((indexLines || []).map((l) => (/^\s*-\s*\[([^\]]+)\]/.exec(l) || [])[1]).filter(Boolean));
  for (const name of activeNames) {
    if (!indexedNames.has(name)) { console.log(`[memory-manager:patrol] orphan: active memory '${name}' missing from summary index — run rebuild-index`); advisories += 1; }
  }
  for (const name of indexedNames) {
    if (!activeNames.has(name)) { console.log(`[memory-manager:patrol] orphan: index entry '${name}' has no active memory file — run rebuild-index`); advisories += 1; }
  }
  console.log(`[memory-manager:patrol] done (${advisories} advisory finding(s); advisory only, nothing blocked)`);
}

function main() {
  const [action, dirArg] = process.argv.slice(2);
  const todayFlag = process.argv.indexOf('--today');
  const today = todayFlag > 0 ? process.argv[todayFlag + 1] : null;
  if (!action || !dirArg) {
    console.error('Usage: node tools_node/memory-manager.js <validate|rebuild-index|stale-report|patrol> <dir> [--today YYYY-MM-DD]');
    process.exitCode = 2;
    return;
  }
  const dir = path.resolve(ROOT, dirArg);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    fail(`directory not found: ${dirArg}`);
    return;
  }
  if (action === 'validate') return runValidate(dir);
  if (action === 'rebuild-index') return runRebuildIndex(dir);
  if (action === 'stale-report') return runStaleReport(dir, today);
  if (action === 'patrol') return runPatrol(dir, today);
  console.error(`[memory-manager] unknown action '${action}'`);
  process.exitCode = 2;
}

main();

module.exports = { parseFrontmatter, buildIndexLines, INDEX_BUDGET_LINES, STALE_DAYS };
