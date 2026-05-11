#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const { runScriptInProcess, shouldFallbackForEperm } = require('./lib/in-process-cli-runner');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_BASE_OUT = path.join(ROOT, 'artifacts', 'legacy-h2u-first-win');

function parseArgs(argv) {
  const opts = {
    strict: false,
    report: null,
    baseOut: DEFAULT_BASE_OUT,
    screenId: 'legacy-h2u-dryrun',
    sourceDir: 'Design System 3',
    mainHtml: 'ui_kits/gacha/index.html',
    bundle: 'lobby_ui',
    worktreeStatusFile: null,
    allowDirtyPrefixes: [],
    requireWorktreeCheck: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const next = () => argv[++i];
    switch (token) {
      case '--strict': opts.strict = true; break;
      case '--report': opts.report = next(); break;
      case '--base-out': opts.baseOut = path.resolve(next()); break;
      case '--screen-id': opts.screenId = next(); break;
      case '--source-dir': opts.sourceDir = next(); break;
      case '--main-html': opts.mainHtml = next(); break;
      case '--bundle': opts.bundle = next(); break;
      case '--worktree-status-file': opts.worktreeStatusFile = next(); break;
      case '--allow-dirty-prefix': {
        const value = String(next() || '').trim();
        if (value) opts.allowDirtyPrefixes.push(value);
        break;
      }
      case '--require-worktree-check': opts.requireWorktreeCheck = true; break;
      case '--help':
      case '-h':
        opts.help = true;
        break;
      default:
        throw new Error(`unknown arg: ${token}`);
    }
  }
  return opts;
}

function printHelp() {
  console.log('Usage: node tools_node/validate-legacy-h2u-first-win.js [--strict] [--report <json>] [--worktree-status-file <txt>]');
  console.log('');
  console.log('Runs two-round H2U first-win replay validation and emits evidence manifests.');
}

function rel(filePath) {
  return path.relative(ROOT, path.resolve(filePath)).replace(/\\/g, '/');
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function resetDir(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJsonIfExists(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
  } catch (_) {
    return null;
  }
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function runNodeScript(scriptPath, args, label) {
  const proc = cp.spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    env: Object.assign({}, process.env),
  });
  const runResult = {
    label,
    command: [process.execPath, rel(scriptPath), ...args].join(' '),
    status: typeof proc.status === 'number' ? proc.status : 1,
    stdout: proc.stdout || '',
    stderr: proc.stderr || '',
    error: proc.error ? String(proc.error.message || proc.error) : null,
    mode: 'spawn',
  };
  if (!shouldFallbackForEperm(proc)) {
    return runResult;
  }

  const fallback = await runScriptInProcess({
    scriptPath,
    args,
    cwd: ROOT,
    envPatch: {},
    label,
  });
  fallback.command = runResult.command;
  fallback.fallbackFrom = 'spawn-eperm';
  return fallback;
}

function sortJson(value) {
  if (Array.isArray(value)) return value.map(sortJson);
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const key of Object.keys(value).sort()) {
    out[key] = sortJson(value[key]);
  }
  return out;
}

function hashStableJson(value) {
  const canonical = JSON.stringify(sortJson(value));
  return `sha256:${crypto.createHash('sha256').update(canonical).digest('hex')}`;
}

function isRunSuccess(run) {
  return Boolean(run) && Number(run.status) === 0;
}

function collectDryRunContract(workflowSummary) {
  const missing = [];
  if (!workflowSummary || typeof workflowSummary !== 'object') {
    return {
      ok: false,
      missing: ['workflow-summary-missing'],
      debugOnlyReasons: [],
      nextFixRuleIds: [],
      interactionRuntime: null,
    };
  }

  const debugOnlyReasons = Array.isArray(workflowSummary.debugOnlyReasons)
    ? workflowSummary.debugOnlyReasons.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
  if (workflowSummary.debugOnly !== true) missing.push('debugOnly-flag-not-true');
  if (!debugOnlyReasons.includes('runtime-sync-disabled')) missing.push('debugOnlyReason:runtime-sync-disabled');
  if (!debugOnlyReasons.includes('editor-compare-skipped')) missing.push('debugOnlyReason:editor-compare-skipped');

  const interaction = workflowSummary.interactionRuntime && typeof workflowSummary.interactionRuntime === 'object'
    ? workflowSummary.interactionRuntime
    : null;
  const hasInteractionContract = !!interaction
    && typeof interaction.required === 'boolean'
    && typeof interaction.status === 'string'
    && Number.isFinite(Number(interaction.actionsDeclared))
    && Number.isFinite(Number(interaction.actionsBound));
  if (!hasInteractionContract) missing.push('interactionRuntime-contract-missing');

  const nextFixes = Array.isArray(workflowSummary.nextFixes) ? workflowSummary.nextFixes : [];
  const nextFixRuleIds = [...new Set(nextFixes
    .map((item) => String(item && item.ruleId || '').trim())
    .filter(Boolean))].sort();
  if (nextFixRuleIds.length === 0) missing.push('nextFixes-ruleId-missing');

  return {
    ok: missing.length === 0,
    missing,
    debugOnlyReasons,
    nextFixRuleIds,
    interactionRuntime: interaction ? {
      required: !!interaction.required,
      status: String(interaction.status || ''),
      actionsDeclared: Number(interaction.actionsDeclared || 0),
      actionsBound: Number(interaction.actionsBound || 0),
    } : null,
  };
}

function classifyWorkflowRunOutcome(run, workflowSummary) {
  if (isRunSuccess(run)) {
    return {
      accepted: true,
      category: 'success',
      hardFail: false,
      reason: 'exit-zero',
      dryRunContract: collectDryRunContract(workflowSummary),
    };
  }
  if (!run) {
    return {
      accepted: false,
      category: 'hard-fail',
      hardFail: true,
      reason: 'missing-workflow-run',
      dryRunContract: collectDryRunContract(workflowSummary),
    };
  }
  if (run.error) {
    return {
      accepted: false,
      category: 'hard-fail',
      hardFail: true,
      reason: 'process-error',
      dryRunContract: collectDryRunContract(workflowSummary),
    };
  }

  const status = Number(run.status || 1);
  if (status !== 1) {
    return {
      accepted: false,
      category: 'hard-fail',
      hardFail: true,
      reason: `unexpected-exit-${status}`,
      dryRunContract: collectDryRunContract(workflowSummary),
    };
  }

  const combined = `${run.stdout || ''}\n${run.stderr || ''}`;
  const dryRunContract = collectDryRunContract(workflowSummary);
  const hasNeedsReviewVerdict = /verdict=needs-review/i.test(combined);
  const allowedExpectedNonzero = dryRunContract.ok && hasNeedsReviewVerdict;
  if (allowedExpectedNonzero) {
    return {
      accepted: true,
      category: 'expected-nonzero',
      hardFail: false,
      reason: 'dry-run-expected-nonzero',
      dryRunContract,
    };
  }

  const reason = !hasNeedsReviewVerdict
    ? 'missing-needs-review-verdict'
    : (dryRunContract.missing.length > 0
      ? `incomplete-dry-run-contract:${dryRunContract.missing.join(',')}`
      : 'unexpected-nonzero');
  return {
    accepted: false,
    category: 'hard-fail',
    hardFail: true,
    reason,
    dryRunContract,
  };
}

function summarizeCommandRun(run, evaluation) {
  const stdout = String(run && run.stdout || '');
  const stderr = String(run && run.stderr || '');
  const stdoutLines = stdout.split(/\r?\n/).filter(Boolean);
  const stderrLines = stderr.split(/\r?\n/).filter(Boolean);
  const rawStatus = run && typeof run.status === 'number' ? run.status : 1;
  return {
    label: run && run.label || '',
    status: Number(rawStatus),
    error: run && run.error || null,
    mode: run && run.mode || 'spawn',
    fallbackFrom: run && run.fallbackFrom || null,
    stdoutTail: stdoutLines.slice(-8),
    stderrTail: stderrLines.slice(-8),
    acceptance: evaluation && evaluation.category
      ? evaluation.category
      : (Number(rawStatus) === 0 ? 'success' : 'hard-fail'),
    accepted: evaluation ? !!evaluation.accepted : Number(rawStatus) === 0,
    hardFail: evaluation ? !!evaluation.hardFail : Number(rawStatus) !== 0,
    reason: evaluation && evaluation.reason ? evaluation.reason : null,
  };
}

function pickLaunchCheck(report, id) {
  const checks = Array.isArray(report && report.checks) ? report.checks : [];
  return checks.find((item) => item && item.id === id) || null;
}

function buildEvidenceKey(launchReport, workflowSummary, summaryRuleGuardReport) {
  const atmSummary = pickLaunchCheck(launchReport, 'atm-milestone');
  const h2uEvolution = pickLaunchCheck(launchReport, 'h2u-evolution');
  const interaction = workflowSummary && workflowSummary.interactionRuntime || {};
  const nextFixes = Array.isArray(workflowSummary && workflowSummary.nextFixes)
    ? workflowSummary.nextFixes
    : [];
  const nextFixRuleIds = [...new Set(nextFixes.map((item) => String(item && item.ruleId || '').trim()).filter(Boolean))].sort();
  return {
    atmSummary: atmSummary && atmSummary.report && atmSummary.report.summary || null,
    proposalHash: h2uEvolution && h2uEvolution.report ? h2uEvolution.report.proposalHash || null : null,
    launchReady: !!(launchReport && launchReport.passed),
    ruleGuardBlockerCount: summaryRuleGuardReport ? Number(summaryRuleGuardReport.blockerCount || 0) : null,
    interactionRuntime: {
      required: !!interaction.required,
      status: interaction.status || null,
      actionsDeclared: Number(interaction.actionsDeclared || 0),
      actionsBound: Number(interaction.actionsBound || 0),
    },
    nextFixRuleIds,
  };
}

async function runRound(roundId, opts) {
  const roundDir = path.join(opts.baseOut, roundId);
  const workflowOutDir = path.join(roundDir, 'workflow');
  const launchReportPath = path.join(roundDir, 'launch.report.json');
  const workflowSummaryPath = path.join(workflowOutDir, `${opts.screenId}.workflow-summary.json`);
  const summaryRuleGuardReportPath = path.join(roundDir, 'rule-guard.summary.report.json');
  const evidenceManifestPath = path.join(roundDir, 'evidence.manifest.json');

  resetDir(roundDir);
  ensureDir(workflowOutDir);

  const launchArgs = ['--strict', '--report', launchReportPath];
  for (const prefix of opts.allowDirtyPrefixes) {
    launchArgs.push('--allow-dirty-prefix', prefix);
  }
  if (opts.worktreeStatusFile) {
    launchArgs.push('--worktree-status-file', opts.worktreeStatusFile);
  }
  if (opts.requireWorktreeCheck) {
    launchArgs.push('--require-worktree-check');
  }
  const launchRun = await runNodeScript(
    path.join(ROOT, 'tools_node', 'validate-legacy-h2u-launch.js'),
    launchArgs,
    'validate-legacy-h2u-launch'
  );
  const launchReport = readJsonIfExists(launchReportPath);

  const workflowRun = await runNodeScript(
    path.join(ROOT, 'tools_node', 'run-html-to-ucuf-workflow.js'),
    [
      '--source-dir', opts.sourceDir,
      '--main-html', opts.mainHtml,
      '--screen-id', opts.screenId,
      '--bundle', opts.bundle,
      '--out-dir', workflowOutDir,
      '--no-runtime-sync',
      '--skip-editor-compare',
    ],
    'run-html-to-ucuf-workflow'
  );
  const workflowSummary = readJsonIfExists(workflowSummaryPath);

  const summaryRuleGuardRun = await runNodeScript(
    path.join(ROOT, 'tools_node', 'validate-html-to-ucuf-rule-guard.js'),
    ['--strict', '--summary', workflowSummaryPath, '--report', summaryRuleGuardReportPath],
    'validate-html-to-ucuf-rule-guard(summary)'
  );
  const summaryRuleGuardReport = readJsonIfExists(summaryRuleGuardReportPath);

  const key = buildEvidenceKey(launchReport, workflowSummary, summaryRuleGuardReport);
  const commandRuns = [launchRun, workflowRun, summaryRuleGuardRun];
  const workflowOutcome = classifyWorkflowRunOutcome(workflowRun, workflowSummary);
  const commandSummary = commandRuns.map((run) => {
    if (run.label === 'run-html-to-ucuf-workflow') {
      return summarizeCommandRun(run, workflowOutcome);
    }
    const ok = isRunSuccess(run);
    return summarizeCommandRun(run, {
      accepted: ok,
      category: ok ? 'success' : 'hard-fail',
      hardFail: !ok,
      reason: ok ? 'exit-zero' : `unexpected-exit-${Number(run && run.status || 1)}`,
    });
  });
  const commandFailures = commandSummary.filter((item) => !item.accepted);
  const hardFailures = commandSummary.filter((item) => !!item.hardFail);
  const manifest = {
    roundId,
    generatedAt: new Date().toISOString(),
    files: {
      launchReport: rel(launchReportPath),
      workflowSummary: rel(workflowSummaryPath),
      summaryRuleGuardReport: rel(summaryRuleGuardReportPath),
    },
    commandStatus: {
      launch: launchRun.status,
      workflow: workflowRun.status,
      summaryRuleGuard: summaryRuleGuardRun.status,
    },
    commandSummary,
    commandFailureCount: commandFailures.length,
    hardFailCount: hardFailures.length,
    workflowOutcome: {
      category: workflowOutcome.category,
      accepted: workflowOutcome.accepted,
      reason: workflowOutcome.reason,
      dryRunContractMissing: workflowOutcome.dryRunContract ? workflowOutcome.dryRunContract.missing : [],
    },
    key,
    keyHash: hashStableJson(key),
  };
  writeJson(evidenceManifestPath, manifest);

  const launchPassed = isRunSuccess(launchRun) && !!(launchReport && launchReport.passed);
  const summaryRuleGuardPassed = isRunSuccess(summaryRuleGuardRun) && !!(summaryRuleGuardReport && summaryRuleGuardReport.blockerCount === 0);
  const interaction = workflowSummary && workflowSummary.interactionRuntime || null;
  const workflowArtifactsReady = Boolean(workflowSummary) && workflowOutcome.accepted;
  const interactionPassed = !!(interaction && interaction.required && interaction.status === 'pass' && interaction.actionsBound === interaction.actionsDeclared);
  const hasHardFail = hardFailures.length > 0;
  const passed = launchPassed && summaryRuleGuardPassed && interactionPassed && workflowArtifactsReady && !hasHardFail;

  return {
    roundId,
    passed,
    roundDir: rel(roundDir),
    evidenceManifestPath: rel(evidenceManifestPath),
    launchRun,
    workflowRun,
    summaryRuleGuardRun,
    launchPassed,
    summaryRuleGuardPassed,
    interactionPassed,
    workflowArtifactsReady,
    workflowOutcome,
    hasHardFail,
    hardFailCount: hardFailures.length,
    launchReport,
    workflowSummary,
    summaryRuleGuardReport,
    key,
    keyHash: manifest.keyHash,
    commandFailureCount: commandFailures.length,
    commandSummary,
  };
}

function compareRoundKeys(roundA, roundB) {
  const same = roundA.keyHash === roundB.keyHash;
  return {
    passed: same,
    reason: same ? null : 'round-key-mismatch',
    roundAHash: roundA.keyHash,
    roundBHash: roundB.keyHash,
    roundAKey: roundA.key,
    roundBKey: roundB.key,
  };
}

function buildFinalReport(opts, roundA, roundB, compare) {
  const roundAHardFail = !!(roundA && (roundA.hasHardFail || Number(roundA.hardFailCount || 0) > 0));
  const roundBHardFail = !!(roundB && (roundB.hasHardFail || Number(roundB.hardFailCount || 0) > 0));
  const passed = roundA.passed && roundB.passed && compare.passed && !roundAHardFail && !roundBHardFail;
  return {
    validator: 'validate-legacy-h2u-first-win',
    passed,
    finalDecision: passed ? 'GO' : 'NO-GO',
    strategy: {
      firstPilot: 'H2U/html-to-ucuf',
      firstSlice: 'normalizeCssColor',
      replayStrength: 'engineering-two-rounds',
      runtimeApply: false,
    },
    rounds: [
      {
        roundId: roundA.roundId,
        passed: roundA.passed,
        evidenceManifestPath: roundA.evidenceManifestPath,
        launchPassed: roundA.launchPassed,
        summaryRuleGuardPassed: roundA.summaryRuleGuardPassed,
        interactionPassed: roundA.interactionPassed,
        workflowOutcome: roundA.workflowOutcome || null,
        hasHardFail: roundAHardFail,
      },
      {
        roundId: roundB.roundId,
        passed: roundB.passed,
        evidenceManifestPath: roundB.evidenceManifestPath,
        launchPassed: roundB.launchPassed,
        summaryRuleGuardPassed: roundB.summaryRuleGuardPassed,
        interactionPassed: roundB.interactionPassed,
        workflowOutcome: roundB.workflowOutcome || null,
        hasHardFail: roundBHardFail,
      },
    ],
    compare,
    summary: {
      baseOut: rel(opts.baseOut),
      failedRounds: [roundA, roundB].filter((item) => !item.passed).map((item) => item.roundId),
      hardFailRounds: [roundAHardFail ? roundA.roundId : null, roundBHardFail ? roundB.roundId : null].filter(Boolean),
      blockers: passed ? [] : [
        ...(roundA.passed ? [] : [`${roundA.roundId} failed`]),
        ...(roundB.passed ? [] : [`${roundB.roundId} failed`]),
        ...(roundAHardFail ? [`${roundA.roundId} hard-fail detected`] : []),
        ...(roundBHardFail ? [`${roundB.roundId} hard-fail detected`] : []),
        ...(compare.passed ? [] : ['round comparison mismatch']),
      ],
    },
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    return;
  }

  ensureDir(opts.baseOut);
  const roundA = await runRound('round-a', opts);
  const roundB = await runRound('round-b', opts);
  const compare = compareRoundKeys(roundA, roundB);

  const finalReport = buildFinalReport(opts, roundA, roundB, compare);
  const finalReportPath = opts.report
    ? path.resolve(opts.report)
    : path.join(opts.baseOut, 'final-decision.json');
  writeJson(finalReportPath, finalReport);

  console.log(`[validate-legacy-h2u-first-win] report=${rel(finalReportPath)}`);
  console.log(`[validate-legacy-h2u-first-win] decision=${finalReport.finalDecision} roundA=${roundA.passed} roundB=${roundB.passed} compare=${compare.passed}`);

  if (opts.strict && !finalReport.passed) {
    process.exit(12);
  }
}

if (require.main === module) {
  try {
    main().catch((error) => {
      console.error(`[validate-legacy-h2u-first-win] ${error.stack || error.message || error}`);
      process.exit(1);
    });
  } catch (error) {
    console.error(`[validate-legacy-h2u-first-win] ${error.stack || error.message || error}`);
    process.exit(1);
  }
}

module.exports = {
  parseArgs,
  runRound,
  compareRoundKeys,
  buildFinalReport,
};
