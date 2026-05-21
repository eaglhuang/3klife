const fs = require('fs');
const path = require('path');

const {
  collectBulletLines,
  collectTableRows,
  listTaskCardPaths,
  parseFrontmatter,
  parseMode,
  readLines,
} = require('./atm-lang-validator-common.ts');

const PLAN_PATH = 'docs/ai_atomic_framework/universal-language-framework/ATM通用語言框架計畫書.md';
const README_PATH = 'docs/ai_atomic_framework/universal-language-framework/tasks/README.md';

const EXPECTED_REQUIREMENTS = [
  'scanSourceInventory',
  'buildLegacyRoutePlan',
  'planAtomizeDryRun',
  'planInfectDryRun',
  'buildAtomicMapDecomposition',
  'computeEquivalenceContract',
  'detectRuntimeCommands',
  'normalizeSymbolId',
  'parseDiagnostics',
  'capabilities',
];

function parsePlanTaskRows() {
  const lines = readLines(PLAN_PATH);
  return collectTableRows(
    lines,
    /^\| Task ID \| Map \| Title \| Owned Surface \| Depends On \|$/,
    /^\|\s*ATM-LANG-\d{4}\s*\|/
  ).map((cells) => ({
    taskId: cells[0],
    mapId: cells[1],
    title: cells[2],
    ownedSurface: cells[3],
    dependsOn: cells[4],
  }));
}

function parseReadmeTaskRows() {
  const lines = readLines(README_PATH);
  const allRows = collectTableRows(
    lines,
    /^\| Task ID \| 任務 \| Map \| 狀態 \| 依賴 \|$/,
    /^\|\s*ATM-LANG-\d{4}\s*\|/
  );
  return allRows.map((cells) => ({
    taskId: cells[0],
    title: cells[1],
    mapId: cells[2],
    status: cells[3],
    dependsOn: cells[4],
  }));
}

function parseRequirementCoverageRows() {
  const lines = readLines(PLAN_PATH);
  return collectTableRows(
    lines,
    /^\| Original Requirement \| Covered By \|$/,
    /^\|\s*`[^`]+`\s*\|/
  ).map((cells) => ({
    requirement: cells[0].replace(/`/g, ''),
    coveredBy: cells[1],
  }));
}

function parseOldThemeBullets() {
  const lines = readLines(PLAN_PATH);
  return collectBulletLines(lines, '### 8.2 Previous 82-card theme coverage', '### ');
}

function parseTaskCardIds() {
  const ids = [];
  for (const fullPath of listTaskCardPaths()) {
    const markdown = fs.readFileSync(fullPath, 'utf8');
    const frontmatter = parseFrontmatter(markdown);
    if (frontmatter.task_id) {
      ids.push(frontmatter.task_id);
    }
  }
  return ids;
}

function ensure(condition, message, failures) {
  if (!condition) {
    failures.push(message);
  }
}

function main() {
  const mode = parseMode(process.argv.slice(2));
  if (mode !== 'validate') {
    console.log(`[roadmap-traceability-check] unsupported mode: ${mode}`);
    process.exit(2);
  }

  const failures = [];
  const planRows = parsePlanTaskRows();
  const readmeRows = parseReadmeTaskRows();
  const requirementRows = parseRequirementCoverageRows();
  const themeBullets = parseOldThemeBullets();
  const taskCardIds = new Set(parseTaskCardIds());

  ensure(planRows.length === 41, `plan task rows must be 41, got ${planRows.length}`, failures);
  ensure(readmeRows.length === 41, `README task rows must be 41, got ${readmeRows.length}`, failures);

  const readmeTaskIds = new Set(readmeRows.map((row) => row.taskId));
  for (const row of planRows) {
    ensure(Boolean(row.mapId), `${row.taskId} missing map id in plan table`, failures);
    ensure(Boolean(row.ownedSurface), `${row.taskId} missing owned surface in plan table`, failures);
    ensure(Boolean(row.dependsOn), `${row.taskId} missing depends column in plan table`, failures);
    ensure(readmeTaskIds.has(row.taskId), `${row.taskId} missing in tasks/README index`, failures);
    ensure(taskCardIds.has(row.taskId), `${row.taskId} task card file missing`, failures);
  }

  ensure(requirementRows.length === 10, `requirement coverage rows must be 10, got ${requirementRows.length}`, failures);
  const gotRequirements = new Set(requirementRows.map((row) => row.requirement));
  for (const requirement of EXPECTED_REQUIREMENTS) {
    ensure(gotRequirements.has(requirement), `requirement coverage missing: ${requirement}`, failures);
  }

  ensure(themeBullets.length >= 8, `previous 82-card theme bullets must be >= 8, got ${themeBullets.length}`, failures);

  const summary = {
    planPath: path.resolve(path.join(__dirname, '..', PLAN_PATH)),
    readmePath: path.resolve(path.join(__dirname, '..', README_PATH)),
    planTaskCount: planRows.length,
    readmeTaskCount: readmeRows.length,
    requirementCoverageCount: requirementRows.length,
    previousThemeBulletCount: themeBullets.length,
  };

  if (failures.length > 0) {
    console.error('[roadmap-traceability-check] FAIL');
    for (const failure of failures) {
      console.error(`  - ${failure}`);
    }
    console.error(JSON.stringify(summary, null, 2));
    process.exit(1);
  }

  console.log('[roadmap-traceability-check] PASS');
  console.log(JSON.stringify(summary, null, 2));
}

main();

