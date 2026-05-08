#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_DOCS_DIR = path.join(ROOT, 'docs', 'ai_atomic_framework');
const POLICY_FILE = 'documentation-governance-policy.md';
const ROLE_MAP_FILE = 'documentation-role-map.md';
const CROSS_REF_FILE = 'ATM_cross_reference.md';

const ALLOWED_ROOT_ROLES = new Set(['canonical', 'reference', 'adopter', 'history', 'index', 'asset']);
const ALLOWED_SHARD_ROLES = new Set(['shard', 'shard-reference', 'shard-history']);
const CANONICAL_ROOT_ALLOWLIST = new Set([
  'AI_Atomic_Framework_Roadmap.md',
  'AI原子框架開發計畫書.md',
  'ATM框架演進執行規劃書.md',
  'framework-function-atomization-manifest.md',
  'upstream-versioning-policy.md',
  '原子行為參考手冊.md',
  'documentation-governance-policy.md',
]);

function parseArgs(argv) {
  const args = {
    root: DEFAULT_DOCS_DIR,
    strict: false,
    json: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--root' && argv[i + 1]) {
      args.root = path.resolve(ROOT, argv[++i]);
    } else if (arg === '--strict') {
      args.strict = true;
    } else if (arg === '--json') {
      args.json = true;
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    }
  }

  return args;
}

function usage() {
  console.log([
    'Usage: node tools_node/validate-atm-doc-governance.js [options]',
    '  --root <path>   ATM docs root to validate (default: docs/ai_atomic_framework)',
    '  --strict        Treat warnings as failures',
    '  --json          Emit JSON summary',
    '  --help          Show this message',
  ].join('\n'));
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function exists(filePath) {
  return fs.existsSync(filePath);
}

function normalizeCell(cell) {
  return String(cell || '')
    .replace(/`/g, '')
    .replace(/\u00a0/g, ' ')
    .trim();
}

function normalizeEntryName(cell) {
  return normalizeCell(cell).replace(/[\\/]+$/, '');
}

function extractSection(markdown, headingText) {
  const lines = markdown.split(/\r?\n/);
  const headingIndex = lines.findIndex((line) => line.trim() === headingText);
  if (headingIndex < 0) {
    return '';
  }

  const body = [];
  for (let i = headingIndex + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i].trim())) {
      break;
    }
    body.push(lines[i]);
  }
  return body.join('\n');
}

function parseMarkdownTable(sectionText) {
  const rows = [];
  const lines = sectionText.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line.startsWith('|')) {
      continue;
    }

    const cells = line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());

    if (cells.length < 2) {
      continue;
    }

    const combined = cells.join('').replace(/[:\-\s]/g, '');
    if (!combined) {
      continue;
    }

    const firstCell = normalizeCell(cells[0]);
    if (firstCell === '路徑' || firstCell.toLowerCase() === 'path' || firstCell === '目錄') {
      continue;
    }

    rows.push(cells.map(normalizeCell));
  }

  return rows;
}

function collectActualEntries(dirPath) {
  const files = [];
  const dirs = [];

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (entry.isFile()) {
      files.push(entry.name);
    } else if (entry.isDirectory()) {
      dirs.push(entry.name);
    }
  }

  return {
    files: files.sort((a, b) => a.localeCompare(b, 'zh-Hant')),
    dirs: dirs.sort((a, b) => a.localeCompare(b, 'zh-Hant')),
  };
}

function hasOrderedNeedles(text, needles) {
  let cursor = -1;
  for (const needle of needles) {
    const next = text.indexOf(needle, cursor + 1);
    if (next < 0) {
      return false;
    }
    cursor = next;
  }
  return true;
}

function validatePolicy(policyPath, errors, warnings) {
  const text = readText(policyPath);

  if (!/^##\s+Agent Boot Order/m.test(text)) {
    errors.push({
      rule: 'ATM-DOC-BOOT-01',
      message: `Missing "Agent Boot Order" section in ${path.relative(ROOT, policyPath)}`,
    });
    return;
  }

  const orderedNeedles = [
    'docs/ai_atomic_framework/documentation-governance-policy.md',
    'docs/ai_atomic_framework/documentation-role-map.md',
    'docs/ai_atomic_framework/ATM_cross_reference.md',
  ];

  if (!hasOrderedNeedles(text, orderedNeedles)) {
    errors.push({
      rule: 'ATM-DOC-BOOT-02',
      message: `Boot order is not explicit or not in the required order in ${path.relative(ROOT, policyPath)}`,
    });
  }

  for (const needle of orderedNeedles) {
    if (!text.includes(needle)) {
      errors.push({
        rule: 'ATM-DOC-BOOT-03',
        message: `Boot order reference missing: ${needle}`,
      });
    }
  }

  if (!text.includes('documentation-governance-policy.md') || !text.includes('documentation-role-map.md')) {
    warnings.push({
      rule: 'ATM-DOC-BOOT-04',
      message: 'Policy should mention both governance policy and role map as the bootstrap path.',
    });
  }
}

function validateRoleMap(roleMapPath, rootDir, errors, warnings) {
  const text = readText(roleMapPath);
  const rootSection = extractSection(text, '## Root Files');
  const shardSection = extractSection(text, '## Shard Directories');

  if (!rootSection) {
    errors.push({
      rule: 'ATM-DOC-MAP-01',
      message: `Missing "Root Files" section in ${path.relative(ROOT, roleMapPath)}`,
    });
    return { rootRows: [], shardRows: [] };
  }

  if (!shardSection) {
    errors.push({
      rule: 'ATM-DOC-MAP-02',
      message: `Missing "Shard Directories" section in ${path.relative(ROOT, roleMapPath)}`,
    });
  }

  const rootRows = parseMarkdownTable(rootSection).map(([filePath, role, disposition, description]) => ({
    filePath: normalizeEntryName(filePath),
    role,
    disposition,
    description,
  }));

  const shardRows = parseMarkdownTable(shardSection).map(([dirPath, role, parent, disposition]) => ({
    dirPath: normalizeEntryName(dirPath),
    role,
    parent,
    disposition,
  }));

  const rootPathSet = new Set();
  for (const row of rootRows) {
    if (!row.filePath) {
      errors.push({
        rule: 'ATM-DOC-MAP-03',
        message: `Empty root path entry in ${path.relative(ROOT, roleMapPath)}`,
      });
      continue;
    }

    if (rootPathSet.has(row.filePath)) {
      errors.push({
        rule: 'ATM-DOC-MAP-04',
        message: `Duplicate root entry in role map: ${row.filePath}`,
      });
    }
    rootPathSet.add(row.filePath);

    if (!ALLOWED_ROOT_ROLES.has(row.role)) {
      errors.push({
        rule: 'ATM-DOC-MAP-05',
        message: `Unknown root role "${row.role}" for ${row.filePath}`,
      });
    }
  }

  const shardPathSet = new Set();
  for (const row of shardRows) {
    if (!row.dirPath) {
      continue;
    }
    if (shardPathSet.has(row.dirPath)) {
      errors.push({
        rule: 'ATM-DOC-MAP-06',
        message: `Duplicate shard entry in role map: ${row.dirPath}`,
      });
    }
    shardPathSet.add(row.dirPath);

    if (!ALLOWED_SHARD_ROLES.has(row.role)) {
      errors.push({
        rule: 'ATM-DOC-MAP-07',
        message: `Unknown shard role "${row.role}" for ${row.dirPath}`,
      });
    }
  }

  const actual = collectActualEntries(rootDir);

  for (const fileName of actual.files) {
    if (!rootPathSet.has(fileName)) {
      errors.push({
        rule: 'ATM-DOC-MAP-08',
        message: `Missing root file in role map: ${fileName}`,
      });
    }
  }

  for (const listed of rootRows) {
    if (listed.filePath && !actual.files.includes(listed.filePath)) {
      errors.push({
        rule: 'ATM-DOC-MAP-09',
        message: `Role map references a root file that does not exist: ${listed.filePath}`,
      });
    }
  }

  for (const dirName of actual.dirs) {
    if (!shardPathSet.has(dirName)) {
      errors.push({
        rule: 'ATM-DOC-MAP-10',
        message: `Missing shard directory in role map: ${dirName}`,
      });
    }
  }

  for (const listed of shardRows) {
    if (listed.dirPath && !actual.dirs.includes(listed.dirPath)) {
      errors.push({
        rule: 'ATM-DOC-MAP-11',
        message: `Role map references a shard directory that does not exist: ${listed.dirPath}`,
      });
    }
  }

  const policyRow = rootRows.find((row) => row.filePath === POLICY_FILE);
  const roleMapRow = rootRows.find((row) => row.filePath === ROLE_MAP_FILE);
  const crossRefRow = rootRows.find((row) => row.filePath === CROSS_REF_FILE);

  if (!policyRow || policyRow.role !== 'canonical') {
    errors.push({
      rule: 'ATM-DOC-MAP-12',
      message: `${POLICY_FILE} must be classified as canonical`,
    });
  }

  if (!roleMapRow || roleMapRow.role !== 'index') {
    errors.push({
      rule: 'ATM-DOC-MAP-13',
      message: `${ROLE_MAP_FILE} must be classified as index`,
    });
  }

  if (!crossRefRow || crossRefRow.role !== 'index') {
    errors.push({
      rule: 'ATM-DOC-MAP-14',
      message: `${CROSS_REF_FILE} must remain an index`,
    });
  }

  for (const row of rootRows) {
    if (row.role === 'canonical' && !CANONICAL_ROOT_ALLOWLIST.has(row.filePath)) {
      errors.push({
        rule: 'ATM-DOC-MAP-15',
        message: `Unexpected canonical root file without allowlist entry: ${row.filePath}`,
      });
    }
  }

  if (!policyRow || !roleMapRow || !crossRefRow) {
    warnings.push({
      rule: 'ATM-DOC-MAP-16',
      message: 'Boot chain rows are incomplete; the policy should describe the first-read order explicitly.',
    });
  }

  return { rootRows, shardRows, actual };
}

function formatResult(result) {
  const lines = [];
  lines.push(`[atm-doc-governance] root=${result.rootDir}`);
  lines.push(`[atm-doc-governance] actual root files=${result.actual.files.length} dirs=${result.actual.dirs.length}`);
  lines.push(`[atm-doc-governance] listed root files=${result.rootRows} shard dirs=${result.shardRows}`);
  lines.push(`[atm-doc-governance] warnings=${result.warnings.length} errors=${result.errors.length}`);
  return lines.join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return 0;
  }

  const policyPath = path.join(args.root, POLICY_FILE);
  const roleMapPath = path.join(args.root, ROLE_MAP_FILE);

  const errors = [];
  const warnings = [];

  if (!exists(args.root)) {
    console.error(`[atm-doc-governance] root not found: ${args.root}`);
    return 1;
  }

  if (!exists(policyPath)) {
    errors.push({ rule: 'ATM-DOC-00', message: `Missing policy file: ${path.relative(ROOT, policyPath)}` });
  }

  if (!exists(roleMapPath)) {
    errors.push({ rule: 'ATM-DOC-00', message: `Missing role map file: ${path.relative(ROOT, roleMapPath)}` });
  }

  if (errors.length === 0) {
    validatePolicy(policyPath, errors, warnings);
  }

  let mapResult = { rootRows: [], shardRows: [], actual: { files: [], dirs: [] } };
  if (errors.length === 0) {
    mapResult = validateRoleMap(roleMapPath, args.root, errors, warnings);
  }

  const passed = errors.length === 0 && (!args.strict || warnings.length === 0);
  const result = {
    passed,
    rootDir: args.root,
    policyFile: path.relative(ROOT, policyPath),
    roleMapFile: path.relative(ROOT, roleMapPath),
    rootRows: mapResult.rootRows.length,
    shardRows: mapResult.shardRows.length,
    actualRootFiles: mapResult.actual.files.length,
    actualRootDirs: mapResult.actual.dirs.length,
    actual: mapResult.actual,
    warnings,
    errors,
  };

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatResult(result));
    for (const warning of warnings) {
      console.log(`[WARN] ${warning.rule}: ${warning.message}`);
    }
    for (const error of errors) {
      console.error(`[ERROR] ${error.rule}: ${error.message}`);
    }
    if (passed) {
      console.log('[atm-doc-governance] OK');
    }
  }

  return passed ? 0 : 1;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = {
  parseArgs,
  extractSection,
  parseMarkdownTable,
  validatePolicy,
  validateRoleMap,
  main,
};
