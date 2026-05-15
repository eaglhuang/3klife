#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const { DEFAULT_H2U_WORKTREE_STATUS_FILE, resolveH2uGateConfig } = require('./lib/h2u-gate-defaults');

const ROOT = path.resolve(__dirname, '..');
const VALID_MODES = new Set(['dev', 'pr', 'release']);
const VALID_ATOMIZE_CONSENT = new Set(['ask', 'yes', 'no']);
const ATOMIZE_CODE_FILE_PATTERN = /\.(js|mjs|ts)$/i;
const ATOMIZE_IGNORED_PREFIXES = ['node_modules/', 'artifacts/', 'library/', 'temp/', '.git/'];

const H2U_PATH_PATTERNS = [
  /^tools_node\/lib\/html-to-ucuf\//i,
  /^tools_node\/run-html-to-ucuf-workflow\.js$/i,
  /^tools_node\/validate-html-to-ucuf-rule-guard\.js$/i,
  /^tools_node\/validate-legacy-h2u-launch\.js$/i,
  /^tools_node\/validate-legacy-h2u-first-win\.js$/i,
  /^tools_node\/lib\/dom-to-ui\//i,
  /^fixtures\/case-studies\/normalize-css-color\//i,
  /^assets\/resources\/ui-spec\/screens\/legacy-h2u-dryrun/i,
];

function parseArgs(argv) {
  const args = {
    mode: 'dev',
    fromMode: '',
    files: [],
    worktreeStatusFile: '',
    allowDirtyPrefixes: [],
    atomizeConsent: 'ask',
    json: false,
    shadow: false,
    metricsFile: '',
    report: '',
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = () => argv[++index] || '';

    if (token === '--mode') {
      args.mode = String(next() || '').trim().toLowerCase();
      continue;
    }
    if (token === '--from-mode') {
      args.fromMode = String(next() || '').trim().toLowerCase();
      continue;
    }
    if (token === '--worktree-status-file') {
      args.worktreeStatusFile = String(next() || '').trim();
      continue;
    }
    if (token === '--allow-dirty-prefix') {
      const value = String(next() || '').trim();
      if (value) args.allowDirtyPrefixes.push(value);
      continue;
    }
    if (token === '--atomize-consent') {
      args.atomizeConsent = String(next() || '').trim().toLowerCase();
      continue;
    }
    if (token === '--files') {
      index += 1;
      while (index < argv.length && !argv[index].startsWith('--')) {
        const value = String(argv[index] || '').trim();
        if (value) args.files.push(value);
        index += 1;
      }
      index -= 1;
      continue;
    }
    if (token === '--json') {
      args.json = true;
      continue;
    }
    if (token === '--shadow') {
      args.shadow = true;
      continue;
    }
    if (token === '--metrics-file') {
      args.metricsFile = String(next() || '').trim();
      continue;
    }
    if (token === '--report') {
      args.report = String(next() || '').trim();
      continue;
    }
    if (token === '--help' || token === '-h') {
      args.help = true;
      continue;
    }
    throw new Error(`unknown arg: ${token}`);
  }

  if (!VALID_MODES.has(args.mode)) {
    throw new Error(`invalid --mode: ${args.mode} (expected dev|pr|release)`);
  }
  if (!VALID_ATOMIZE_CONSENT.has(args.atomizeConsent)) {
    throw new Error(`invalid --atomize-consent: ${args.atomizeConsent} (expected ask|yes|no)`);
  }
  return args;
}

function printHelp() {
  console.log('Usage: node tools_node/atm-flow.js --mode <dev|pr|release> [options]');
  console.log('');
  console.log('Options:');
  console.log('  --from-mode <dev|pr|release>    Optional escalation hint.');
  console.log('  --files <path...>               Use explicit changed files instead of git status.');
  console.log(`  --worktree-status-file <path>   Use git status --short snapshot file (H2U default: ${DEFAULT_H2U_WORKTREE_STATUS_FILE}).`);
  console.log('  --allow-dirty-prefix <path>     Forwarded to H2U strict validators; default H2U lane auto-adds 3 exact legacy-h2u-dryrun files.');
  console.log('  --atomize-consent <ask|yes|no>  Oversize function atomization consent (default: ask).');
  console.log('  --json                          Print machine-readable report.');
  console.log('  --report <path>                 Write machine-readable report JSON.');
  console.log('  --shadow                        Shadow mode: do not hard-block process exit.');
  console.log('  --metrics-file <path>           Shadow metrics accumulator JSON path.');
}

function rel(filePath) {
  return path.relative(ROOT, path.resolve(filePath)).replace(/\\/g, '/');
}

function normalizePath(input) {
  return String(input || '').replace(/\\/g, '/');
}

function uniquePaths(items) {
  const seen = new Set();
  const out = [];
  for (const item of items || []) {
    const value = normalizePath(item).trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

function buildStatusSnapshotText(files) {
  const normalized = uniquePaths(files).map((filePath) => normalizePath(filePath));
  if (normalized.length === 0) {
    return '\n';
  }
  return `${normalized.map((filePath) => ` M ${filePath}`).join('\n')}\n`;
}

function parseGitStatusLines(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/\r/g, ''))
    .filter(Boolean)
    .map((line) => {
      const body = line.length > 3 ? line.slice(3).trim() : '';
      const renamed = body.includes(' -> ') ? body.split(' -> ').pop() : body;
      return normalizePath(renamed);
    })
    .filter(Boolean);
}

function readWorktreeStatusFromFile(inputPath) {
  const raw = String(inputPath || '').trim();
  if (!raw) {
    return {
      ok: false,
      source: 'worktree-status-file',
      error: 'worktree-status-file path missing',
      files: [],
      rawStatusOutput: '',
    };
  }
  const absolute = path.isAbsolute(raw) ? raw : path.resolve(ROOT, raw);
  try {
    const output = fs.readFileSync(absolute, 'utf8');
    return {
      ok: true,
      source: `worktree-status-file:${rel(absolute)}`,
      error: '',
      files: uniquePaths(parseGitStatusLines(output)),
      rawStatusOutput: output,
    };
  } catch (error) {
    return {
      ok: false,
      source: `worktree-status-file:${rel(absolute)}`,
      error: `cannot read worktree status file: ${String(error && (error.message || error) || 'unknown')}`,
      files: [],
      rawStatusOutput: '',
    };
  }
}

function detectChangedFiles(args) {
  if (Array.isArray(args.files) && args.files.length > 0) {
    const files = uniquePaths(args.files);
    return {
      ok: true,
      source: 'cli-files',
      error: '',
      files,
      rawStatusOutput: buildStatusSnapshotText(files),
    };
  }

  if (args.worktreeStatusFile) {
    return readWorktreeStatusFromFile(args.worktreeStatusFile);
  }

  const proc = cp.spawnSync('git', ['status', '--short'], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (typeof proc.status !== 'number' || proc.status !== 0 || proc.error) {
    const stderr = String(proc && proc.stderr || '').trim();
    const errMsg = String(proc && proc.error && (proc.error.message || proc.error) || '').trim();
    return {
      ok: false,
      source: 'git-status',
      error: errMsg || stderr || `git status exit=${proc.status}`,
      files: [],
      rawStatusOutput: '',
    };
  }
  return {
    ok: true,
    source: 'git-status',
    error: '',
    files: uniquePaths(parseGitStatusLines(proc.stdout || '')),
    rawStatusOutput: String(proc.stdout || ''),
  };
}

function prepareH2uGateConfig(args, areas, detection) {
  if (!areas.touchesH2U) {
    return {
      enabled: false,
      worktreeStatusFile: String(args.worktreeStatusFile || '').trim(),
      allowDirtyPrefixes: uniquePaths(args.allowDirtyPrefixes || []),
      defaultedStatusFile: false,
      snapshotGenerated: false,
      snapshotError: '',
    };
  }

  const defaultedStatusFile = !String(args.worktreeStatusFile || '').trim();
  const resolved = resolveH2uGateConfig({
    worktreeStatusFile: args.worktreeStatusFile,
    allowDirtyPrefixes: args.allowDirtyPrefixes,
  });
  const absoluteStatusFile = path.isAbsolute(resolved.worktreeStatusFile)
    ? resolved.worktreeStatusFile
    : path.resolve(ROOT, resolved.worktreeStatusFile);

  let snapshotGenerated = false;
  let snapshotError = '';
  if (defaultedStatusFile) {
    const statusSnapshot = String(detection && detection.rawStatusOutput || '').trim().length > 0
      ? String(detection.rawStatusOutput)
      : buildStatusSnapshotText(detection && detection.files ? detection.files : []);
    try {
      fs.mkdirSync(path.dirname(absoluteStatusFile), { recursive: true });
      fs.writeFileSync(absoluteStatusFile, statusSnapshot, 'utf8');
      snapshotGenerated = true;
    } catch (error) {
      snapshotError = String(error && (error.message || error) || 'cannot write default h2u worktree status snapshot');
    }
  }

  return {
    enabled: true,
    worktreeStatusFile: path.isAbsolute(resolved.worktreeStatusFile)
      ? rel(resolved.worktreeStatusFile)
      : normalizePath(resolved.worktreeStatusFile),
    allowDirtyPrefixes: resolved.allowDirtyPrefixes,
    defaultedStatusFile,
    snapshotGenerated,
    snapshotError,
  };
}

function classifyTouchedAreas(changedFiles) {
  const files = uniquePaths(changedFiles || []);
  const touchesTaskStore = files.some((filePath) => {
    const value = normalizePath(filePath);
    return value === 'docs/tasks/tasks-atm.json'
      || value.startsWith('docs/tasks/tasks-atm/')
      || value === 'docs/ai_atomic_framework/atm-evolution-plan-shards/atm-framework-stabilization-milestones.md'
      || value === 'tools_node/sync-atm-stabilization-milestone.js';
  });

  const touchesDocsTask = files.some((filePath) => {
    const value = normalizePath(filePath);
    return value.startsWith('docs/');
  });

  const touchesH2U = files.some((filePath) => H2U_PATH_PATTERNS.some((pattern) => pattern.test(normalizePath(filePath))));

  return {
    touchesTaskStore,
    touchesDocsTask,
    touchesH2U,
  };
}

function buildCommand(stepId, args, h2uGateConfig = null) {
  const node = process.execPath;
  const effectiveWorktreeStatusFile = h2uGateConfig && h2uGateConfig.enabled
    ? h2uGateConfig.worktreeStatusFile
    : args.worktreeStatusFile;
  const effectiveAllowDirtyPrefixes = h2uGateConfig && h2uGateConfig.enabled
    ? h2uGateConfig.allowDirtyPrefixes
    : (args.allowDirtyPrefixes || []);
  const worktreeArgs = effectiveWorktreeStatusFile
    ? ['--worktree-status-file', effectiveWorktreeStatusFile]
    : [];
  const allowDirtyArgs = [];
  for (const prefix of effectiveAllowDirtyPrefixes) {
    allowDirtyArgs.push('--allow-dirty-prefix', prefix);
  }
  const closeoutH2uArgs = h2uGateConfig && h2uGateConfig.enabled
    ? ['--include-h2u-live-rollout', ...worktreeArgs, ...allowDirtyArgs]
    : [];

  switch (stepId) {
    case 'compute-gate-quick':
      return [node, path.join(ROOT, 'tools_node', 'compute-gate.js'), '--profile', 'quick'];
    case 'compute-gate-standard':
      return [node, path.join(ROOT, 'tools_node', 'compute-gate.js'), '--profile', 'standard'];
    case 'validate-atm-task-store':
      return [node, path.join(ROOT, 'tools_node', 'sync-atm-stabilization-milestone.js'), '--check', '--strict'];
    case 'validate-atm-milestone':
      return [node, path.join(ROOT, 'tools_node', 'sync-atm-stabilization-milestone.js'), '--check', '--strict'];
    case 'validate-doc-shard-health':
      return [node, path.join(ROOT, 'tools_node', 'check-doc-shard-health.js')];
    case 'validate-h2u-rule-guard':
      return [node, path.join(ROOT, 'tools_node', 'validate-html-to-ucuf-rule-guard.js'), '--strict'];
    case 'validate-legacy-h2u-launch':
      return [
        node,
        path.join(ROOT, 'tools_node', 'validate-legacy-h2u-launch.js'),
        '--strict',
        '--require-worktree-check',
        ...worktreeArgs,
        ...allowDirtyArgs,
      ];
    case 'validate-legacy-h2u-first-win':
      return [
        node,
        path.join(ROOT, 'tools_node', 'validate-legacy-h2u-first-win.js'),
        '--strict',
        '--require-worktree-check',
        ...worktreeArgs,
        ...allowDirtyArgs,
      ];
    case 'validate-atm-stability-closeout':
      return [node, path.join(ROOT, 'tools_node', 'validate-atm-stability-closeout.js'), '--strict', ...closeoutH2uArgs];
    default:
      throw new Error(`unknown step id: ${stepId}`);
  }
}

function buildExecutionPlan(mode, areas) {
  const basePrSteps = [
    { id: 'compute-gate-standard', condition: true },
    { id: 'validate-atm-task-store', condition: true },
    { id: 'validate-legacy-h2u-launch', condition: !!areas.touchesH2U },
    { id: 'validate-doc-shard-health', condition: !!areas.touchesDocsTask },
  ];

  if (mode === 'dev') {
    return [
      { id: 'compute-gate-quick', condition: true },
      { id: 'validate-atm-task-store', condition: !!areas.touchesTaskStore },
      { id: 'validate-h2u-rule-guard', condition: !!areas.touchesH2U },
      { id: 'validate-doc-shard-health', condition: !!areas.touchesDocsTask },
    ];
  }

  if (mode === 'pr') {
    return basePrSteps;
  }

  if (mode === 'release') {
    return [
      ...basePrSteps,
      { id: 'validate-atm-milestone', condition: true },
      { id: 'validate-atm-stability-closeout', condition: true },
      { id: 'validate-legacy-h2u-first-win', condition: !!areas.touchesH2U },
    ];
  }

  throw new Error(`unsupported mode: ${mode}`);
}

function runCommand(command) {
  const startedAt = Date.now();
  const proc = cp.spawnSync(command[0], command.slice(1), {
    cwd: ROOT,
    encoding: 'utf8',
    shell: false,
  });
  const durationMs = Date.now() - startedAt;
  const status = typeof proc.status === 'number' ? proc.status : 1;
  const stdout = String(proc && proc.stdout || '');
  const stderr = String(proc && proc.stderr || '');
  const stdoutLines = stdout.split(/\r?\n/).filter(Boolean);
  const stderrLines = stderr.split(/\r?\n/).filter(Boolean);
  const error = proc.error ? String(proc.error.message || proc.error) : '';
  return {
    status,
    passed: status === 0 && !error,
    durationMs,
    stdoutTail: stdoutLines.slice(-12),
    stderrTail: stderrLines.slice(-12),
    error,
  };
}

function buildStepGuide(stepId, h2uGateConfig = null) {
  const h2uExtra = [];
  if (h2uGateConfig && h2uGateConfig.enabled && h2uGateConfig.worktreeStatusFile) {
    h2uExtra.push(`--worktree-status-file ${h2uGateConfig.worktreeStatusFile}`);
  }
  if (h2uGateConfig && h2uGateConfig.enabled) {
    for (const prefix of h2uGateConfig.allowDirtyPrefixes || []) {
      h2uExtra.push(`--allow-dirty-prefix ${prefix}`);
    }
  }
  const h2uSuffix = h2uExtra.length > 0 ? ` ${h2uExtra.join(' ')}` : '';
  const closeoutH2uSuffix = h2uGateConfig && h2uGateConfig.enabled
    ? ` --include-h2u-live-rollout${h2uSuffix}`
    : '';

  switch (stepId) {
    case 'compute-gate-quick':
      return 'node tools_node/compute-gate.js --profile quick';
    case 'compute-gate-standard':
      return 'node tools_node/compute-gate.js --profile standard';
    case 'validate-atm-task-store':
      return 'node tools_node/sync-atm-stabilization-milestone.js --check --strict';
    case 'validate-atm-milestone':
      return 'node tools_node/sync-atm-stabilization-milestone.js --check --strict';
    case 'validate-doc-shard-health':
      return 'node tools_node/check-doc-shard-health.js';
    case 'validate-h2u-rule-guard':
      return 'node tools_node/validate-html-to-ucuf-rule-guard.js --strict';
    case 'validate-legacy-h2u-launch':
      return `node tools_node/validate-legacy-h2u-launch.js --strict --require-worktree-check${h2uSuffix}`;
    case 'validate-legacy-h2u-first-win':
      return `node tools_node/validate-legacy-h2u-first-win.js --strict --require-worktree-check${h2uSuffix}`;
    case 'validate-atm-stability-closeout':
      return `node tools_node/validate-atm-stability-closeout.js --strict${closeoutH2uSuffix}`;
    default:
      return '';
  }
}

function writeJsonFile(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function countFileLines(filePath) {
  try {
    const source = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
    return source.split(/\r?\n/).length;
  } catch (_) {
    return 0;
  }
}

function isAtomizeCodeFile(filePath) {
  const normalized = normalizePath(filePath);
  if (!ATOMIZE_CODE_FILE_PATTERN.test(normalized)) return false;
  return !ATOMIZE_IGNORED_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function isInteractivePromptAllowed(args) {
  if (args.json) return false;
  return Boolean(process.stdin && process.stdin.isTTY && process.stdout && process.stdout.isTTY);
}

function shouldEnableAtomizationAdvisor(args) {
  if (args.mode !== 'dev') return false;
  if (args.atomizeConsent === 'no') return false;
  if (args.atomizeConsent === 'yes') return true;
  return isInteractivePromptAllowed(args);
}

function readOneLineFromStdin() {
  const chunks = [];
  const buffer = Buffer.alloc(1024);
  const fd = process.stdin && Number.isInteger(process.stdin.fd) ? process.stdin.fd : 0;
  try {
    while (true) {
      const bytes = fs.readSync(fd, buffer, 0, buffer.length, null);
      if (!bytes || bytes <= 0) break;
      const part = buffer.toString('utf8', 0, bytes);
      chunks.push(part);
      if (part.includes('\n')) break;
      if (chunks.join('').length > 4096) break;
    }
  } catch (_) {
    return '';
  }
  return chunks.join('');
}

function normalizeConsentAnswer(answer) {
  const value = String(answer || '').trim().toLowerCase();
  if (value === 'y' || value === 'yes') return 'yes';
  if (value === 'n' || value === 'no') return 'no';
  return 'no';
}

function askAtomizeConsent(question) {
  process.stdout.write(`${question} [y/N]: `);
  const raw = readOneLineFromStdin();
  const normalized = normalizeConsentAnswer(raw);
  return {
    answer: normalized,
    accepted: normalized === 'yes',
    raw: String(raw || '').trim(),
  };
}

function buildAtomizationProbe(changedFiles) {
  const codeFiles = uniquePaths(changedFiles || [])
    .filter((filePath) => isAtomizeCodeFile(filePath))
    .map((filePath) => path.resolve(ROOT, filePath))
    .filter((filePath) => fs.existsSync(filePath));

  if (codeFiles.length === 0) {
    return {
      ok: true,
      triggered: false,
      reason: 'no-eligible-code-files',
      codeFiles: [],
      sourceFiles: [],
      candidateCount: 0,
      blockReleaseCandidates: [],
      oversizedFiles: [],
      thresholds: {
        functionLinesBlockRelease: 250,
        fileLinesBlockRelease: 400,
      },
      scanReportPath: '',
      scanReportAbsPath: '',
    };
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = path.join(ROOT, 'artifacts', 'atm-atomize', 'auto-consent');
  const scanReportAbsPath = path.join(outDir, `scan-${timestamp}.json`);

  try {
    const { runScan } = require('./atm-atomize');
    const scanReport = runScan({
      command: 'scan',
      files: codeFiles,
      changed: false,
      report: scanReportAbsPath,
      candidateReport: scanReportAbsPath,
      workbenchRoot: path.join(ROOT, 'atomic_workbench'),
      strict: false,
      json: true,
      help: false,
      policy: null,
      policyHook: null,
      registryPath: null,
      usageRefFile: null,
      capsuleId: '',
      targetTier: '',
    });

    const functionThreshold = Number(scanReport && scanReport.thresholds && scanReport.thresholds.functionLinesBlockRelease || 250);
    const fileThreshold = 400;
    const sourceFiles = codeFiles
      .map((absPath) => ({
        file: rel(absPath),
        lineCountBefore: countFileLines(absPath),
      }))
      .sort((a, b) => b.lineCountBefore - a.lineCountBefore);
    const blockReleaseCandidates = Array.isArray(scanReport && scanReport.candidates)
      ? scanReport.candidates
        .filter((item) => item && item.severity === 'block-release')
        .map((item) => ({
          symbolName: String(item.symbolName || ''),
          file: String(item.file || ''),
          lineCount: Number(item.lineCount || 0),
          startLine: Number(item.sourceRange && item.sourceRange.startLine || 0),
          endLine: Number(item.sourceRange && item.sourceRange.endLine || 0),
          tier: String(item.tier || ''),
          recommendedTier: String(item.recommendedTier || ''),
        }))
        .sort((a, b) => b.lineCount - a.lineCount)
      : [];

    const oversizedFiles = sourceFiles
      .map((item) => ({
        file: item.file,
        lineCount: item.lineCountBefore,
      }))
      .filter((item) => item.lineCount > fileThreshold)
      .sort((a, b) => b.lineCount - a.lineCount);

    return {
      ok: true,
      triggered: blockReleaseCandidates.length > 0 || oversizedFiles.length > 0,
      reason: '',
      codeFiles: codeFiles.map(rel),
      sourceFiles,
      candidateCount: Number(scanReport && scanReport.candidateCount || 0),
      blockReleaseCandidates,
      oversizedFiles,
      thresholds: {
        functionLinesBlockRelease: functionThreshold,
        fileLinesBlockRelease: fileThreshold,
      },
      scanReportPath: rel(scanReportAbsPath),
      scanReportAbsPath,
    };
  } catch (error) {
    return {
      ok: false,
      triggered: false,
      reason: String(error && (error.message || error) || 'atomize-scan-failed'),
      codeFiles: codeFiles.map(rel),
      sourceFiles: codeFiles.map((filePath) => ({
        file: rel(filePath),
        lineCountBefore: countFileLines(filePath),
      })),
      candidateCount: 0,
      blockReleaseCandidates: [],
      oversizedFiles: [],
      thresholds: {
        functionLinesBlockRelease: 250,
        fileLinesBlockRelease: 400,
      },
      scanReportPath: rel(scanReportAbsPath),
      scanReportAbsPath,
    };
  }
}

function runAtomizationPipeline(probe) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = path.join(ROOT, 'artifacts', 'atm-atomize', 'auto-consent');
  const scaffoldPath = path.join(outDir, `scaffold-${timestamp}.report.json`);
  const validatePath = path.join(outDir, `validate-${timestamp}.report.json`);
  const demandPolicePath = path.join(outDir, `demand-police-${timestamp}.report.json`);

  try {
    const { runScaffold, runValidate, runDemandPolice } = require('./atm-atomize');
    const scaffoldReport = runScaffold({
      command: 'scaffold',
      candidateReport: probe.scanReportAbsPath,
      report: probe.scanReportAbsPath,
      workbenchRoot: path.join(ROOT, 'atomic_workbench'),
      strict: false,
      json: true,
      help: false,
      policy: null,
      policyHook: null,
      registryPath: null,
      usageRefFile: null,
      capsuleId: '',
      targetTier: '',
    });
    const validateReport = runValidate({
      command: 'validate',
      workbenchRoot: path.join(ROOT, 'atomic_workbench'),
      strict: false,
      json: true,
      help: false,
      policy: null,
      policyHook: null,
      registryPath: null,
      usageRefFile: null,
      capsuleId: '',
      targetTier: '',
    });
    const demandPoliceReport = runDemandPolice({
      command: 'demand-police',
      workbenchRoot: path.join(ROOT, 'atomic_workbench'),
      strict: false,
      json: true,
      help: false,
      policy: null,
      policyHook: null,
      registryPath: null,
      usageRefFile: null,
      capsuleId: '',
      targetTier: '',
    });

    writeJsonFile(scaffoldPath, scaffoldReport);
    writeJsonFile(validatePath, validateReport);
    writeJsonFile(demandPolicePath, demandPoliceReport);

    const passed = Boolean(validateReport && validateReport.passed !== false)
      && Boolean(demandPoliceReport && demandPoliceReport.passed !== false);
    const sourceSize = Array.isArray(probe && probe.sourceFiles)
      ? probe.sourceFiles.map((item) => {
        const after = countFileLines(path.resolve(ROOT, item.file));
        return {
          file: item.file,
          lineCountBefore: Number(item.lineCountBefore || 0),
          lineCountAfter: after,
          deltaLines: after - Number(item.lineCountBefore || 0),
        };
      })
      : [];
    const sourceChanged = sourceSize.filter((item) => item.deltaLines !== 0);
    const totalDeltaLines = sourceSize.reduce((sum, item) => sum + Number(item.deltaLines || 0), 0);

    return {
      ran: true,
      passed,
      error: '',
      paths: {
        scaffold: rel(scaffoldPath),
        validate: rel(validatePath),
        demandPolice: rel(demandPolicePath),
      },
      summary: {
        createdCapsules: Number(scaffoldReport && scaffoldReport.created && scaffoldReport.created.length || 0),
        createdAnchors: Number(scaffoldReport && scaffoldReport.createdAnchors && scaffoldReport.createdAnchors.length || 0),
        validationFailures: Number(validateReport && validateReport.failed || 0),
        demandFindings: Number(demandPoliceReport && demandPoliceReport.findings && demandPoliceReport.findings.length || 0),
        outputRoots: {
          capsules: 'atomic_workbench/capsules',
          anchors: 'atomic_workbench/anchors',
        },
        sourceSize: {
          checkedFileCount: sourceSize.length,
          changedFileCount: sourceChanged.length,
          totalDeltaLines,
          files: sourceSize,
        },
      },
    };
  } catch (error) {
    return {
      ran: true,
      passed: false,
      error: String(error && (error.message || error) || 'atomization-pipeline-failed'),
      paths: {
        scaffold: rel(scaffoldPath),
        validate: rel(validatePath),
        demandPolice: rel(demandPolicePath),
      },
      summary: {
        createdCapsules: 0,
        createdAnchors: 0,
        validationFailures: 0,
        demandFindings: 0,
        outputRoots: {
          capsules: 'atomic_workbench/capsules',
          anchors: 'atomic_workbench/anchors',
        },
        sourceSize: {
          checkedFileCount: 0,
          changedFileCount: 0,
          totalDeltaLines: 0,
          files: [],
        },
      },
    };
  }
}

function maybeRunAtomizationAdvisor(args, changedFiles) {
  if (!shouldEnableAtomizationAdvisor(args)) {
    return {
      enabled: false,
      status: args.mode !== 'dev'
        ? 'disabled-outside-dev'
        : (args.atomizeConsent === 'no' ? 'disabled-by-consent' : 'disabled-non-interactive'),
      probe: null,
      consent: null,
      pipeline: null,
    };
  }

  const probe = buildAtomizationProbe(changedFiles);
  if (!probe.ok) {
    return {
      enabled: true,
      status: 'probe-failed',
      probe,
      consent: null,
      pipeline: null,
    };
  }

  if (!probe.triggered) {
    return {
      enabled: true,
      status: 'no-trigger',
      probe,
      consent: null,
      pipeline: null,
    };
  }

  let consent = {
    mode: args.atomizeConsent,
    prompted: false,
    answer: args.atomizeConsent,
    accepted: args.atomizeConsent === 'yes',
  };

  if (args.atomizeConsent === 'ask') {
    const topFn = probe.blockReleaseCandidates.slice(0, 3).map((item) => `${item.symbolName} (${item.lineCount} lines @ ${item.file}:${item.startLine}-${item.endLine})`);
    const topFiles = probe.oversizedFiles.slice(0, 3).map((item) => `${item.file} (${item.lineCount} lines)`);
    const hints = [];
    if (topFn.length > 0) hints.push(`large functions: ${topFn.join('; ')}`);
    if (topFiles.length > 0) hints.push(`large files: ${topFiles.join('; ')}`);
    console.log(`[atm-flow] atomize-advisor detected oversize surfaces (${hints.join(' | ')})`);
    consent = {
      mode: 'ask',
      prompted: true,
      ...askAtomizeConsent('Trigger ATM atomization now (scan -> scaffold -> validate -> demand-police)?'),
    };
  }

  if (!consent.accepted) {
    return {
      enabled: true,
      status: 'declined',
      probe,
      consent,
      pipeline: null,
    };
  }

  const pipeline = runAtomizationPipeline(probe);
  return {
    enabled: true,
    status: pipeline.passed ? 'triggered' : 'triggered-with-issues',
    probe,
    consent,
    pipeline,
  };
}

function percentile(values, ratio) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));
  return sorted[index];
}

function updateShadowMetrics(metricsPath, report) {
  const absolute = path.isAbsolute(metricsPath) ? metricsPath : path.resolve(ROOT, metricsPath);
  let current = {
    schemaVersion: 'atm-flow-shadow-metrics/v1',
    runs: [],
  };
  try {
    if (fs.existsSync(absolute)) {
      current = JSON.parse(fs.readFileSync(absolute, 'utf8').replace(/^\uFEFF/, ''));
      if (!current || typeof current !== 'object') {
        current = { schemaVersion: 'atm-flow-shadow-metrics/v1', runs: [] };
      }
      if (!Array.isArray(current.runs)) current.runs = [];
    }
  } catch (_) {
    current = { schemaVersion: 'atm-flow-shadow-metrics/v1', runs: [] };
  }

  const runRecord = {
    mode: report.mode,
    timestamp: report.finishedAt,
    passed: report.passed,
    totalDurationMs: report.summary.totalDurationMs,
    failedStepIds: report.summary.failedStepIds,
  };
  current.runs.push(runRecord);

  const durations = current.runs.map((item) => Number(item.totalDurationMs || 0)).filter((value) => value >= 0);
  const failureMap = new Map();
  for (const run of current.runs) {
    for (const stepId of run.failedStepIds || []) {
      failureMap.set(stepId, Number(failureMap.get(stepId) || 0) + 1);
    }
  }

  current.aggregate = {
    runCount: current.runs.length,
    passCount: current.runs.filter((item) => item.passed).length,
    failCount: current.runs.filter((item) => !item.passed).length,
    averageDurationMs: durations.length > 0
      ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)
      : 0,
    p95DurationMs: percentile(durations, 0.95),
    topFailedSteps: [...failureMap.entries()]
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    falsePositiveRate: null,
    falsePositiveRateHint: '需在 triage 流程人工標記後再計算',
  };

  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, `${JSON.stringify(current, null, 2)}\n`, 'utf8');
  return {
    path: rel(absolute),
    aggregate: current.aggregate,
  };
}

function createEscalationCheck(mode, fromMode) {
  if (!fromMode) {
    return {
      provided: false,
      valid: true,
      message: '',
    };
  }
  if (!VALID_MODES.has(fromMode)) {
    return {
      provided: true,
      valid: false,
      message: `invalid --from-mode: ${fromMode}`,
    };
  }
  if (mode === 'dev') {
    return {
      provided: true,
      valid: true,
      message: '',
    };
  }
  if (mode === 'pr' && fromMode !== 'dev') {
    return {
      provided: true,
      valid: false,
      message: 'mode=pr requires --from-mode dev',
    };
  }
  if (mode === 'release' && fromMode !== 'pr') {
    return {
      provided: true,
      valid: false,
      message: 'mode=release requires --from-mode pr',
    };
  }
  return {
    provided: true,
    valid: true,
    message: '',
  };
}

function buildUserFacingSummary(report) {
  const failedStep = report.steps.find((step) => !step.passed && !step.skipped);
  if (!report.passed && failedStep) {
    return {
      blockedAt: failedStep.id,
      why: failedStep.reason || failedStep.error || `step failed: ${failedStep.id}`,
      nextCommand: failedStep.guideCommand || '',
    };
  }

  if (!report.passed && report.precheck && !report.precheck.passed) {
    return {
      blockedAt: report.precheck.id,
      why: report.precheck.reason,
      nextCommand: report.precheck.nextCommand,
    };
  }

  if (
    report.mode === 'dev'
    && report.atomizationAdvisor
    && report.atomizationAdvisor.enabled
    && report.atomizationAdvisor.status === 'declined'
  ) {
    return {
      blockedAt: '',
      why: 'Oversize code was detected; atomization was skipped because consent was not granted.',
      nextCommand: 'npm run atm:flow -- --mode dev --atomize-consent yes',
    };
  }

  if (report.mode === 'dev') {
    return {
      blockedAt: '',
      why: '全部綠燈，可升級到 PR 層檢查',
      nextCommand: 'npm run atm:flow -- --mode pr --from-mode dev',
    };
  }
  if (report.mode === 'pr') {
    return {
      blockedAt: '',
      why: 'PR 層檢查通過，可升級到 Release 層',
      nextCommand: 'npm run atm:flow -- --mode release --from-mode pr',
    };
  }
  return {
    blockedAt: '',
    why: 'Release 層檢查通過，可進入合併/發版流程',
    nextCommand: '',
  };
}

function runFlow(args) {
  const startedAt = new Date().toISOString();
  const startMs = Date.now();
  const detection = detectChangedFiles(args);
  const escalation = createEscalationCheck(args.mode, args.fromMode);

  const precheckFailures = [];
  if (!escalation.valid) {
    precheckFailures.push({
      id: 'escalation-check',
      reason: escalation.message,
      nextCommand: args.mode === 'pr'
        ? 'npm run atm:flow -- --mode pr --from-mode dev'
        : 'npm run atm:flow -- --mode release --from-mode pr',
    });
  }

  if (!detection.ok && args.mode !== 'dev') {
    precheckFailures.push({
      id: 'changed-file-detection',
      reason: `cannot resolve changed files (${detection.error || detection.source})`,
      nextCommand: 'git status --short > artifacts/legacy-h2u-first-win/worktree-status.txt',
    });
  }

  if (precheckFailures.length > 0) {
    const primary = precheckFailures[0];
    const failedReport = {
      tool: 'atm-flow',
      mode: args.mode,
      startedAt,
      finishedAt: new Date().toISOString(),
      changedFiles: detection.files,
      changedFilesSource: detection.source,
      changedFilesError: detection.error || '',
      atomizationAdvisor: {
        enabled: false,
        status: 'skipped-by-precheck-failure',
        probe: null,
        consent: null,
        pipeline: null,
      },
      areas: classifyTouchedAreas([]),
      escalation,
      precheck: {
        passed: false,
        id: primary.id,
        reason: primary.reason,
        nextCommand: primary.nextCommand,
      },
      steps: [],
      summary: {
        totalDurationMs: Date.now() - startMs,
        passedStepCount: 0,
        failedStepCount: 0,
        skippedStepCount: 0,
        failedStepIds: [],
      },
      passed: false,
      enforcedPassed: args.shadow ? true : false,
      shadow: {
        enabled: !!args.shadow,
      },
    };
    failedReport.userFacing = buildUserFacingSummary(failedReport);
    return failedReport;
  }

  const changedFiles = detection.ok ? detection.files : [];
  const atomizationAdvisor = maybeRunAtomizationAdvisor(args, changedFiles);
  const areas = classifyTouchedAreas(changedFiles);
  const h2uGateConfig = prepareH2uGateConfig(args, areas, detection);
  const plan = buildExecutionPlan(args.mode, areas);
  const steps = [];

  for (const planned of plan) {
    if (!planned.condition) {
      steps.push({
        id: planned.id,
        skipped: true,
        passed: true,
        status: 0,
        durationMs: 0,
        reason: 'not-required-by-changed-surface',
        guideCommand: buildStepGuide(planned.id),
      });
      continue;
    }

    const command = buildCommand(planned.id, args, h2uGateConfig);
    const run = runCommand(command);
    steps.push({
      id: planned.id,
      skipped: false,
      passed: run.passed,
      status: run.status,
      durationMs: run.durationMs,
      reason: run.passed ? '' : 'command-failed',
      error: run.error || '',
      command: command.map((item) => normalizePath(item)).join(' '),
      guideCommand: buildStepGuide(planned.id, h2uGateConfig),
      stdoutTail: run.stdoutTail,
      stderrTail: run.stderrTail,
    });
  }

  const passedStepCount = steps.filter((step) => step.passed && !step.skipped).length;
  const failedSteps = steps.filter((step) => !step.passed && !step.skipped);
  const skippedStepCount = steps.filter((step) => step.skipped).length;
  const totalDurationMs = Date.now() - startMs;

  const report = {
    tool: 'atm-flow',
    mode: args.mode,
    startedAt,
    finishedAt: new Date().toISOString(),
    changedFiles,
    changedFilesSource: detection.source,
    changedFilesError: detection.error || '',
    atomizationAdvisor,
    areas,
    h2uWorktreeGate: h2uGateConfig,
    escalation,
    steps,
    summary: {
      totalDurationMs,
      passedStepCount,
      failedStepCount: failedSteps.length,
      skippedStepCount,
      failedStepIds: failedSteps.map((step) => step.id),
    },
    passed: failedSteps.length === 0,
    enforcedPassed: args.shadow ? true : failedSteps.length === 0,
    shadow: {
      enabled: !!args.shadow,
    },
  };

  if (args.shadow && args.metricsFile) {
    report.shadow.metrics = updateShadowMetrics(args.metricsFile, report);
  }
  report.userFacing = buildUserFacingSummary(report);
  return report;
}

function printHumanReadable(report) {
  const indicator = report.enforcedPassed ? 'PASS' : 'FAIL';
  console.log(`[atm-flow] mode=${report.mode} status=${indicator} shadow=${report.shadow && report.shadow.enabled ? 'on' : 'off'}`);
  console.log(`[atm-flow] changedSource=${report.changedFilesSource} files=${(report.changedFiles || []).length}`);
  if (report.changedFilesError) {
    console.warn(`[atm-flow] changedSourceError=${report.changedFilesError}`);
  }
  for (const step of report.steps || []) {
    if (step.skipped) {
      console.log(`[atm-flow] - ${step.id}: SKIP (${step.reason})`);
      continue;
    }
    console.log(`[atm-flow] - ${step.id}: ${step.passed ? 'PASS' : 'FAIL'} (${step.durationMs}ms)`);
  }

  if (report.atomizationAdvisor && report.atomizationAdvisor.enabled) {
    const advisor = report.atomizationAdvisor;
    console.log(`[atm-flow] atomize-advisor=${advisor.status}`);
    if (advisor.probe && advisor.probe.triggered) {
      console.log(`[atm-flow] atomize-advisor trigger: function>${advisor.probe.thresholds.functionLinesBlockRelease} or file>${advisor.probe.thresholds.fileLinesBlockRelease}`);
      console.log(
        `[atm-flow] atomize-advisor scan-summary: candidates=${Number(advisor.probe.candidateCount || 0)} `
        + `block-release=${Array.isArray(advisor.probe.blockReleaseCandidates) ? advisor.probe.blockReleaseCandidates.length : 0} `
        + `oversized-files=${Array.isArray(advisor.probe.oversizedFiles) ? advisor.probe.oversizedFiles.length : 0}`
      );
      if (advisor.probe.scanReportPath) {
        console.log(`[atm-flow] atomize-advisor scan=${advisor.probe.scanReportPath}`);
      }
    }
    if (advisor.pipeline && advisor.pipeline.ran) {
      console.log(`[atm-flow] atomize-advisor pipeline=${advisor.pipeline.passed ? 'PASS' : 'FAIL'}`);
      if (advisor.pipeline.summary) {
        console.log(
          `[atm-flow] atomize-advisor generated: capsules=${Number(advisor.pipeline.summary.createdCapsules || 0)} `
          + `anchors=${Number(advisor.pipeline.summary.createdAnchors || 0)} `
          + `validation-failures=${Number(advisor.pipeline.summary.validationFailures || 0)} `
          + `demand-findings=${Number(advisor.pipeline.summary.demandFindings || 0)}`
        );
        if (advisor.pipeline.summary.outputRoots) {
          console.log(
            `[atm-flow] atomize-advisor output-dirs: `
            + `${advisor.pipeline.summary.outputRoots.capsules}, `
            + `${advisor.pipeline.summary.outputRoots.anchors}`
          );
        }
        const sourceSize = advisor.pipeline.summary.sourceSize || null;
        if (sourceSize) {
          console.log(
            `[atm-flow] atomize-advisor source-size: checked=${Number(sourceSize.checkedFileCount || 0)} `
            + `changed=${Number(sourceSize.changedFileCount || 0)} `
            + `total-delta-lines=${Number(sourceSize.totalDeltaLines || 0)}`
          );
          if (Array.isArray(sourceSize.files)) {
            const changedTop = sourceSize.files
              .filter((item) => Number(item.deltaLines || 0) !== 0)
              .sort((a, b) => Math.abs(Number(b.deltaLines || 0)) - Math.abs(Number(a.deltaLines || 0)))
              .slice(0, 3);
            for (const item of changedTop) {
              const sign = Number(item.deltaLines || 0) > 0 ? '+' : '';
              console.log(`[atm-flow] atomize-advisor source-delta: ${item.file} ${item.lineCountBefore} -> ${item.lineCountAfter} (${sign}${item.deltaLines})`);
            }
          }
        }
      }
      if (advisor.pipeline.paths) {
        console.log(`[atm-flow] atomize-advisor scaffold=${advisor.pipeline.paths.scaffold}`);
        console.log(`[atm-flow] atomize-advisor validate=${advisor.pipeline.paths.validate}`);
        console.log(`[atm-flow] atomize-advisor demand-police=${advisor.pipeline.paths.demandPolice}`);
      }
      if (advisor.pipeline.error) {
        console.warn(`[atm-flow] atomize-advisor error=${advisor.pipeline.error}`);
      }
    }
  }

  console.log('');
  console.log('現在卡哪裡:');
  console.log(report.userFacing && report.userFacing.blockedAt ? report.userFacing.blockedAt : '無（全部通過）');
  console.log('');
  console.log('為什麼:');
  console.log(report.userFacing && report.userFacing.why ? report.userFacing.why : 'n/a');
  console.log('');
  console.log('下一步命令:');
  console.log(report.userFacing && report.userFacing.nextCommand ? report.userFacing.nextCommand : '(無)');
}

function writeReportIfNeeded(reportPath, report) {
  if (!reportPath) return '';
  const absolute = path.isAbsolute(reportPath) ? reportPath : path.resolve(ROOT, reportPath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return rel(absolute);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const report = runFlow(args);
  const reportPath = writeReportIfNeeded(args.report, report);
  if (args.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    printHumanReadable(report);
  }
  if (reportPath) {
    console.log(`[atm-flow] report=${reportPath}`);
  }

  process.exit(report.enforcedPassed ? 0 : 1);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`[atm-flow] ${error && (error.stack || error.message) || error}`);
    process.exit(1);
  }
}

module.exports = {
  parseArgs,
  parseGitStatusLines,
  detectChangedFiles,
  prepareH2uGateConfig,
  classifyTouchedAreas,
  buildExecutionPlan,
  buildCommand,
  buildStepGuide,
  runFlow,
  createEscalationCheck,
};
