#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DEFAULT_MANIFEST_PATH = path.join(PROJECT_ROOT, 'docs', 'ai_atomic_framework', 'framework-function-atomization-manifest.md');
const DEFAULT_FIXTURE_PATH = path.join(PROJECT_ROOT, 'tools_node', 'atomic-framework', 'fixtures', 'framework-function-atomization-coverage.fixture.json');
const TASK_ROOT = path.join(PROJECT_ROOT, 'docs', 'tasks', 'tasks-atm');

const ALLOWED_LAYERS = new Set(['layer1', 'layer2', 'layer3']);
const ALLOWED_SURFACE_KINDS = new Set([
  'cli-command',
  'manager-facade',
  'adapter-facade',
  'validator',
  'police-surface',
  'doc-surface',
  'atomic-map',
  'registry-surface',
]);
const ALLOWED_COVERAGE_STATUSES = new Set([
  'covered-existing',
  'open-card',
  'planned-gap',
  'constitutional-exception',
  'mutable-exception',
]);
const ALLOWED_COVERAGE_KINDS = new Set([
  'atom',
  'atomic-map',
  'adapter-facade',
  'open-task',
  'constitutional-exception',
  'mutable-exception',
]);
const ALLOWED_POLICE_CLASSES = new Set(['fast', 'slow', 'mixed']);
const ALLOWED_TIMINGS = new Set(['authoring-time', 'transition-time', 'sweep-time']);
const SELF_COVERAGE_FUNCTION_ID = 'framework-function-atomization-manifest-self-coverage';
const SELF_COVERAGE_REQUIRED_ARTIFACTS = new Set([
  'docs/ai_atomic_framework/framework-function-atomization-manifest.md',
  'docs/ai_atomic_framework/framework-function-atomization-manifest-shards/manifest-summary.md',
  'docs/ai_atomic_framework/framework-function-atomization-manifest-shards/manifest-inventory.md',
  'docs/ai_atomic_framework/framework-function-atomization-manifest-shards/manifest-machine-readable.md',
  'tools_node/validate-framework-atomization-coverage.js',
  'tools_node/atomic-framework/fixtures/framework-function-atomization-coverage.fixture.json',
  'tools_node/schemas/police/coverage-finding.schema.json',
]);

function parseArgs(argv) {
  const args = {
    manifest: DEFAULT_MANIFEST_PATH,
    fixture: DEFAULT_FIXTURE_PATH,
    writeFixture: false,
    strict: false,
    json: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--manifest' && argv[i + 1]) {
      args.manifest = path.resolve(process.cwd(), argv[++i]);
    } else if (token === '--fixture' && argv[i + 1]) {
      args.fixture = path.resolve(process.cwd(), argv[++i]);
    } else if (token === '--write-fixture') {
      args.writeFixture = true;
    } else if (token === '--strict') {
      args.strict = true;
    } else if (token === '--json') {
      args.json = true;
    }
  }

  return args;
}

function ensureFile(filePath, label, errors) {
  if (!fs.existsSync(filePath)) {
    errors.push(`${label} not found: ${filePath}`);
    return false;
  }
  return true;
}

function readText(filePath, label, errors) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    errors.push(`failed to read ${label}: ${error.message}`);
    return '';
  }
}

function readJson(filePath, label, errors) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    errors.push(`failed to parse ${label}: ${error.message}`);
    return null;
  }
}

function normalizeArray(value) {
  if (value == null) {
    return [];
  }
  if (!Array.isArray(value)) {
    return null;
  }
  const result = [];
  for (const entry of value) {
    if (typeof entry !== 'string' || entry.trim() === '') {
      return null;
    }
    result.push(entry.trim());
  }
  return result;
}

function normalizeTiming(value) {
  const list = normalizeArray(value);
  if (list == null) {
    return null;
  }
  if (list.length === 0) {
    return null;
  }
  for (const item of list) {
    if (!ALLOWED_TIMINGS.has(item)) {
      return null;
    }
  }
  return list;
}

function extractInventory(manifestText, errors) {
  const beginMarker = '<!-- ATOMIZATION_COVERAGE_MANIFEST:BEGIN -->';
  const endMarker = '<!-- ATOMIZATION_COVERAGE_MANIFEST:END -->';
  const beginIdx = manifestText.indexOf(beginMarker);
  const endIdx = manifestText.indexOf(endMarker);
  if (beginIdx < 0 || endIdx < 0 || endIdx <= beginIdx) {
    errors.push('manifest is missing the machine-readable inventory block');
    return [];
  }

  const block = manifestText.slice(beginIdx + beginMarker.length, endIdx);
  const fenceStart = block.indexOf('```json');
  const fenceEnd = block.lastIndexOf('```');
  if (fenceStart < 0 || fenceEnd < 0 || fenceEnd <= fenceStart) {
    errors.push('manifest inventory block must contain a fenced JSON block');
    return [];
  }

  const jsonStart = block.indexOf('\n', fenceStart);
  if (jsonStart < 0) {
    errors.push('manifest inventory block is missing JSON content');
    return [];
  }

  const jsonText = block.slice(jsonStart + 1, fenceEnd).trim();

  try {
    const parsed = JSON.parse(jsonText);
    if (!Array.isArray(parsed)) {
      errors.push('machine-readable inventory must be a JSON array');
      return [];
    }
    return parsed;
  } catch (error) {
    errors.push(`machine-readable inventory JSON is invalid: ${error.message}`);
    return [];
  }
}

function buildTaskIndex(errors) {
  const index = new Map();
  if (!fs.existsSync(TASK_ROOT)) {
    errors.push(`task root not found: ${TASK_ROOT}`);
    return index;
  }

  const shardFiles = fs.readdirSync(TASK_ROOT)
    .filter(name => /^tasks-atm-part-\d+\.json$/.test(name))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));

  for (const shardName of shardFiles) {
    const shardPath = path.join(TASK_ROOT, shardName);
    const shard = readJson(shardPath, shardName, errors);
    if (!Array.isArray(shard)) {
      errors.push(`task shard must be an array: ${shardPath}`);
      continue;
    }

    for (const task of shard) {
      if (!task || typeof task !== 'object') {
        errors.push(`invalid task entry in ${shardName}`);
        continue;
      }
      if (typeof task.id !== 'string' || task.id.trim() === '') {
        errors.push(`task entry missing id in ${shardName}`);
        continue;
      }
      if (index.has(task.id)) {
        errors.push(`duplicate ATM task id detected: ${task.id}`);
        continue;
      }
      index.set(task.id, {
        ...task,
        __shard: shardName,
        __status: typeof task.status === 'string' ? task.status.trim().toLowerCase() : '',
      });
    }
  }

  return index;
}

function validateFindingContract(record, pathLabel, errors) {
  const contract = record.findingContract;
  if (contract == null || typeof contract !== 'object' || Array.isArray(contract)) {
    errors.push(`${pathLabel}: police-surface requires findingContract object`);
    return;
  }

  for (const field of ['trigger', 'scope', 'severity', 'action']) {
    if (typeof contract[field] !== 'string' || contract[field].trim() === '') {
      errors.push(`${pathLabel}: findingContract.${field} is required`);
    }
  }

  if (typeof contract.policeClass !== 'string' || !ALLOWED_POLICE_CLASSES.has(contract.policeClass)) {
    errors.push(`${pathLabel}: findingContract.policeClass must be fast, slow, or mixed`);
  }

  const timings = normalizeTiming(contract.timing);
  if (!timings) {
    errors.push(`${pathLabel}: findingContract.timing must be a non-empty array of authoring-time / transition-time / sweep-time`);
  }
}

function normalizeRecord(record, index, errors) {
  const label = `record[${index}]`;
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    errors.push(`${label} must be an object`);
    return null;
  }

  const normalized = {
    functionId: typeof record.functionId === 'string' ? record.functionId.trim() : '',
    label: typeof record.label === 'string' ? record.label.trim() : '',
    layer: typeof record.layer === 'string' ? record.layer.trim() : '',
    surfaceKind: typeof record.surfaceKind === 'string' ? record.surfaceKind.trim() : '',
    coverageStatus: typeof record.coverageStatus === 'string' ? record.coverageStatus.trim() : '',
    coverageKind: typeof record.coverageKind === 'string' ? record.coverageKind.trim() : '',
    taskRefs: normalizeArray(record.taskRefs),
    artifactRefs: normalizeArray(record.artifactRefs),
    nextCheck: typeof record.nextCheck === 'string' ? record.nextCheck.trim() : '',
    routeHint: record.routeHint == null ? null : (typeof record.routeHint === 'string' ? record.routeHint.trim() : ''),
    findingContract: record.findingContract == null ? null : record.findingContract,
  };

  if (!normalized.functionId) {
    errors.push(`${label}.functionId is required`);
  }
  if (!normalized.label) {
    errors.push(`${label}.label is required`);
  }
  if (!ALLOWED_LAYERS.has(normalized.layer)) {
    errors.push(`${label}.layer must be layer1, layer2, or layer3`);
  }
  if (!ALLOWED_SURFACE_KINDS.has(normalized.surfaceKind)) {
    errors.push(`${label}.surfaceKind must be one of the allowed governed surfaces`);
  }
  if (!ALLOWED_COVERAGE_STATUSES.has(normalized.coverageStatus)) {
    errors.push(`${label}.coverageStatus is invalid`);
  }
  if (!ALLOWED_COVERAGE_KINDS.has(normalized.coverageKind)) {
    errors.push(`${label}.coverageKind is invalid`);
  }
  if (!Array.isArray(normalized.taskRefs) || normalized.taskRefs.length === 0) {
    errors.push(`${label}.taskRefs must be a non-empty string array`);
  }
  if (!Array.isArray(normalized.artifactRefs) || normalized.artifactRefs.length === 0) {
    errors.push(`${label}.artifactRefs must be a non-empty string array`);
  }
  if (!normalized.nextCheck) {
    errors.push(`${label}.nextCheck is required`);
  }

  if (normalized.routeHint !== null && normalized.routeHint === '') {
    errors.push(`${label}.routeHint, when present, must not be empty`);
  }

  if (normalized.surfaceKind === 'police-surface') {
    validateFindingContract(normalized, label, errors);
  } else if (normalized.findingContract != null) {
    errors.push(`${label}.findingContract is only allowed on police-surface records`);
  }

  if (normalized.coverageStatus === 'constitutional-exception' && normalized.layer !== 'layer1') {
    errors.push(`${label}: constitutional-exception is only allowed on layer1`);
  }
  if (normalized.coverageStatus === 'mutable-exception' && normalized.layer !== 'layer3') {
    errors.push(`${label}: mutable-exception is only allowed on layer3`);
  }
  if (normalized.layer === 'layer2' && (normalized.coverageStatus === 'constitutional-exception' || normalized.coverageStatus === 'mutable-exception')) {
    errors.push(`${label}: layer2 cannot use exception coverage statuses`);
  }

  if (normalized.coverageStatus === 'covered-existing') {
    if (normalized.coverageKind !== 'atom' && normalized.coverageKind !== 'atomic-map' && normalized.coverageKind !== 'adapter-facade') {
      errors.push(`${label}: covered-existing must use atom / atomic-map / adapter-facade coverageKind`);
    }
  } else if (normalized.coverageStatus === 'open-card' || normalized.coverageStatus === 'planned-gap') {
    if (normalized.coverageKind !== 'open-task') {
      errors.push(`${label}: open-card / planned-gap must use open-task coverageKind`);
    }
  } else if (normalized.coverageStatus === 'constitutional-exception') {
    if (normalized.coverageKind !== 'constitutional-exception') {
      errors.push(`${label}: constitutional-exception rows must use matching coverageKind`);
    }
  } else if (normalized.coverageStatus === 'mutable-exception') {
    if (normalized.coverageKind !== 'mutable-exception') {
      errors.push(`${label}: mutable-exception rows must use matching coverageKind`);
    }
  }

  return normalized;
}

function compareRecords(lhs, rhs) {
  return JSON.stringify(lhs) === JSON.stringify(rhs);
}

function validateRecords(records, taskIndex, errors) {
  const normalizedRecords = [];
  const seenIds = new Set();

  for (let i = 0; i < records.length; i++) {
    const normalized = normalizeRecord(records[i], i, errors);
    if (!normalized) {
      continue;
    }

    if (seenIds.has(normalized.functionId)) {
      errors.push(`duplicate functionId detected: ${normalized.functionId}`);
    } else {
      seenIds.add(normalized.functionId);
    }

    const taskStatuses = normalized.taskRefs.map(ref => {
      const task = taskIndex.get(ref);
      if (!task) {
        errors.push(`${normalized.functionId}: missing ATM task ref ${ref}`);
        return { ref, status: 'missing' };
      }
      return { ref, status: task.__status || '', shard: task.__shard };
    });

    if (normalized.coverageStatus === 'covered-existing') {
      for (const taskStatus of taskStatuses) {
        if (taskStatus.status !== 'done') {
          errors.push(`${normalized.functionId}: covered-existing task ref ${taskStatus.ref} must be done (got ${taskStatus.status || 'unknown'})`);
        }
      }
    } else if (normalized.coverageStatus === 'open-card' || normalized.coverageStatus === 'planned-gap') {
      const hasOpen = taskStatuses.some(taskStatus => taskStatus.status !== 'done' && taskStatus.status !== 'missing');
      if (!hasOpen) {
        errors.push(`${normalized.functionId}: ${normalized.coverageStatus} must reference at least one non-done task`);
      }
      if (normalized.routeHint === null || normalized.routeHint === '') {
        errors.push(`${normalized.functionId}: ${normalized.coverageStatus} requires routeHint`);
      }
    }

    if (normalized.coverageStatus === 'constitutional-exception' || normalized.coverageStatus === 'mutable-exception') {
      if (normalized.routeHint !== null) {
        errors.push(`${normalized.functionId}: exception rows should not carry routeHint`);
      }
    }

    normalizedRecords.push(normalized);
  }

  return normalizedRecords;
}

function validateManifestSelfCoverage(records, errors) {
  const record = records.find((entry) => entry.functionId === SELF_COVERAGE_FUNCTION_ID);
  if (!record) {
    errors.push('manifest self-coverage row is missing: framework-function-atomization-manifest-self-coverage');
    return;
  }

  if (record.layer !== 'layer2') {
    errors.push(`${SELF_COVERAGE_FUNCTION_ID}: layer must be layer2`);
  }
  if (record.surfaceKind !== 'validator') {
    errors.push(`${SELF_COVERAGE_FUNCTION_ID}: surfaceKind must be validator`);
  }
  if (record.coverageStatus !== 'covered-existing') {
    errors.push(`${SELF_COVERAGE_FUNCTION_ID}: coverageStatus must be covered-existing`);
  }
  if (record.coverageKind !== 'atom') {
    errors.push(`${SELF_COVERAGE_FUNCTION_ID}: coverageKind must be atom`);
  }
  if (!Array.isArray(record.taskRefs) || !record.taskRefs.includes('ATM-2-0051')) {
    errors.push(`${SELF_COVERAGE_FUNCTION_ID}: taskRefs must include ATM-2-0051`);
  }
  for (const requiredArtifact of SELF_COVERAGE_REQUIRED_ARTIFACTS) {
    if (!Array.isArray(record.artifactRefs) || !record.artifactRefs.includes(requiredArtifact)) {
      errors.push(`${SELF_COVERAGE_FUNCTION_ID}: artifactRefs missing ${requiredArtifact}`);
    }
  }
  if (record.routeHint !== null) {
    errors.push(`${SELF_COVERAGE_FUNCTION_ID}: routeHint must be null`);
  }
  if (record.findingContract !== null) {
    errors.push(`${SELF_COVERAGE_FUNCTION_ID}: findingContract must be null`);
  }
}

function ensureFixtureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const errors = [];
  const warnings = [];

  if (!ensureFile(args.manifest, 'manifest', errors)) {
    // keep going to surface more context
  }
  const manifestText = fs.existsSync(args.manifest) ? readText(args.manifest, 'manifest', errors) : '';
  const manifestRecords = manifestText ? extractInventory(manifestText, errors) : [];

  const taskIndex = buildTaskIndex(errors);
  const normalizedManifestRecords = validateRecords(manifestRecords, taskIndex, errors);
  validateManifestSelfCoverage(normalizedManifestRecords, errors);

  let fixtureRecords = [];
  if (fs.existsSync(args.fixture)) {
    const parsedFixture = readJson(args.fixture, 'fixture', errors);
    if (Array.isArray(parsedFixture)) {
      fixtureRecords = parsedFixture;
    } else if (parsedFixture != null) {
      errors.push('fixture must be a JSON array');
    }
  } else if (!args.writeFixture) {
    warnings.push(`fixture missing, will be created at ${args.fixture}`);
  }

  if (!errors.length && (args.writeFixture || !fs.existsSync(args.fixture))) {
    ensureFixtureDir(args.fixture);
    fs.writeFileSync(args.fixture, JSON.stringify(normalizedManifestRecords, null, 2) + '\n', 'utf8');
    fixtureRecords = normalizedManifestRecords;
  }

  if (fixtureRecords.length > 0 || normalizedManifestRecords.length > 0) {
    if (!compareRecords(normalizedManifestRecords, fixtureRecords)) {
      errors.push(`fixture drift detected between manifest and ${path.relative(PROJECT_ROOT, args.fixture)}`);
    }
  }

  const summary = {
    manifest: path.relative(PROJECT_ROOT, args.manifest),
    fixture: path.relative(PROJECT_ROOT, args.fixture),
    records: normalizedManifestRecords.length,
    taskCards: taskIndex.size,
    warnings: warnings.length,
    errors: errors.length,
    passed: errors.length === 0,
  };

  if (args.json) {
    console.log(JSON.stringify({
      ...summary,
      warnings,
      errors,
    }, null, 2));
  } else {
    console.log(`[validate-framework-atomization-coverage] manifest=${summary.manifest}`);
    console.log(`[validate-framework-atomization-coverage] fixture=${summary.fixture}`);
    console.log(`[validate-framework-atomization-coverage] records=${summary.records} taskCards=${summary.taskCards}`);
    for (const warning of warnings) {
      console.warn(`[validate-framework-atomization-coverage] WARN ${warning}`);
    }
    if (errors.length === 0) {
      console.log('[validate-framework-atomization-coverage] OK');
    } else {
      for (const error of errors) {
        console.error(`[validate-framework-atomization-coverage] ERROR ${error}`);
      }
      console.error(`[validate-framework-atomization-coverage] FAIL (${errors.length} error${errors.length === 1 ? '' : 's'})`);
    }
  }

  const exitCode = errors.length > 0 ? 1 : 0;
  process.exit(exitCode);
}

if (require.main === module) {
  main();
}
