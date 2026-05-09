#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_MAPPING_PATH = path.join(__dirname, 'mapping-table.json');
const HOST_FIELD_PATTERN = /(?:host|adopter|workspace|cocos|ucuf|engine|project)/i;
const ATM_ID_PATTERN = /^ATM-[A-Z][A-Z0-9]*-\d{4}$/;

function parseArgs(argv) {
  const parsed = {
    source: '',
    output: '',
    mode: 'strict',
    mapping: DEFAULT_MAPPING_PATH,
    workbenchRoot: path.join(ROOT, 'atomic_workbench'),
    now: '',
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--source') {
      parsed.source = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--output') {
      parsed.output = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--mapping') {
      parsed.mapping = argv[index + 1] || parsed.mapping;
      index += 1;
      continue;
    }
    if (token === '--workbench-root') {
      parsed.workbenchRoot = argv[index + 1] || parsed.workbenchRoot;
      index += 1;
      continue;
    }
    if (token === '--mode') {
      parsed.mode = String(argv[index + 1] || '').trim().toLowerCase();
      index += 1;
      continue;
    }
    if (token === '--strict') {
      parsed.mode = 'strict';
      continue;
    }
    if (token === '--lenient') {
      parsed.mode = 'lenient';
      continue;
    }
    if (token === '--now') {
      parsed.now = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--help' || token === '-h') {
      parsed.help = true;
      continue;
    }
    throw new Error(`unknown arg: ${token}`);
  }

  if (!parsed.help && !parsed.source) {
    throw new Error('missing required arg: --source');
  }
  if (!parsed.help && parsed.mode !== 'strict' && parsed.mode !== 'lenient') {
    throw new Error(`invalid --mode: ${parsed.mode}`);
  }

  return parsed;
}

function printHelp() {
  console.log('Usage: node tools_node/atm-adapter/usage-evidence-shadow.js --source <json> [--output <json>] [--mode strict|lenient]');
  console.log('');
  console.log('Maps 3KLife usage inputs to ATM usage-feedback evidence payload in shadow mode.');
}

function rel(filePath) {
  return path.relative(ROOT, path.resolve(filePath)).replace(/\\/g, '/');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, payload) {
  const abs = path.resolve(filePath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getByPath(obj, pathExpr) {
  if (!pathExpr) {
    return undefined;
  }
  const segments = String(pathExpr)
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean);
  let current = obj;
  for (const segment of segments) {
    if (!isObject(current) && !Array.isArray(current)) {
      return undefined;
    }
    if (!(segment in current)) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
}

function setByPath(obj, pathExpr, value) {
  const segments = String(pathExpr)
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean);
  if (segments.length === 0) {
    return;
  }
  let current = obj;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    const nextSegment = segments[index + 1];
    const needsArray = /^\d+$/.test(nextSegment);
    if (!(segment in current)) {
      current[segment] = needsArray ? [] : {};
    }
    current = current[segment];
  }
  const leaf = segments[segments.length - 1];
  current[leaf] = value;
}

function firstPresent(source, paths) {
  for (const sourcePath of paths) {
    const value = getByPath(source, sourcePath);
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return undefined;
}

function toInt(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.trunc(parsed);
}

function normalizeAtomId(rawAtomId) {
  const value = String(rawAtomId || '').trim();
  if (!value) {
    return '';
  }
  return value;
}

function normalizeWorkItemId(rawWorkItemId, atomId) {
  const candidate = String(rawWorkItemId || '').trim();
  if (ATM_ID_PATTERN.test(candidate)) {
    return candidate;
  }
  if (ATM_ID_PATTERN.test(String(atomId || '').trim())) {
    return String(atomId).trim();
  }
  return 'ATM-CORE-0004';
}

function collectHostOnlyFields(source, sourcePaths) {
  const collected = {};
  for (const sourcePath of sourcePaths) {
    const value = getByPath(source, sourcePath);
    if (value !== undefined) {
      const key = sourcePath.split('.').slice(-1)[0];
      collected[key] = value;
    }
  }

  for (const [key, value] of Object.entries(source)) {
    if (!(key in collected) && HOST_FIELD_PATTERN.test(key)) {
      collected[key] = value;
    }
  }
  return collected;
}

function listFilesRecursive(baseDir) {
  if (!fs.existsSync(baseDir)) {
    return [];
  }
  const files = [];
  const stack = [baseDir];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const nextPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(nextPath);
      } else {
        files.push(nextPath);
      }
    }
  }
  return files;
}

function scanWorkbenchArtifacts(workbenchRoot) {
  const atomsRoot = path.join(workbenchRoot, 'atoms');
  const mapsRoot = path.join(workbenchRoot, 'maps');
  const atomArtifacts = listFilesRecursive(atomsRoot)
    .filter((filePath) => /\/reports\/.+\.json$/i.test(filePath.replace(/\\/g, '/')))
    .map((filePath) => rel(filePath));
  const mapArtifacts = listFilesRecursive(mapsRoot)
    .filter((filePath) => /\.json$/i.test(filePath))
    .map((filePath) => rel(filePath));
  return {
    atomArtifacts,
    mapArtifacts,
  };
}

function nowIso(input) {
  if (input) {
    return input;
  }
  return new Date().toISOString();
}

function compactTimestamp(isoValue) {
  return String(isoValue).replace(/[-:TZ.]/g, '').slice(0, 14);
}

function buildFinding(message, details = {}) {
  return {
    findingVersion: 'coverage-finding/v1',
    kind: 'coverage-finding',
    ruleId: 'usage-evidence-shadow',
    trigger: 'usage-evidence-shadow.mapping.validation',
    scope: 'tools_node/atm-adapter/usage-evidence-shadow.js',
    severity: 'block',
    action: 'fail',
    routeClass: 'blocker',
    routeHint: '補齊 usage-feedback 必填欄位；若來源格式漂移，請改跑 --lenient 產出 usage-feedback-skipped 並帶 skipReason。',
    message,
    details,
  };
}

function buildSkippedEvidence({
  sourcePath,
  createdAt,
  atomId,
  workItemId,
  sourceWorkItemId,
  reason,
  adapterPrivate,
}) {
  return {
    schemaId: 'atm.evidence.usageFeedbackSkipped',
    specVersion: '0.1.0',
    migration: {
      strategy: 'additive',
      fromVersion: null,
      notes: '3KLife strict-to-lenient fallback record for ATM-3-0014.',
    },
    evidenceId: `usage-feedback-skipped.${String(atomId || 'unknown').toLowerCase().replace(/[^a-z0-9.-]/g, '-')}.${compactTimestamp(createdAt)}`,
    workItemId,
    evidenceKind: 'metric',
    evidenceType: 'usage-feedback-skipped',
    summary: reason,
    artifactPaths: [rel(sourcePath)],
    createdAt,
    producedBy: '@3klife/usage-evidence-shadow',
    skipReason: reason,
    details: {
      feedbackSource: 'adapter',
      usageSignals: {
        sessions: 1,
        sourceWorkItemId: sourceWorkItemId || '',
        extras: {
          adopterPrivate: adapterPrivate || {},
        },
      },
    },
  };
}

function buildUsageEvidence({
  sourcePath,
  createdAt,
  atomId,
  workItemId,
  sourceWorkItemId,
  sessions,
  tokens,
  interactions,
  callerCount,
  subFunctions,
  adapterPrivate,
  artifactPaths,
}) {
  const safeSubFunctions = Array.isArray(subFunctions) && subFunctions.length > 0
    ? subFunctions
    : [{ symbol: 'normalizeCssColor', callerCount }];

  return {
    schemaId: 'atm.evidence.usageFeedback',
    specVersion: '0.1.0',
    migration: {
      strategy: 'none',
      fromVersion: null,
      notes: '3KLife usage-evidence shadow adapter payload.',
    },
    evidenceId: `usage-feedback.${String(atomId || 'unknown').toLowerCase().replace(/[^a-z0-9.-]/g, '-')}.${compactTimestamp(createdAt)}`,
    workItemId,
    evidenceKind: 'metric',
    evidenceType: 'usage-feedback',
    summary: `usage feedback collected for ${atomId} from 3KLife shadow adapter`,
    artifactPaths,
    createdAt,
    producedBy: '@3klife/usage-evidence-shadow',
    reproducibility: {
      replayable: true,
      replayCommand: [
        'node',
        'tools_node/atm-adapter/usage-evidence-shadow.js',
        '--source',
        rel(sourcePath),
        '--mode',
        'strict',
      ],
      inputs: [rel(sourcePath)],
      expectedArtifacts: artifactPaths,
      notes: 'Replay remaps the same source JSON through the deterministic mapping table.',
    },
    details: {
      feedbackSource: 'adapter',
      usageSignals: {
        sessions,
        tokens,
        interactions,
        sourceWorkItemId: sourceWorkItemId || '',
        atomId,
        callerCount,
        subFunctions: safeSubFunctions,
        extras: {
          adopterPrivate: adapterPrivate || {},
        },
      },
    },
  };
}

function checkMainBodyLeak(evidencePayload) {
  const disallowedTopLevel = [
    'hostContext',
    'adopterPrivate',
    'workspaceContext',
    'project',
    'engine',
    'cocos',
    'ucuf',
  ];
  const leaked = disallowedTopLevel.filter((key) => key in evidencePayload);
  if (leaked.length > 0) {
    return buildFinding('host-only fields leaked into payload main body', {
      leaked,
    });
  }
  return null;
}

function runAdapter(options) {
  const effective = Object.assign({
    source: '',
    output: '',
    mapping: DEFAULT_MAPPING_PATH,
    workbenchRoot: path.join(ROOT, 'atomic_workbench'),
    mode: 'strict',
    now: '',
  }, options || {});
  const sourcePath = path.resolve(effective.source);
  const mappingPath = path.resolve(effective.mapping);
  const source = readJson(sourcePath);
  const mapping = readJson(mappingPath);
  const findings = [];

  const sourceWorkItemId = String(
    firstPresent(source, ['workItemId', 'taskId']) || 'ATM-3-0014'
  ).trim();

  const atomId = normalizeAtomId(
    firstPresent(source, ['atomId', 'target.atomId']) || 'ATM-CORE-0004'
  );
  const workItemId = normalizeWorkItemId(sourceWorkItemId, atomId);

  const sessions = toInt(
    firstPresent(source, ['metrics.sessions', 'usageSignals.sessions', 'details.usageSignals.sessions']),
    NaN
  );
  if (!Number.isInteger(sessions) || sessions < 1) {
    findings.push(buildFinding('missing required sessions metric', {
      field: 'details.usageSignals.sessions',
      sourcePathsTried: ['metrics.sessions', 'usageSignals.sessions', 'details.usageSignals.sessions'],
    }));
  }

  const callerCount = toInt(
    firstPresent(source, ['metrics.callerCount', 'callerCount', 'usageSignals.callerCount']),
    NaN
  );
  if (!Number.isInteger(callerCount) || callerCount < 0) {
    findings.push(buildFinding('missing required callerCount metric', {
      field: 'details.usageSignals.callerCount',
      sourcePathsTried: ['metrics.callerCount', 'callerCount', 'usageSignals.callerCount'],
    }));
  }

  const tokens = Math.max(0, toInt(firstPresent(source, ['metrics.tokens', 'usageSignals.tokens']), 0));
  const interactions = Math.max(0, toInt(firstPresent(source, ['metrics.interactions', 'usageSignals.interactions']), 0));
  const subFunctionName = String(firstPresent(source, ['subFunction', 'exportSymbol', 'symbol']) || 'normalizeCssColor').trim();
  const createdAt = nowIso(effective.now);

  const hostOnly = collectHostOnlyFields(
    source,
    (mapping.hostOnlyRouting && Array.isArray(mapping.hostOnlyRouting.sourcePaths))
      ? mapping.hostOnlyRouting.sourcePaths
      : ['hostContext', 'adopterPrivate', 'workspaceContext']
  );

  const artifactScan = scanWorkbenchArtifacts(path.resolve(effective.workbenchRoot));
  const artifactPaths = [
    rel(sourcePath),
    ...artifactScan.atomArtifacts,
    ...artifactScan.mapArtifacts,
  ].slice(0, 20);

  let payload;
  if (findings.length > 0 && effective.mode === 'lenient') {
    const reason = `source format drift: ${findings.map((item) => item.message).join('; ')}`;
    payload = buildSkippedEvidence({
      sourcePath,
      createdAt,
      atomId,
      workItemId,
      sourceWorkItemId,
      reason,
      adapterPrivate: hostOnly,
    });
    findings.length = 0;
  } else if (findings.length > 0) {
    payload = null;
  } else {
    payload = buildUsageEvidence({
      sourcePath,
      createdAt,
      atomId,
      workItemId,
      sourceWorkItemId,
      sessions,
      tokens,
      interactions,
      callerCount,
      subFunctions: [{ symbol: subFunctionName, callerCount }],
      adapterPrivate: hostOnly,
      artifactPaths,
    });
    const leak = checkMainBodyLeak(payload);
    if (leak) {
      findings.push(leak);
    }
  }

  const report = {
    adapter: 'usage-evidence-shadow',
    mode: effective.mode,
    sourcePath: rel(sourcePath),
    mappingPath: rel(mappingPath),
    workbenchRoot: rel(path.resolve(effective.workbenchRoot)),
    passed: findings.length === 0,
    evidenceType: payload ? payload.evidenceType : '',
    findings,
    workbenchScan: {
      atomArtifactCount: artifactScan.atomArtifacts.length,
      mapArtifactCount: artifactScan.mapArtifacts.length,
    },
    payload,
  };

  if (effective.output) {
    writeJson(effective.output, report);
  }

  return report;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    return;
  }
  const report = runAdapter(opts);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.passed) {
    process.exit(1);
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`[usage-evidence-shadow] ${error.stack || error.message || error}`);
    process.exit(1);
  }
}

module.exports = {
  parseArgs,
  runAdapter,
  buildUsageEvidence,
  buildSkippedEvidence,
  scanWorkbenchArtifacts,
};
