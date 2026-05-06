#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const { classifyWorkflowPath } = require('./lib/harness/workflow-path-taxonomy');

const PROJECT_ROOT = path.resolve(__dirname, '..');

const VALIDATION_TOOL_PATTERNS = [
  /^check[-_].+/i,
  /^validate[-_].+/i,
  /^compare[-_].+/i,
  /^capture[-_].+/i,
  /^compute-gate\.js$/i,
  /^report-turn-usage\.js$/i,
];

const GATE_TOOL_PATTERNS = [
  /^check[-_].+/i,
  /^validate[-_].+/i,
  /^compare[-_].+/i,
  /^compute-gate\.js$/i,
];

function printHelp() {
  console.log('Usage: node tools_node/compare-execution-path.js --baseline <file> --candidate <file> [--output <file>] [--json] [--strict]');
  console.log('');
  console.log('Options:');
  console.log('  --baseline <file>   Baseline workflow-path fixture or equivalent artifact (required)');
  console.log('  --candidate <file>  Candidate workflow-path fixture or equivalent artifact (required)');
  console.log('  --output <file>     Write comparison result JSON to this path');
  console.log('  --json              Print comparison result JSON to stdout');
  console.log('  --strict            Exit non-zero when verdict is not pass');
  console.log('  --help, -h          Show this help message');
}

function parseArgs(argv) {
  const args = {
    baseline: '',
    candidate: '',
    output: '',
    json: false,
    strict: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--baseline') {
      args.baseline = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--candidate') {
      args.candidate = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--output') {
      args.output = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--json') {
      args.json = true;
      continue;
    }
    if (token === '--strict') {
      args.strict = true;
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

function toProjectRelative(targetPath) {
  return path.relative(PROJECT_ROOT, targetPath).replace(/\\/g, '/');
}

function readJsonOrThrow(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
  } catch (error) {
    throw new Error(`${label} 讀取失敗：${error.message}`);
  }
}

function arrayOfStrings(value) {
  return Array.isArray(value) ? value.map((entry) => String(entry || '')).filter(Boolean) : [];
}

function uniqueStrings(list) {
  return Array.from(new Set(arrayOfStrings(list)));
}

function eventFailed(event) {
  return String(event && event.status || '').toLowerCase() === 'failed'
    || String(event && event.status || '').toLowerCase() === 'error'
    || Number(event && event.exitCode) !== 0;
}

function matchesAnyPattern(value, patterns) {
  const text = String(value || '');
  return patterns.some((pattern) => pattern.test(text));
}

function isValidationTool(toolName) {
  return matchesAnyPattern(toolName, VALIDATION_TOOL_PATTERNS);
}

function isGateTool(toolName) {
  return matchesAnyPattern(toolName, GATE_TOOL_PATTERNS);
}

function normalizeInput(raw, sourcePath) {
  const fixture = raw && typeof raw === 'object' ? raw : {};
  const turnArtifact = fixture.turnArtifact && typeof fixture.turnArtifact === 'object'
    ? fixture.turnArtifact
    : fixture.kind === 'turn-artifact'
      ? fixture
      : {};
  const traceArtifact = fixture.traceArtifact && typeof fixture.traceArtifact === 'object'
    ? fixture.traceArtifact
    : fixture.kind === 'execution-trace'
      ? fixture
      : null;
  const traceSummary = fixture.traceSummary && typeof fixture.traceSummary === 'object'
    ? fixture.traceSummary
    : traceArtifact && traceArtifact.summary && typeof traceArtifact.summary === 'object'
      ? traceArtifact.summary
      : {};
  const events = traceArtifact && Array.isArray(traceArtifact.events)
    ? traceArtifact.events.filter((event) => event && typeof event === 'object')
    : [];
  const toolSequence = events.length > 0
    ? events.map((event) => String(event.toolName || '')).filter(Boolean)
    : arrayOfStrings(traceSummary.tools);
  const validationTools = uniqueStrings(toolSequence.filter(isValidationTool));
  const gateFailureCount = events.length > 0
    ? events.filter((event) => isGateTool(event.toolName) && eventFailed(event)).length
    : Number(traceSummary.errorCount || 0);
  const retryCount = Number(traceSummary.retryCount || 0);
  const errorCount = Number(traceSummary.errorCount || 0);
  const traceStatus = String(
    (traceArtifact && traceArtifact.status)
    || (fixture.validation && fixture.validation.expectedTraceStatus)
    || 'unknown'
  );
  const classification = classifyWorkflowPath({ turnArtifact, traceSummary });

  return {
    sourcePath,
    sourceRelPath: toProjectRelative(sourcePath),
    fixtureId: String(fixture.fixtureId || path.basename(sourcePath, path.extname(sourcePath))),
    kind: String(fixture.kind || ''),
    variant: String(fixture.variant || ''),
    declaredPathClass: String(fixture.pathClass || ''),
    validationStatus: String(fixture.validation && fixture.validation.status || ''),
    turnArtifact,
    traceArtifact,
    traceSummary,
    events,
    toolSequence,
    validationTools,
    gateFailureCount,
    retryCount,
    errorCount,
    traceStatus,
    classification,
  };
}

function countItems(sequence) {
  const counts = new Map();
  sequence.forEach((item) => {
    counts.set(item, (counts.get(item) || 0) + 1);
  });
  return counts;
}

function subtractSequenceCounts(left, right) {
  const rightCounts = countItems(right);
  const missing = [];
  left.forEach((item) => {
    const remaining = rightCounts.get(item) || 0;
    if (remaining > 0) {
      rightCounts.set(item, remaining - 1);
      return;
    }
    missing.push(item);
  });
  return missing;
}

function hasSameMultiset(left, right) {
  if (left.length !== right.length) {
    return false;
  }
  const leftCounts = countItems(left);
  const rightCounts = countItems(right);
  if (leftCounts.size !== rightCounts.size) {
    return false;
  }
  for (const [key, value] of leftCounts.entries()) {
    if ((rightCounts.get(key) || 0) !== value) {
      return false;
    }
  }
  return true;
}

function findFirstOrderMismatch(left, right) {
  if (!hasSameMultiset(left, right)) {
    return null;
  }
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return {
        index,
        baseline: left[index],
        candidate: right[index],
      };
    }
  }
  return null;
}

function severityRank(severity) {
  switch (severity) {
    case 'fail':
      return 2;
    case 'warn':
      return 1;
    default:
      return 0;
  }
}

function createIssue(severity, code, message, details, remediation) {
  return {
    severity,
    code,
    message,
    details: details || {},
    remediation: remediation || '',
  };
}

function buildComparison(baseline, candidate) {
  const missingTools = subtractSequenceCounts(baseline.toolSequence, candidate.toolSequence);
  const extraTools = subtractSequenceCounts(candidate.toolSequence, baseline.toolSequence);
  const missingValidationTools = baseline.validationTools.filter((toolName) => !candidate.validationTools.includes(toolName));
  const missingNonValidationTools = missingTools.filter((toolName) => !missingValidationTools.includes(toolName));
  const orderMismatch = findFirstOrderMismatch(baseline.toolSequence, candidate.toolSequence);
  const gateFailureDelta = candidate.gateFailureCount - baseline.gateFailureCount;
  const retryDelta = candidate.retryCount - baseline.retryCount;
  const errorDelta = candidate.errorCount - baseline.errorCount;
  const issues = [];

  if (baseline.classification.classId !== candidate.classification.classId) {
    issues.push(createIssue(
      'fail',
      'path-class-drift',
      `workflow path class drifted from ${baseline.classification.classId} to ${candidate.classification.classId}`,
      {
        baselineClass: baseline.classification.classId,
        candidateClass: candidate.classification.classId,
      },
      'Keep the candidate within the same primary path class or update the baseline taxonomy/fixture contract first.',
    ));
  }

  if (baseline.traceStatus === 'pass' && candidate.traceStatus !== 'pass') {
    issues.push(createIssue(
      'fail',
      'trace-status-regressed',
      `candidate trace status regressed from ${baseline.traceStatus} to ${candidate.traceStatus}`,
      {
        baselineTraceStatus: baseline.traceStatus,
        candidateTraceStatus: candidate.traceStatus,
      },
      'Restore the candidate trace to a passing end-state before comparing path drift.',
    ));
  }

  if (missingValidationTools.length > 0) {
    issues.push(createIssue(
      'fail',
      'missing-validation',
      `candidate omitted baseline validation step(s): ${missingValidationTools.join(', ')}`,
      {
        missingValidationTools,
      },
      'Reinsert the missing validation/gate step(s) so the candidate preserves the baseline safety contract.',
    ));
  }

  if (missingNonValidationTools.length > 0) {
    issues.push(createIssue(
      'warn',
      'missing-step',
      `candidate skipped baseline step(s): ${missingNonValidationTools.join(', ')}`,
      {
        missingTools: missingNonValidationTools,
      },
      'Confirm the skipped step is intentionally obsolete; otherwise restore the baseline sequence.',
    ));
  }

  if (extraTools.length > 0) {
    issues.push(createIssue(
      'warn',
      'extra-step',
      `candidate inserted extra step(s): ${extraTools.join(', ')}`,
      {
        extraTools,
      },
      'Remove unnecessary tools or document why the extra steps are now part of the stable path.',
    ));
  }

  if (orderMismatch) {
    issues.push(createIssue(
      'warn',
      'sequence-order-drift',
      `candidate tool order diverged at index ${orderMismatch.index}`,
      orderMismatch,
      'Restore the baseline order unless the reordered steps are now intentionally required.',
    ));
  }

  if (gateFailureDelta > 0) {
    issues.push(createIssue(
      'warn',
      'gate-fail-increase',
      `candidate introduced ${gateFailureDelta} additional gate failure(s)`,
      {
        baselineGateFailures: baseline.gateFailureCount,
        candidateGateFailures: candidate.gateFailureCount,
      },
      'Reduce transient gate failures or capture a new baseline only after the extra failures are understood.',
    ));
  }

  if (retryDelta > 0) {
    issues.push(createIssue(
      'warn',
      'retry-increase',
      `candidate introduced ${retryDelta} additional retry event(s)`,
      {
        baselineRetryCount: baseline.retryCount,
        candidateRetryCount: candidate.retryCount,
      },
      'Remove avoidable retries or promote the new retry behavior only after it is known to be intentional.',
    ));
  }

  if (errorDelta > 0 && gateFailureDelta <= 0) {
    issues.push(createIssue(
      'warn',
      'error-count-increase',
      `candidate introduced ${errorDelta} additional non-baseline error(s)`,
      {
        baselineErrorCount: baseline.errorCount,
        candidateErrorCount: candidate.errorCount,
      },
      'Inspect the extra error-producing step and decide whether it is expected or a real drift symptom.',
    ));
  }

  const verdict = issues.reduce((current, issue) => {
    return severityRank(issue.severity) > severityRank(current) ? issue.severity : current;
  }, 'pass');

  return {
    schemaVersion: 'execution-path-comparison/v1',
    kind: 'execution-path-comparison',
    generatedAt: new Date().toISOString(),
    verdict,
    baseline: {
      fixtureId: baseline.fixtureId,
      sourcePath: baseline.sourceRelPath,
      declaredPathClass: baseline.declaredPathClass,
      classifiedPathClass: baseline.classification.classId,
      traceStatus: baseline.traceStatus,
      validationStatus: baseline.validationStatus,
      toolSequence: baseline.toolSequence,
      validationTools: baseline.validationTools,
      gateFailureCount: baseline.gateFailureCount,
      retryCount: baseline.retryCount,
      errorCount: baseline.errorCount,
    },
    candidate: {
      fixtureId: candidate.fixtureId,
      sourcePath: candidate.sourceRelPath,
      declaredPathClass: candidate.declaredPathClass,
      classifiedPathClass: candidate.classification.classId,
      traceStatus: candidate.traceStatus,
      validationStatus: candidate.validationStatus,
      toolSequence: candidate.toolSequence,
      validationTools: candidate.validationTools,
      gateFailureCount: candidate.gateFailureCount,
      retryCount: candidate.retryCount,
      errorCount: candidate.errorCount,
    },
    drift: {
      missingValidationTools,
      missingTools: missingNonValidationTools,
      extraTools,
      orderMismatch,
      gateFailureDelta,
      retryDelta,
      errorDelta,
    },
    issues,
  };
}

function writeOutput(result, outputPath) {
  const absolutePath = resolveProjectPath(outputPath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  return absolutePath;
}

function printHumanResult(result) {
  console.log(`[compare-execution-path] verdict=${result.verdict}`);
  console.log(`[compare-execution-path] baseline=${result.baseline.sourcePath} class=${result.baseline.classifiedPathClass} trace=${result.baseline.traceStatus}`);
  console.log(`[compare-execution-path] candidate=${result.candidate.sourcePath} class=${result.candidate.classifiedPathClass} trace=${result.candidate.traceStatus}`);
  console.log(`[compare-execution-path] baselineTools=${result.baseline.toolSequence.join(' -> ')}`);
  console.log(`[compare-execution-path] candidateTools=${result.candidate.toolSequence.join(' -> ')}`);
  console.log(`[compare-execution-path] gateFailureDelta=${result.drift.gateFailureDelta} retryDelta=${result.drift.retryDelta} errorDelta=${result.drift.errorDelta}`);
  if (result.issues.length === 0) {
    console.log('[compare-execution-path] no drift issues detected');
    return;
  }
  result.issues.forEach((issue) => {
    console.log(`[compare-execution-path] [${issue.severity}] ${issue.code}: ${issue.message}`);
  });
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`[compare-execution-path] ${error.message}`);
    printHelp();
    process.exit(1);
  }

  if (args.help) {
    printHelp();
    return;
  }

  if (!args.baseline || !args.candidate) {
    console.error('[compare-execution-path] --baseline and --candidate are required');
    printHelp();
    process.exit(1);
  }

  try {
    const baselinePath = resolveProjectPath(args.baseline);
    const candidatePath = resolveProjectPath(args.candidate);
    const baseline = normalizeInput(readJsonOrThrow(baselinePath, 'baseline'), baselinePath);
    const candidate = normalizeInput(readJsonOrThrow(candidatePath, 'candidate'), candidatePath);
    const result = buildComparison(baseline, candidate);

    if (args.output) {
      const writtenPath = writeOutput(result, args.output);
      console.log(`[compare-execution-path] output=${toProjectRelative(writtenPath)}`);
    }

    if (args.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      printHumanResult(result);
    }

    if (args.strict && result.verdict !== 'pass') {
      process.exit(1);
    }
  } catch (error) {
    console.error(`[compare-execution-path] ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  VALIDATION_TOOL_PATTERNS,
  GATE_TOOL_PATTERNS,
  normalizeInput,
  buildComparison,
  isValidationTool,
  isGateTool,
};