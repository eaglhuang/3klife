#!/usr/bin/env node
// audit-generals-report.js
// GDP-08 / PROG-2-0805：武將資料人工審核清單（唯讀報告）
// @spec-source → WBS v8 GDP-08：極值武將、tier 分布、亂碼截斷、重複 id、關鍵 25 位 lore
//
// 用法：node tools_node/audit-generals-report.js [--dir <path>] [--strict]
//   - 預設讀 assets/resources/data/master/（generals-base / generals-lore / generals-stories）
//   - 只印出 Markdown 報告，不寫檔；--strict 有發現時 exit 1

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_DIR = path.join(ROOT, 'assets', 'resources', 'data', 'master');
const STAT_FIELDS = ['str', 'int', 'lea', 'pol', 'cha', 'luk'];
/** 暫定（PROG-2-0805）：關鍵 25 位 = ep 最高的 25 位 */
const KEY_GENERAL_COUNT = 25;
const TOP_COUNT = 10;
const TERMINAL_PUNCTUATION = /[。！？…」』”"）)》!?.]$/;
const GARBLED_PATTERN = /\uFFFD|[\u0000-\u0008\u000B\u000C\u000E-\u001F]|\?{3,}/;
const STORY_CELL_COUNT = 6;

function listDuplicates(ids) {
  const seen = new Map();
  for (const id of ids) seen.set(id, (seen.get(id) || 0) + 1);
  return [...seen.entries()].filter(([, n]) => n > 1).map(([id, n]) => ({ id, count: n }));
}

function countBy(items, key) {
  const out = {};
  for (const item of items) {
    const value = item[key] === undefined || item[key] === null || item[key] === '' ? '(缺)' : String(item[key]);
    out[value] = (out[value] || 0) + 1;
  }
  return out;
}

/** 只回傳命中的亂碼欄位名稱（不含內容，避免報告過長） */
function garbledFieldsOf(record, fields) {
  return fields.filter((field) => {
    const value = record[field];
    return typeof value === 'string' && GARBLED_PATTERN.test(value);
  });
}

function isTruncated(text) {
  const trimmed = String(text || '').trim();
  return trimmed.length > 0 && !TERMINAL_PUNCTUATION.test(trimmed);
}

/**
 * 組審核報告（純函式，不讀檔）。
 * @param {{ base: object[], lore?: object[], stories?: object[], keyCount?: number }} input
 */
function buildAuditReport({ base, lore = [], stories = [], keyCount = KEY_GENERAL_COUNT }) {
  const loreById = new Map(lore.map((row) => [row.id, row]));
  const storiesById = new Map(stories.map((row) => [row.id, row]));

  const topByEp = [...base]
    .sort((a, b) => (Number(b.ep) || 0) - (Number(a.ep) || 0))
    .slice(0, TOP_COUNT)
    .map((g) => ({ id: g.id, name: g.name, ep: g.ep, rarityTier: g.rarityTier || '(缺)' }));

  const statMax = {};
  for (const field of STAT_FIELDS) {
    const best = base.reduce((acc, g) => (Number(g[field]) > (acc ? Number(acc.value) : -Infinity) ? { id: g.id, name: g.name, value: g[field] } : acc), null);
    statMax[field] = best;
  }

  const duplicateIds = {
    base: listDuplicates(base.map((g) => g.id)),
    lore: listDuplicates(lore.map((g) => g.id)),
    stories: listDuplicates(stories.map((g) => g.id)),
  };

  const garbled = [];
  const truncated = [];
  for (const g of base) {
    const fields = garbledFieldsOf(g, ['name', 'title', 'awakeningTitle']);
    if (fields.length) garbled.push({ id: g.id, source: 'base', fields });
  }
  for (const row of lore) {
    const fields = garbledFieldsOf(row, ['historicalAnecdote', 'bloodlineRumor']);
    if (fields.length) garbled.push({ id: row.id, source: 'lore', fields });
    for (const field of ['historicalAnecdote', 'bloodlineRumor']) {
      if (isTruncated(row[field])) truncated.push({ id: row.id, field });
    }
  }

  const keyGenerals = [...base].sort((a, b) => (Number(b.ep) || 0) - (Number(a.ep) || 0)).slice(0, Math.max(0, keyCount));
  const keyGaps = [];
  for (const g of keyGenerals) {
    const row = loreById.get(g.id);
    const story = storiesById.get(g.id) || row;
    const problems = [];
    if (!row) problems.push('缺 lore');
    else {
      if (!row.historicalAnecdote) problems.push('缺 historicalAnecdote');
      if (!row.bloodlineRumor) problems.push('缺 bloodlineRumor');
    }
    const cells = story && Array.isArray(story.storyStripCells) ? story.storyStripCells : null;
    if (!cells || cells.length !== STORY_CELL_COUNT) problems.push(`storyStripCells 非 ${STORY_CELL_COUNT} 格`);
    if (problems.length) keyGaps.push({ id: g.id, name: g.name, problems });
  }

  return {
    summary: {
      baseCount: base.length,
      loreCount: lore.length,
      storiesCount: stories.length,
      keyCount: keyGenerals.length,
    },
    topByEp,
    statMax,
    rarityTierDistribution: countBy(base, 'rarityTier'),
    categoryDistribution: countBy(base, 'characterCategory'),
    duplicateIds,
    garbled,
    truncated,
    keyGaps,
  };
}

/** 報告有任何需人工看的項目時為 true（--strict 用） */
function auditHasFindings(report) {
  return report.duplicateIds.base.length + report.duplicateIds.lore.length + report.duplicateIds.stories.length > 0
    || report.garbled.length > 0
    || report.truncated.length > 0
    || report.keyGaps.length > 0;
}

function distributionRows(dist) {
  return Object.entries(dist).sort((a, b) => b[1] - a[1]).map(([k, v]) => `| ${k} | ${v} |`);
}

/** 報告轉 Markdown（純函式） */
function formatAuditMarkdown(report) {
  const lines = [];
  const s = report.summary;
  lines.push('# 武將資料人工審核清單（GDP-08）', '');
  lines.push(`- 武將 base：${s.baseCount} 筆；lore：${s.loreCount} 筆；stories：${s.storiesCount} 筆`);
  lines.push(`- 關鍵 ${s.keyCount} 位（暫定：ep 最高者）`, '');

  lines.push(`## Top ${TOP_COUNT}（依 ep）`, '', '| # | id | 名稱 | ep | rarityTier |', '| --- | --- | --- | --- | --- |');
  report.topByEp.forEach((g, i) => lines.push(`| ${i + 1} | ${g.id} | ${g.name} | ${g.ep} | ${g.rarityTier} |`));
  lines.push('');

  lines.push('## 各屬性最大值', '', '| 屬性 | 武將 | 數值 |', '| --- | --- | --- |');
  for (const field of STAT_FIELDS) {
    const best = report.statMax[field];
    lines.push(best ? `| ${field} | ${best.name}（${best.id}） | ${best.value} |` : `| ${field} | (無) | - |`);
  }
  lines.push('');

  lines.push('## rarityTier 分布', '', '| tier | 筆數 |', '| --- | --- |', ...distributionRows(report.rarityTierDistribution), '');
  lines.push('## characterCategory 分布', '', '| category | 筆數 |', '| --- | --- |', ...distributionRows(report.categoryDistribution), '');

  const dupTotal = report.duplicateIds.base.length + report.duplicateIds.lore.length + report.duplicateIds.stories.length;
  lines.push(`## 重複 id（${dupTotal} 組）`);
  for (const source of ['base', 'lore', 'stories']) {
    for (const d of report.duplicateIds[source]) lines.push(`- [${source}] ${d.id} × ${d.count}`);
  }
  lines.push('');

  lines.push(`## 疑似亂碼（${report.garbled.length} 筆）`);
  for (const g of report.garbled) lines.push(`- [${g.source}] ${g.id}：${g.fields.join(', ')}`);
  lines.push('');

  lines.push(`## 疑似截斷（${report.truncated.length} 筆）`);
  for (const t of report.truncated) lines.push(`- ${t.id}：${t.field}`);
  lines.push('');

  lines.push(`## 關鍵 ${s.keyCount} 位 lore 缺漏（${report.keyGaps.length} 位）`);
  for (const k of report.keyGaps) lines.push(`- ${k.id}（${k.name}）：${k.problems.join('；')}`);
  lines.push('');

  return lines.join('\n');
}

function readMasterFile(dir, name, dataKey = 'data') {
  const file = path.join(dir, `${name}.json`);
  if (!fs.existsSync(file)) return [];
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  return Array.isArray(parsed[dataKey]) ? parsed[dataKey] : [];
}

function loadMaster(dir) {
  return {
    base: readMasterFile(dir, 'generals-base'),
    lore: readMasterFile(dir, 'generals-lore'),
    stories: readMasterFile(dir, 'generals-stories'),
  };
}

function main(argv) {
  let dir = DEFAULT_DIR;
  let strict = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dir' && argv[i + 1]) dir = path.resolve(argv[++i]);
    else if (argv[i] === '--strict') strict = true;
    else if (argv[i] === '--help') {
      console.log('Usage: node tools_node/audit-generals-report.js [--dir <path>] [--strict]');
      return 0;
    }
  }
  const report = buildAuditReport(loadMaster(dir));
  process.stdout.write(formatAuditMarkdown(report));
  return strict && auditHasFindings(report) ? 1 : 0;
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}

module.exports = {
  buildAuditReport,
  formatAuditMarkdown,
  auditHasFindings,
  isTruncated,
  garbledFieldsOf,
  KEY_GENERAL_COUNT,
  TOP_COUNT,
};
