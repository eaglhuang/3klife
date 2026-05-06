#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const Ajv2020 = require('ajv/dist/2020');
const addFormats = require('ajv-formats');

const storage = require('./lib/turn-artifact-storage');

const PROJECT_ROOT = storage.PROJECT_ROOT;
const DEFAULT_ROOT = storage.FORMAL_ROOT;
const SCHEMA_PATH = path.join(PROJECT_ROOT, 'tools_node', 'schemas', 'turn-artifact.schema.json');

function printHelp() {
  console.log('Usage: node tools_node/query-turn-artifact-history.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --root <path>       Root directory to scan (default: artifacts/turn-artifacts)');
  console.log('  --workflow <name>   Filter by exact workflow');
  console.log('  --task <name>       Filter by exact task');
  console.log('  --date <YYYY-MM-DD> Filter by generatedAt date prefix');
  console.log('  --from <YYYY-MM-DD> Filter generatedAt date >= from');
  console.log('  --to <YYYY-MM-DD>   Filter generatedAt date <= to');
  console.log('  --status <value>    Filter by derived status (valid/pass/warn/fail/unknown)');
  console.log('  --json              Print full JSON result');
  console.log('  --help, -h          Show this help message');
}

function parseArgs(argv) {
  const args = {
    root: storage.TURN_ARTIFACT_STORAGE_POLICY.formalRoot,
    workflow: '',
    task: '',
    date: '',
    from: '',
    to: '',
    status: '',
    json: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--root') {
      args.root = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--workflow') {
      args.workflow = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--task') {
      args.task = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--date') {
      args.date = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--from') {
      args.from = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--to') {
      args.to = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--status') {
      args.status = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--json') {
      args.json = true;
      continue;
    }
    if (token === '--help' || token === '-h') {
      args.help = true;
      continue;
    }
    throw new Error(`未知參數：${token}`);
  }

  return args;
}

function resolveProjectPath(targetPath) {
  return path.isAbsolute(targetPath) ? targetPath : path.join(PROJECT_ROOT, targetPath);
}

function relativePath(targetPath) {
  return storage.toProjectRelative(targetPath);
}

function readJsonOrThrow(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
  } catch (error) {
    throw new Error(`${label} 讀取失敗：${error.message}`);
  }
}

function createValidator() {
  const schema = readJsonOrThrow(SCHEMA_PATH, 'turn-artifact schema');
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  return ajv.compile(schema);
}

function formatSchemaErrors(errors) {
  return (errors || [])
    .map((error) => `${error.instancePath || '(root)'} ${error.message || 'schema error'}`.trim())
    .join('; ');
}

function walkJsonFiles(rootPath) {
  if (!fs.existsSync(rootPath)) {
    return [];
  }

  const results = [];
  const stack = [rootPath];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    entries.forEach((entry) => {
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolutePath);
        return;
      }
      if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) {
        results.push(absolutePath);
      }
    });
  }

  return results.sort((left, right) => left.localeCompare(right));
}

function incrementCount(target, key) {
  if (!key) {
    return;
  }
  target[key] = (target[key] || 0) + 1;
}

function deriveArtifactStatus(artifact) {
  const direct = artifact && typeof artifact.status === 'string' ? artifact.status.trim() : '';
  if (direct) {
    return direct;
  }
  const handoffValidation = artifact && artifact.handoffValidation && typeof artifact.handoffValidation === 'object'
    ? artifact.handoffValidation
    : null;
  if (handoffValidation && typeof handoffValidation.status === 'string' && handoffValidation.status.trim()) {
    return handoffValidation.status.trim();
  }
  const handoffDiff = artifact && artifact.handoffDiff && typeof artifact.handoffDiff === 'object'
    ? artifact.handoffDiff
    : null;
  if (handoffDiff && typeof handoffDiff.status === 'string' && handoffDiff.status.trim()) {
    return handoffDiff.status.trim();
  }
  return 'valid';
}

function normalizeDatePrefix(value) {
  const text = String(value || '').trim();
  if (!text) {
    return '';
  }
  const match = text.match(/^\d{4}-\d{2}-\d{2}/);
  if (match) {
    return match[0];
  }
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  throw new Error(`invalid date filter: ${text}`);
}

function matchesFilters(entry, filters) {
  if (filters.workflow && entry.workflow !== filters.workflow) {
    return false;
  }
  if (filters.task && entry.task !== filters.task) {
    return false;
  }
  if (filters.date && entry.date !== filters.date) {
    return false;
  }
  if (filters.from && entry.date < filters.from) {
    return false;
  }
  if (filters.to && entry.date > filters.to) {
    return false;
  }
  if (filters.status && entry.status !== filters.status) {
    return false;
  }
  return true;
}

function buildEntry(filePath, artifact) {
  const generatedAt = String(artifact.generatedAt || '');
  const date = generatedAt.slice(0, 10);
  return {
    path: relativePath(filePath),
    pathClass: storage.classifyTurnArtifactPath(filePath),
    schemaVersion: String(artifact.schemaVersion || ''),
    kind: String(artifact.kind || ''),
    workflow: String(artifact.workflow || ''),
    task: String(artifact.task || ''),
    goal: String(artifact.goal || ''),
    generatedAt,
    date,
    status: deriveArtifactStatus(artifact),
    fileCount: Number(artifact.totals && artifact.totals.files || 0),
    totalBytes: Number(artifact.totals && artifact.totals.totalBytes || 0),
    estTokens: Number(artifact.totals && artifact.totals.estTokens || 0),
  };
}

function compareGeneratedAt(left, right) {
  return String(left.generatedAt || '').localeCompare(String(right.generatedAt || ''));
}

function summarizeEntries(entries) {
  const workflowCounts = {};
  const taskCounts = {};
  const statusCounts = {};
  let earliest = '';
  let latest = '';

  entries.forEach((entry) => {
    incrementCount(workflowCounts, entry.workflow);
    incrementCount(taskCounts, entry.task);
    incrementCount(statusCounts, entry.status);
    if (!earliest || entry.generatedAt < earliest) {
      earliest = entry.generatedAt;
    }
    if (!latest || entry.generatedAt > latest) {
      latest = entry.generatedAt;
    }
  });

  return {
    count: entries.length,
    earliestGeneratedAt: earliest || null,
    latestGeneratedAt: latest || null,
    workflowCounts,
    taskCounts,
    statusCounts,
  };
}

function queryTurnArtifactHistory(options = {}) {
  const validateArtifact = createValidator();
  const rootPath = resolveProjectPath(options.root || storage.TURN_ARTIFACT_STORAGE_POLICY.formalRoot);
  const filters = {
    workflow: String(options.workflow || '').trim(),
    task: String(options.task || '').trim(),
    date: normalizeDatePrefix(options.date || ''),
    from: normalizeDatePrefix(options.from || ''),
    to: normalizeDatePrefix(options.to || ''),
    status: String(options.status || '').trim(),
  };
  const rootClass = storage.classifyTurnArtifactPath(rootPath);
  const files = rootClass === 'formal'
    ? walkJsonFiles(rootPath)
    : walkJsonFiles(DEFAULT_ROOT).filter((filePath) => filePath.startsWith(rootPath));

  const entries = [];
  const skipped = [];

  files.forEach((filePath) => {
    const pathClass = storage.classifyTurnArtifactPath(filePath);
    if (pathClass !== 'formal') {
      skipped.push({
        path: relativePath(filePath),
        reason: 'non-formal-path',
        detail: `pathClass=${pathClass}`,
      });
      return;
    }

    let artifact;
    try {
      artifact = readJsonOrThrow(filePath, 'turn artifact');
    } catch (error) {
      skipped.push({
        path: relativePath(filePath),
        reason: 'broken-json',
        detail: error.message,
      });
      return;
    }

    if (!artifact || artifact.schemaVersion !== 'turn-artifact/v1' || artifact.kind !== 'turn-artifact') {
      skipped.push({
        path: relativePath(filePath),
        reason: 'unsupported-artifact-version',
        detail: `schemaVersion=${artifact && artifact.schemaVersion ? artifact.schemaVersion : '(missing)'} kind=${artifact && artifact.kind ? artifact.kind : '(missing)'}`,
      });
      return;
    }

    if (!validateArtifact(artifact)) {
      skipped.push({
        path: relativePath(filePath),
        reason: 'schema-mismatch',
        detail: formatSchemaErrors(validateArtifact.errors),
      });
      return;
    }

    const entry = buildEntry(filePath, artifact);
    if (matchesFilters(entry, filters)) {
      entries.push(entry);
    }
  });

  entries.sort(compareGeneratedAt);

  return {
    schemaVersion: 'turn-artifact-history-query/v1',
    kind: 'turn-artifact-history-query',
    generatedAt: new Date().toISOString(),
    root: relativePath(rootPath),
    filters,
    scan: {
      rootPathClass: rootClass,
      scannedFileCount: files.length,
      matchedArtifactCount: entries.length,
      skippedCount: skipped.length,
    },
    summary: summarizeEntries(entries),
    skipped,
    entries,
  };
}

function printSummary(result) {
  console.log(`[query-turn-artifact-history] root=${result.root} pathClass=${result.scan.rootPathClass}`);
  console.log(`[query-turn-artifact-history] scanned=${result.scan.scannedFileCount} matched=${result.scan.matchedArtifactCount} skipped=${result.scan.skippedCount}`);
  if (result.summary.count > 0) {
    console.log(`[query-turn-artifact-history] range=${result.summary.earliestGeneratedAt} -> ${result.summary.latestGeneratedAt}`);
    const workflows = Object.entries(result.summary.workflowCounts)
      .sort((left, right) => right[1] - left[1])
      .map(([workflow, count]) => `${workflow}:${count}`)
      .join(', ');
    const statuses = Object.entries(result.summary.statusCounts)
      .sort((left, right) => right[1] - left[1])
      .map(([status, count]) => `${status}:${count}`)
      .join(', ');
    console.log(`[query-turn-artifact-history] workflows=${workflows || '(none)'}`);
    console.log(`[query-turn-artifact-history] statuses=${statuses || '(none)'}`);
  }
  if (result.skipped.length > 0) {
    result.skipped.forEach((entry) => {
      console.log(`[query-turn-artifact-history] skipped ${entry.path}: ${entry.reason} ${entry.detail}`.trim());
    });
  }
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`[query-turn-artifact-history] ${error.message}`);
    printHelp();
    process.exit(1);
  }

  if (args.help) {
    printHelp();
    return;
  }

  try {
    const result = queryTurnArtifactHistory(args);
    if (args.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    printSummary(result);
  } catch (error) {
    console.error(`[query-turn-artifact-history] ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  createValidator,
  buildEntry,
  queryTurnArtifactHistory,
};