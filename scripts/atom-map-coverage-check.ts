const fs = require('fs');
const path = require('path');

const {
  collectTableRows,
  listTaskCardPaths,
  parseFrontmatter,
  parseMode,
  readLines,
  readText,
} = require('./atm-lang-validator-common.ts');

const PLAN_PATH = 'docs/ai_atomic_framework/universal-language-framework/ATM通用語言框架計畫書.md';
const README_PATH = 'docs/ai_atomic_framework/universal-language-framework/tasks/README.md';

function parsePlanTaskRows() {
  const lines = readLines(PLAN_PATH);
  return collectTableRows(
    lines,
    /^\| Task ID \| Map \| Title \| Owned Surface \| Depends On \|$/,
    /^\|\s*ATM-LANG-\d{4}\s*\|/
  ).map((cells) => ({
    taskId: cells[0],
    mapId: cells[1],
    ownedSurface: cells[3],
    dependsOn: cells[4],
  }));
}

function parseReadmeTaskRows() {
  const lines = readLines(README_PATH);
  const rows = collectTableRows(
    lines,
    /^\| Task ID \| 任務 \| Map \| 狀態 \| 依賴 \|$/,
    /^\|\s*ATM-LANG-\d{4}\s*\|/
  );
  return rows.map((cells) => ({
    taskId: cells[0],
    mapId: cells[2],
    status: cells[3],
    dependsOn: cells[4],
  }));
}

function parseRegisteredTableIds() {
  const lines = readLines(PLAN_PATH);
  const rows = collectTableRows(
    lines,
    /^\| Table ID \| 層級 \| 表格名稱 \| 主要用途 \| 最低欄位 \| 產出位置 \| 驗證責任 \|$/,
    /^\|\s*ATM-LANG-TABLE-\d{4}\s*\|/
  );
  return new Set(rows.map((cells) => cells[0]));
}

function parseTaskCards() {
  const result = new Map();
  for (const fullPath of listTaskCardPaths()) {
    const markdown = fs.readFileSync(fullPath, 'utf8');
    const frontmatter = parseFrontmatter(markdown);
    if (!frontmatter.task_id) {
      continue;
    }
    result.set(frontmatter.task_id, {
      path: fullPath,
      taskId: frontmatter.task_id,
      atomicMap: frontmatter.atomic_map || '',
      depends: Array.isArray(frontmatter.depends) ? frontmatter.depends : [],
      atomicTables: Array.isArray(frontmatter.atomic_tables) ? frontmatter.atomic_tables : [],
    });
  }
  return result;
}

function buildOwnedSurfaceConflictReport(planRows) {
  const bySurface = new Map();
  for (const row of planRows) {
    const key = row.ownedSurface.trim();
    bySurface.set(key, [...(bySurface.get(key) || []), row.taskId]);
  }

  const conflicts = [];
  for (const [ownedSurface, taskIds] of bySurface.entries()) {
    if (taskIds.length > 1) {
      conflicts.push({ ownedSurface, taskIds });
    }
  }
  return conflicts;
}

function ensure(condition, message, failures) {
  if (!condition) {
    failures.push(message);
  }
}

function main() {
  const mode = parseMode(process.argv.slice(2));
  if (mode !== 'validate') {
    console.log(`[atom-map-coverage-check] unsupported mode: ${mode}`);
    process.exit(2);
  }

  const failures = [];
  const planRows = parsePlanTaskRows();
  const readmeRows = parseReadmeTaskRows();
  const taskCards = parseTaskCards();
  const registeredTableIds = parseRegisteredTableIds();
  const ownedSurfaceConflicts = buildOwnedSurfaceConflictReport(planRows);

  ensure(planRows.length === 41, `plan task rows must be 41, got ${planRows.length}`, failures);
  ensure(readmeRows.length === 41, `README task rows must be 41, got ${readmeRows.length}`, failures);

  const planById = new Map(planRows.map((row) => [row.taskId, row]));
  const readmeById = new Map(readmeRows.map((row) => [row.taskId, row]));

  for (const [taskId, planRow] of planById.entries()) {
    const readmeRow = readmeById.get(taskId);
    ensure(Boolean(readmeRow), `${taskId} missing in README`, failures);
    if (readmeRow) {
      ensure(readmeRow.mapId === planRow.mapId, `${taskId} map mismatch plan=${planRow.mapId} readme=${readmeRow.mapId}`, failures);
    }

    const card = taskCards.get(taskId);
    ensure(Boolean(card), `${taskId} task card file missing`, failures);
    if (card) {
      ensure(card.atomicMap === planRow.mapId, `${taskId} frontmatter atomic_map mismatch plan=${planRow.mapId} card=${card.atomicMap}`, failures);
      for (const tableId of card.atomicTables) {
        ensure(registeredTableIds.has(tableId), `${taskId} references unregistered table id: ${tableId}`, failures);
      }
    }
  }

  const summary = {
    planPath: path.resolve(path.join(__dirname, '..', PLAN_PATH)),
    readmePath: path.resolve(path.join(__dirname, '..', README_PATH)),
    planTaskCount: planRows.length,
    readmeTaskCount: readmeRows.length,
    taskCardCount: taskCards.size,
    ownedSurfaceConflictCount: ownedSurfaceConflicts.length,
    ownedSurfaceConflicts,
  };

  if (failures.length > 0) {
    console.error('[atom-map-coverage-check] FAIL');
    for (const failure of failures) {
      console.error(`  - ${failure}`);
    }
    console.error(JSON.stringify(summary, null, 2));
    process.exit(1);
  }

  console.log('[atom-map-coverage-check] PASS');
  console.log(JSON.stringify(summary, null, 2));
}

main();

