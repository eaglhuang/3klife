#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const vm = require('node:vm');
const { runTaskStoreTruthPipeline } = require('./sync-atm-stabilization-milestone');
const { runValidation: runH2uEvolutionValidation } = require('./validate-h2u-evolution-pilot');
const { runRuleGuard } = require('./lib/html-to-ucuf/rule-guard');
const { inspectH2uWorktreeIsolation } = require('./lib/h2u-worktree-isolation');

const ROOT = path.resolve(__dirname, '..');
const WORKFLOW_ENTRY = path.join(ROOT, 'tools_node', 'run-html-to-ucuf-workflow.js');
const WORKFLOW_MODULE_DIR = path.join(ROOT, 'tools_node', 'lib', 'html-to-ucuf', 'workflow');
const DEFAULT_CANONICAL_EVIDENCE = [
  'tools_node/lib/dom-to-ui/draft-builder.js',
  'fixtures/case-studies/normalize-css-color/v1.0.json',
  'fixtures/case-studies/normalize-css-color/v1.1.json',
  'fixtures/case-studies/normalize-css-color/proposal.json',
  'fixtures/case-studies/normalize-css-color/decision-approve.json',
];
const LOCAL_ATOMIC_EVIDENCE = [
  'atomic-registry.json',
  'atomic_workbench/atoms/ATM-CORE-0005/atom.source.mjs',
  'atomic_workbench/atoms/ATM-CORE-0005/atom.test.mjs',
  'atomic_workbench/atoms/ATM-CORE-0006/atom.source.mjs',
  'atomic_workbench/atoms/ATM-CORE-0006/atom.test.mjs',
  'atomic_workbench/atoms/ATM-CORE-0007/atom.source.mjs',
  'atomic_workbench/atoms/ATM-CORE-0007/atom.test.mjs',
  'atomic_workbench/maps/ATM-MAP-0003/map.spec.json',
  'atomic_workbench/maps/ATM-MAP-0003/map.integration.test.mjs',
];
const LOCAL_ATOMIC_IDS = ['ATM-CORE-0005', 'ATM-CORE-0006', 'ATM-CORE-0007', 'ATM-MAP-0003'];

function parseArgs(argv) {
  const parsed = {
    strict: false,
    report: null,
    ruleGuardReport: null,
    worktreeStatusFile: null,
    baselineWorktreeStatusFile: null,
    statusSnapshotOut: null,
    allowDirtyPrefixes: [],
    requireWorktreeCheck: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--strict') {
      parsed.strict = true;
      continue;
    }
    if (token === '--report') {
      parsed.report = argv[index + 1] || null;
      index += 1;
      continue;
    }
    if (token === '--rule-guard-report') {
      parsed.ruleGuardReport = argv[index + 1] || null;
      index += 1;
      continue;
    }
    if (token === '--worktree-status-file') {
      parsed.worktreeStatusFile = argv[index + 1] || null;
      index += 1;
      continue;
    }
    if (token === '--baseline-worktree-status-file') {
      parsed.baselineWorktreeStatusFile = argv[index + 1] || null;
      index += 1;
      continue;
    }
    if (token === '--status-snapshot-out') {
      parsed.statusSnapshotOut = argv[index + 1] || null;
      index += 1;
      continue;
    }
    if (token === '--allow-dirty-prefix') {
      const value = argv[index + 1] || '';
      index += 1;
      if (value) {
        parsed.allowDirtyPrefixes.push(value);
      }
      continue;
    }
    if (token === '--require-worktree-check') {
      parsed.requireWorktreeCheck = true;
      continue;
    }
    if (token === '--help' || token === '-h') {
      parsed.help = true;
      continue;
    }
    throw new Error(`unknown arg: ${token}`);
  }

  return parsed;
}

function printHelp() {
  console.log('Usage: node tools_node/validate-legacy-h2u-launch.js [--strict] [--report <json>] [--rule-guard-report <json>] [--worktree-status-file <txt>] [--baseline-worktree-status-file <txt>] [--status-snapshot-out <txt>] [--allow-dirty-prefix <path>] [--require-worktree-check]');
  console.log('');
  console.log('Validates the H2U first-battle launch gates for Legacy challenge kickoff.');
}

function rel(filePath) {
  return path.relative(ROOT, path.resolve(filePath)).replace(/\\/g, '/');
}

function normalizePath(input) {
  return String(input || '').replace(/\\/g, '/');
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

function runGitStatusShort() {
  const proc = cp.spawnSync('git', ['status', '--short'], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return proc;
}

function readWorktreeStatusFromFile(inputPath) {
  const raw = String(inputPath || '').trim();
  if (!raw) {
    return {
      ok: false,
      error: 'worktree-status-file path missing',
      method: 'status-file',
      dirtyFiles: [],
    };
  }
  const absolute = path.isAbsolute(raw) ? raw : path.resolve(ROOT, raw);
  try {
    const output = fs.readFileSync(absolute, 'utf8');
    return {
      ok: true,
      error: '',
      method: `status-file:${rel(absolute)}`,
      dirtyFiles: parseGitStatusLines(output),
    };
  } catch (error) {
    return {
      ok: false,
      error: `worktree-status-file unreadable: ${String(error && (error.message || error) || 'unknown')}`,
      method: `status-file:${rel(absolute)}`,
      dirtyFiles: [],
    };
  }
}

function isPathAllowed(filePath, allowPrefixes) {
  const normalized = normalizePath(filePath);
  for (const prefixRaw of allowPrefixes) {
    const prefix = normalizePath(prefixRaw);
    if (!prefix) continue;
    if (prefix.endsWith('/')) {
      if (normalized.startsWith(prefix)) {
        return true;
      }
      continue;
    }
    if (normalized === prefix || normalized.startsWith(`${prefix}/`)) {
      return true;
    }
  }
  return false;
}

function buildFinding({
  ruleId,
  trigger,
  scope,
  severity,
  action,
  routeClass,
  routeHint,
  message,
  details,
}) {
  return {
    findingVersion: 'legacy-launch-finding/v1',
    kind: 'legacy-launch-finding',
    ruleId,
    trigger,
    scope,
    severity,
    action,
    routeClass,
    routeHint,
    message,
    file: '',
    line: 0,
    details: details || {},
  };
}

function checkCanonicalEvidence() {
  const missing = [];
  for (const relPath of DEFAULT_CANONICAL_EVIDENCE) {
    const absolute = path.resolve(ROOT, relPath);
    if (!fs.existsSync(absolute)) {
      missing.push(relPath);
    }
  }
  return {
    id: 'canonical-evidence',
    passed: missing.length === 0,
    status: missing.length === 0 ? 0 : 1,
    stderr: missing.length === 0 ? '' : `missing=${missing.join(',')}`,
    missing,
  };
}

function checkLocalAtomicWorkbench() {
  const missing = [];
  for (const relPath of LOCAL_ATOMIC_EVIDENCE) {
    if (!fs.existsSync(path.resolve(ROOT, relPath))) {
      missing.push(relPath);
    }
  }

  let registry = null;
  let registryError = '';
  try {
    registry = JSON.parse(fs.readFileSync(path.resolve(ROOT, 'atomic-registry.json'), 'utf8'));
  } catch (error) {
    registryError = String(error && (error.message || error) || 'registry unreadable');
  }

  const entries = Array.isArray(registry && registry.entries) ? registry.entries : [];
  const presentIds = new Set(entries.map((entry) => entry && (entry.atomId || entry.mapId || entry.id)).filter(Boolean));
  const missingIds = LOCAL_ATOMIC_IDS.filter((id) => !presentIds.has(id));
  const wrongOwner = entries
    .filter((entry) => LOCAL_ATOMIC_IDS.includes(entry.atomId || entry.mapId || entry.id))
    .filter((entry) => !entry.projectOwnership || entry.projectOwnership.ownerRepo !== '3KLife')
    .map((entry) => entry.atomId || entry.mapId || entry.id);
  const passed = missing.length === 0 && !registryError && missingIds.length === 0 && wrongOwner.length === 0;
  return {
    id: 'h2u-local-atomic-workbench',
    passed,
    status: passed ? 0 : 1,
    stderr: passed ? '' : `missing=${missing.join(',')} missingIds=${missingIds.join(',')} wrongOwner=${wrongOwner.join(',')} registryError=${registryError}`,
    missing,
    missingIds,
    wrongOwner,
    registryId: registry && registry.registryId || '',
  };
}

function checkWorktreeIsolation(allowDirtyPrefixes, options = {}) {
  const isolation = inspectH2uWorktreeIsolation({
    root: ROOT,
    allowDirtyPrefixes,
    strict: Boolean(options.strict),
    requireWorktreeCheck: Boolean(options.requireWorktreeCheck),
    worktreeStatusFile: options.worktreeStatusFile || null,
    baselineWorktreeStatusFile: options.baselineWorktreeStatusFile || null,
    statusSnapshotOut: options.statusSnapshotOut || null,
  });
  return {
    id: 'worktree-isolation',
    method: isolation.method || '',
    passed: Boolean(isolation.passed),
    status: Number.isFinite(Number(isolation.status)) ? Number(isolation.status) : 1,
    skipped: Boolean(isolation.skipped),
    checkUnavailable: Boolean(isolation.checkUnavailable),
    error: isolation.error || '',
    stderr: isolation.stderr || '',
    dirtyFiles: Array.isArray(isolation.dirtyFiles) ? isolation.dirtyFiles : [],
    baselineDirtyFiles: Array.isArray(isolation.baselineDirtyFiles) ? isolation.baselineDirtyFiles : [],
    introducedDirtyFiles: Array.isArray(isolation.introducedDirtyFiles) ? isolation.introducedDirtyFiles : [],
    unrelatedDirtyFiles: Array.isArray(isolation.unrelatedDirtyFiles) ? isolation.unrelatedDirtyFiles : [],
    allowedDirtyFiles: Array.isArray(isolation.allowedDirtyFiles) ? isolation.allowedDirtyFiles : [],
    baselineSource: isolation.baselineSource || '',
    currentSource: isolation.currentSource || '',
    statusSnapshotOut: isolation.statusSnapshotOut || '',
    snapshotWrite: isolation.snapshotWrite || null,
  };
}

function checkAtmMilestone() {
  const run = runTaskStoreTruthPipeline(ROOT, {
    check: true,
    verifyAfterSync: false,
  });
  const report = run.report;
  return {
    id: 'atm-milestone',
    passed: Boolean(report.passed),
    status: report.passed ? 0 : 1,
    stderr: report.passed ? '' : 'task-store truth check failed',
    report,
  };
}

function checkH2uEvolution() {
  const report = runH2uEvolutionValidation({
    strict: true,
    report: '',
    rewriteHash: false,
  });
  return {
    id: 'h2u-evolution',
    passed: Boolean(report.passed),
    status: report.passed ? 0 : 1,
    stderr: report.passed ? '' : 'h2u evolution pilot check failed',
    report,
  };
}

function checkH2uRuleGuard(ruleGuardReportPath) {
  const report = runRuleGuard({
    repoRoot: ROOT,
    strict: true,
    scanCore: true,
  });
  if (ruleGuardReportPath) {
    const absolute = path.resolve(ROOT, ruleGuardReportPath);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }
  return {
    id: 'h2u-rule-guard',
    passed: report.blockerCount === 0,
    status: report.blockerCount === 0 ? 0 : 1,
    stderr: report.blockerCount === 0 ? '' : `rule-guard blockers=${report.blockerCount}`,
    report,
  };
}

function checkWorkflowSyntax() {
  try {
    const source = fs.readFileSync(WORKFLOW_ENTRY, 'utf8');
    new vm.Script(source, { filename: WORKFLOW_ENTRY });
    return {
      id: 'h2u-workflow-syntax',
      passed: true,
      status: 0,
      stderr: '',
    };
  } catch (error) {
    return {
      id: 'h2u-workflow-syntax',
      passed: false,
      status: 1,
      stderr: String(error && (error.stack || error.message || error) || 'workflow entry load failed'),
    };
  }
}

function extractSourceSymbols(sourceText) {
  const symbols = new Set();
  const functionRegex = /(^|\n)\s*function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g;
  const variableFnRegex = /(^|\n)\s*(?:const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*(?:async\s+)?(?:function\b|\([^\n]*?\)\s*=>|[A-Za-z_$][A-Za-z0-9_$]*\s*=>)/g;
  let match;
  while ((match = functionRegex.exec(sourceText)) !== null) {
    if (match[2]) symbols.add(String(match[2]));
  }
  while ((match = variableFnRegex.exec(sourceText)) !== null) {
    if (match[2]) symbols.add(String(match[2]));
  }
  return symbols;
}

function listWorkflowModuleSymbols() {
  const symbols = new Set();
  if (!fs.existsSync(WORKFLOW_MODULE_DIR)) {
    return symbols;
  }

  const queue = [WORKFLOW_MODULE_DIR];
  while (queue.length > 0) {
    const current = queue.shift();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(absolutePath);
        continue;
      }
      if (!entry.isFile() || !entry.name.endsWith('.js')) {
        continue;
      }
      const source = fs.readFileSync(absolutePath, 'utf8');
      const found = extractSourceSymbols(source);
      for (const symbolName of found) {
        symbols.add(symbolName);
      }
    }
  }
  return symbols;
}

function checkWorkflowCapsuleSourceBinding() {
  const capsulesRoot = path.join(ROOT, 'atomic_workbench', 'capsules');
  const staleCapsules = [];
  const parseErrors = [];
  const workflowSymbols = listWorkflowModuleSymbols();
  if (!fs.existsSync(capsulesRoot)) {
    return {
      id: 'h2u-workflow-capsule-source-binding',
      passed: true,
      status: 0,
      stderr: '',
      staleCapsules,
      parseErrors,
      workflowSymbolCount: workflowSymbols.size,
    };
  }

  const capsuleDirs = fs.readdirSync(capsulesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(capsulesRoot, entry.name));

  for (const capsuleDir of capsuleDirs) {
    const manifestPath = path.join(capsuleDir, 'capsule.manifest.json');
    if (!fs.existsSync(manifestPath)) continue;
    let manifest = null;
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8').replace(/^\uFEFF/, ''));
    } catch (error) {
      parseErrors.push({
        manifestPath: rel(manifestPath),
        error: String(error && (error.message || error) || 'manifest parse failed'),
      });
      continue;
    }
    const symbolName = String(manifest && manifest.symbolName || '').trim();
    if (!symbolName || !workflowSymbols.has(symbolName)) continue;
    const sourceFile = normalizePath(manifest && manifest.source && manifest.source.file || '');
    if (sourceFile === 'tools_node/run-html-to-ucuf-workflow.js') {
      staleCapsules.push({
        capsuleId: String(manifest && manifest.capsuleId || path.basename(capsuleDir)),
        symbolName,
        sourceFile,
        manifestPath: rel(manifestPath),
      });
    }
  }

  const passed = staleCapsules.length === 0 && parseErrors.length === 0;
  return {
    id: 'h2u-workflow-capsule-source-binding',
    passed,
    status: passed ? 0 : 1,
    stderr: passed
      ? ''
      : `staleCapsules=${staleCapsules.map((item) => item.capsuleId).join(',')} parseErrors=${parseErrors.length}`,
    staleCapsules,
    parseErrors,
    workflowSymbolCount: workflowSymbols.size,
  };
}

function runValidation(opts = {}) {
  const findings = [];
  const checks = [];

  const worktree = checkWorktreeIsolation(opts.allowDirtyPrefixes || [], {
    requireWorktreeCheck: Boolean(opts.requireWorktreeCheck),
    strict: Boolean(opts.strict),
    worktreeStatusFile: opts.worktreeStatusFile || null,
    baselineWorktreeStatusFile: opts.baselineWorktreeStatusFile || null,
    statusSnapshotOut: opts.statusSnapshotOut || null,
  });
  checks.push(worktree);
  if (!worktree.passed) {
    findings.push(buildFinding({
      ruleId: 'legacy-launch.worktree-isolation',
      trigger: 'legacy.launch.worktree-isolation',
      scope: 'git-status',
      severity: 'block',
      action: 'fail',
      routeClass: 'blocker',
      routeHint: 'Kickoff first battle only when unrelated dirty files are isolated from this lane.',
      message: 'worktree contains unrelated dirty files for H2U first-battle launch',
      details: {
        unrelatedDirtyFiles: worktree.unrelatedDirtyFiles,
        baselineDirtyFiles: worktree.baselineDirtyFiles,
        introducedDirtyFiles: worktree.introducedDirtyFiles,
        allowDirtyPrefixes: opts.allowDirtyPrefixes || [],
        skipped: worktree.skipped,
        method: worktree.method || '',
        error: worktree.error || '',
        statusSnapshotOut: worktree.statusSnapshotOut || '',
      },
    }));
  }

  const canonicalEvidence = checkCanonicalEvidence();
  checks.push(canonicalEvidence);
  if (!canonicalEvidence.passed) {
    findings.push(buildFinding({
      ruleId: 'legacy-launch.canonical-evidence',
      trigger: 'legacy.launch.canonical-evidence',
      scope: 'fixtures/case-studies/normalize-css-color',
      severity: 'block',
      action: 'fail',
      routeClass: 'blocker',
      routeHint: 'H2U first battle must anchor on normalizeCssColor canonical evidence chain.',
      message: 'canonical normalizeCssColor evidence files are missing',
      details: {
        missing: canonicalEvidence.missing,
      },
    }));
  }

  const localAtomicWorkbench = checkLocalAtomicWorkbench();
  checks.push(localAtomicWorkbench);
  if (!localAtomicWorkbench.passed) {
    findings.push(buildFinding({
      ruleId: 'legacy-launch.h2u-local-atomic-workbench',
      trigger: 'legacy.launch.h2u-local-atomic-workbench',
      scope: 'atomic_workbench + atomic-registry.json',
      severity: 'block',
      action: 'fail',
      routeClass: 'blocker',
      routeHint: 'H2U project-derived atoms must be canonical in the 3KLife adopter-local workbench before first-win replay.',
      message: 'H2U local atomic workbench is incomplete or not project-owned',
      details: {
        missing: localAtomicWorkbench.missing,
        missingIds: localAtomicWorkbench.missingIds,
        wrongOwner: localAtomicWorkbench.wrongOwner,
        registryId: localAtomicWorkbench.registryId,
      },
    }));
  }

  const workflowCapsuleSourceBinding = checkWorkflowCapsuleSourceBinding();
  checks.push(workflowCapsuleSourceBinding);
  if (!workflowCapsuleSourceBinding.passed) {
    findings.push(buildFinding({
      ruleId: 'legacy-launch.h2u-workflow-capsule-source-binding',
      trigger: 'legacy.launch.h2u-workflow-capsule-source-binding',
      scope: 'atomic_workbench/capsules + tools_node/lib/html-to-ucuf/workflow',
      severity: 'block',
      action: 'fail',
      routeClass: 'blocker',
      routeHint: 'Workflow-migrated capsules must bind source.file to workflow modules, not the legacy wrapper entrypoint.',
      message: 'Detected workflow symbols still bound to tools_node/run-html-to-ucuf-workflow.js in capsule manifests',
      details: {
        staleCapsules: workflowCapsuleSourceBinding.staleCapsules,
        parseErrors: workflowCapsuleSourceBinding.parseErrors,
        workflowSymbolCount: workflowCapsuleSourceBinding.workflowSymbolCount,
      },
    }));
  }

  const atmMilestone = checkAtmMilestone();
  checks.push(atmMilestone);
  if (!atmMilestone.passed) {
    findings.push(buildFinding({
      ruleId: 'legacy-launch.atm-milestone',
      trigger: 'legacy.launch.atm-milestone',
      scope: 'docs/tasks/tasks-atm.json + stabilization milestone',
      severity: 'block',
      action: 'fail',
      routeClass: 'blocker',
      routeHint: 'Task-store truth must be stable before entering Legacy pilot.',
      message: 'ATM task-store milestone validation failed',
      details: {
        checks: (atmMilestone.report && atmMilestone.report.checks) || [],
      },
    }));
  }

  const h2uEvolution = checkH2uEvolution();
  checks.push(h2uEvolution);
  if (!h2uEvolution.passed) {
    findings.push(buildFinding({
      ruleId: 'legacy-launch.h2u-evolution',
      trigger: 'legacy.launch.h2u-evolution',
      scope: 'fixtures/case-studies/normalize-css-color proposal/decision chain',
      severity: 'block',
      action: 'fail',
      routeClass: 'blocker',
      routeHint: 'The normalizeCssColor evolve loop must be deterministic and replayable.',
      message: 'H2U evolution pilot strict validation failed',
      details: {
        checks: (h2uEvolution.report && h2uEvolution.report.checks) || [],
      },
    }));
  }

  const h2uRuleGuard = checkH2uRuleGuard(opts.ruleGuardReport || null);
  checks.push(h2uRuleGuard);
  if (!h2uRuleGuard.passed) {
    findings.push(buildFinding({
      ruleId: 'legacy-launch.h2u-rule-guard',
      trigger: 'legacy.launch.h2u-rule-guard',
      scope: 'tools_node/validate-html-to-ucuf-rule-guard.js',
      severity: 'block',
      action: 'fail',
      routeClass: 'blocker',
      routeHint: 'Legacy kickoff must keep H2U rule boundaries governed.',
      message: 'H2U rule-guard strict validation failed',
      details: {
        blockerCount: h2uRuleGuard.report ? h2uRuleGuard.report.blockerCount : null,
      },
    }));
  }

  const workflowSyntax = checkWorkflowSyntax();
  checks.push(workflowSyntax);
  if (!workflowSyntax.passed) {
    findings.push(buildFinding({
      ruleId: 'legacy-launch.h2u-workflow-syntax',
      trigger: 'legacy.launch.h2u-workflow-syntax',
      scope: 'tools_node/run-html-to-ucuf-workflow.js',
      severity: 'block',
      action: 'fail',
      routeClass: 'blocker',
      routeHint: 'The H2U workflow entrypoint must remain syntactically valid before pilot replay.',
      message: 'H2U workflow syntax check failed',
      details: {
        stderr: workflowSyntax.stderr,
      },
    }));
  }

  const passed = checks.every((check) => Boolean(check.passed)) && findings.length === 0;
  return {
    validator: 'validate-legacy-h2u-launch',
    passed,
    launchReady: passed,
    strategy: {
      firstPilot: 'H2U/html-to-ucuf',
      firstSlice: 'normalizeCssColor',
      firstGoal: 'first-win',
      runtimeApply: false,
      fixedOrder: [
        'H2U normalizeCssColor',
        'H2U parseCssLength',
        'H2U parseFragmentList/map helpers',
        'sanguo-rag',
      ],
    },
    checks,
    findings,
    summary: {
      totalChecks: checks.length,
      failedChecks: checks.filter((check) => !check.passed).map((check) => check.id),
      blockerCount: findings.length,
      allowDirtyPrefixes: opts.allowDirtyPrefixes || [],
      worktreeCheckSkipped: Boolean(worktree.skipped),
      baselineWorktreeStatusFile: opts.baselineWorktreeStatusFile || '',
      statusSnapshotOut: opts.statusSnapshotOut || '',
    },
    worktreeCheck: {
      method: worktree.method || '',
      skipped: Boolean(worktree.skipped),
      checkUnavailable: Boolean(worktree.checkUnavailable),
      error: worktree.error || '',
      dirtyFileCount: Array.isArray(worktree.dirtyFiles) ? worktree.dirtyFiles.length : 0,
      baselineDirtyFileCount: Array.isArray(worktree.baselineDirtyFiles) ? worktree.baselineDirtyFiles.length : 0,
      introducedDirtyFileCount: Array.isArray(worktree.introducedDirtyFiles) ? worktree.introducedDirtyFiles.length : 0,
      unrelatedDirtyFileCount: Array.isArray(worktree.unrelatedDirtyFiles) ? worktree.unrelatedDirtyFiles.length : 0,
      allowedDirtyFileCount: Array.isArray(worktree.allowedDirtyFiles) ? worktree.allowedDirtyFiles.length : 0,
      baselineSource: worktree.baselineSource || '',
      currentSource: worktree.currentSource || '',
      statusSnapshotOut: worktree.statusSnapshotOut || '',
      snapshotWrite: worktree.snapshotWrite || null,
    },
    generatedAt: new Date().toISOString(),
  };
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    return;
  }

  const report = runValidation(opts);

  if (opts.report) {
    const absolute = path.resolve(ROOT, opts.report);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.error(`[validate-legacy-h2u-launch] report=${rel(absolute)}`);
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  console.error(`[validate-legacy-h2u-launch] status=${report.passed ? 'pass' : 'fail'} failedChecks=${report.summary.failedChecks.length} blockers=${report.summary.blockerCount}`);

  if (opts.strict && !report.passed) {
    process.exit(1);
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`[validate-legacy-h2u-launch] ${error.stack || error.message || error}`);
    process.exit(1);
  }
}

module.exports = {
  parseArgs,
  runValidation,
  checkCanonicalEvidence,
  checkLocalAtomicWorkbench,
  checkWorktreeIsolation,
  main,
};
