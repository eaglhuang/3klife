#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const storage = require('./lib/turn-artifact-storage');
const { queryTurnArtifactHistory } = require('./query-turn-artifact-history');

const PROJECT_ROOT = storage.PROJECT_ROOT;
const DEFAULT_ARTIFACT_ROOT = storage.TURN_ARTIFACT_STORAGE_POLICY.formalRoot;
const DEFAULT_TRACE_ROOT = 'artifacts/execution-traces';

function printHelp() {
  console.log('Usage: node tools_node/accumulate-harness-metrics.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --artifacts <path>   Formal turn artifact root (default: artifacts/turn-artifacts)');
  console.log('  --traces <path>      Execution trace artifact root (default: artifacts/execution-traces)');
  console.log('  --workflow <name>    Filter by exact workflow');
  console.log('  --from <YYYY-MM-DD>  Filter generatedAt date >= from');
  console.log('  --to <YYYY-MM-DD>    Filter generatedAt date <= to');
  console.log('  --date <YYYY-MM-DD>  Filter by exact generatedAt date');
  console.log('  --output <path>      Write metrics JSON to this path');
  console.log('  --json               Print metrics JSON to stdout');
  console.log('  --help, -h           Show this help message');
}

function parseArgs(argv) {
  const args = {
    artifacts: DEFAULT_ARTIFACT_ROOT,
    traces: DEFAULT_TRACE_ROOT,
    workflow: '',
    from: '',
    to: '',
    date: '',
    output: '',
    json: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--artifacts') {
      args.artifacts = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--traces') {
      args.traces = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--workflow') {
      args.workflow = argv[index + 1] || '';
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
    if (token === '--date') {
      args.date = argv[index + 1] || '';
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

function divide(numerator, denominator) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return null;
  }
  return numerator / denominator;
}

function sumNumbers(list, getter) {
  return list.reduce((sum, item) => sum + Number(getter(item) || 0), 0);
}

function normalizeHandoffVerdict(artifact) {
  const candidates = [
    artifact && artifact.handoffValidation && artifact.handoffValidation.status,
    artifact && artifact.handoffDiff && artifact.handoffDiff.status,
  ];

  for (const candidate of candidates) {
    const status = String(candidate || '').trim();
    if (status) {
      return status;
    }
  }

  return '';
}

function buildJoinKeyFromParts(date, workflow, task) {
  return `${String(date || '')}|${String(workflow || '')}|${String(task || '')}`;
}

function buildArtifactJoinKey(entry) {
  return buildJoinKeyFromParts(entry.date, entry.workflow, entry.task);
}

function buildTraceJoinKey(trace) {
  const firstStartedAt = String(trace.firstStartedAt || '');
  const generatedAt = String(trace.generatedAt || '');
  const dateSource = firstStartedAt || generatedAt;
  const date = dateSource.slice(0, 10);
  const workflowCounts = trace.workflowCounts && typeof trace.workflowCounts === 'object'
    ? Object.keys(trace.workflowCounts).filter(Boolean)
    : [];
  const taskCounts = trace.taskCounts && typeof trace.taskCounts === 'object'
    ? Object.keys(trace.taskCounts).filter(Boolean)
    : [];
  const workflow = workflowCounts.length === 1 ? workflowCounts[0] : '';
  const task = taskCounts.length === 1 ? taskCounts[0] : '';
  return buildJoinKeyFromParts(date, workflow, task);
}

function parseTraceArtifact(filePath) {
  const trace = readJsonOrThrow(filePath, 'execution trace');
  if (!trace || trace.schemaVersion !== 'execution-trace/v1' || trace.kind !== 'execution-trace') {
    return {
      ok: false,
      path: relativePath(filePath),
      reason: 'unsupported-trace-version',
      detail: `schemaVersion=${trace && trace.schemaVersion ? trace.schemaVersion : '(missing)'} kind=${trace && trace.kind ? trace.kind : '(missing)'}`,
    };
  }

  const summary = trace.summary && typeof trace.summary === 'object' ? trace.summary : {};
  return {
    ok: true,
    path: relativePath(filePath),
    trace: {
      path: relativePath(filePath),
      generatedAt: String(trace.generatedAt || ''),
      status: String(trace.status || 'unknown'),
      eventCount: Number(trace.eventCount ?? summary.eventCount ?? 0),
      toolCount: Number(trace.toolCount ?? summary.toolCount ?? 0),
      errorCount: Number(trace.errorCount ?? summary.errorCount ?? 0),
      retryCount: Number(summary.retryCount ?? 0),
      totalDurationMs: Number(trace.totalDurationMs ?? summary.totalDurationMs ?? 0),
      firstStartedAt: summary.firstStartedAt || null,
      lastEndedAt: summary.lastEndedAt || null,
      workflowCounts: summary.workflowCounts && typeof summary.workflowCounts === 'object' ? summary.workflowCounts : {},
      taskCounts: summary.taskCounts && typeof summary.taskCounts === 'object' ? summary.taskCounts : {},
      statusCounts: summary.statusCounts && typeof summary.statusCounts === 'object' ? summary.statusCounts : {},
    },
  };
}

function loadTraceHistory(rootPath, filters) {
  const absoluteRoot = resolveProjectPath(rootPath || DEFAULT_TRACE_ROOT);
  const files = walkJsonFiles(absoluteRoot);
  const grouped = new Map();
  const skipped = [];

  files.forEach((filePath) => {
    let parsed;
    try {
      parsed = parseTraceArtifact(filePath);
    } catch (error) {
      skipped.push({
        path: relativePath(filePath),
        reason: 'broken-json',
        detail: error.message,
      });
      return;
    }

    if (!parsed.ok) {
      skipped.push({ path: parsed.path, reason: parsed.reason, detail: parsed.detail });
      return;
    }

    const trace = parsed.trace;
    const joinKey = buildTraceJoinKey(trace);
    const generatedDate = String(trace.generatedAt || '').slice(0, 10);
    const workflowList = Object.keys(trace.workflowCounts || {}).filter(Boolean);
    const primaryWorkflow = workflowList.length === 1 ? workflowList[0] : '';

    if (filters.workflow && primaryWorkflow !== filters.workflow) {
      return;
    }
    if (filters.date && generatedDate !== filters.date) {
      return;
    }
    if (filters.from && generatedDate < filters.from) {
      return;
    }
    if (filters.to && generatedDate > filters.to) {
      return;
    }

    const existing = grouped.get(joinKey);
    if (!existing) {
      grouped.set(joinKey, {
        joinKey,
        date: generatedDate,
        workflow: primaryWorkflow,
        task: Object.keys(trace.taskCounts || {}).filter(Boolean).length === 1 ? Object.keys(trace.taskCounts || {}).filter(Boolean)[0] : '',
        artifactCount: 1,
        paths: [trace.path],
        traces: [trace],
        summary: {
          traceArtifactCount: 1,
          traceStatusCounts: { [trace.status]: 1 },
          eventCount: trace.eventCount,
          toolCount: trace.toolCount,
          errorCount: trace.errorCount,
          retryCount: trace.retryCount,
          totalDurationMs: trace.totalDurationMs,
        },
      });
      return;
    }

    existing.artifactCount += 1;
    existing.paths.push(trace.path);
    existing.traces.push(trace);
    existing.summary.traceArtifactCount += 1;
    existing.summary.traceStatusCounts[trace.status] = (existing.summary.traceStatusCounts[trace.status] || 0) + 1;
    existing.summary.eventCount += trace.eventCount;
    existing.summary.toolCount += trace.toolCount;
    existing.summary.errorCount += trace.errorCount;
    existing.summary.retryCount += trace.retryCount;
    existing.summary.totalDurationMs += trace.totalDurationMs;
  });

  return {
    root: relativePath(absoluteRoot),
    scannedFileCount: files.length,
    skipped,
    groups: grouped,
  };
}

function loadArtifactDetails(entries) {
  return entries.map((entry) => {
    const absolutePath = resolveProjectPath(entry.path);
    const artifact = readJsonOrThrow(absolutePath, 'turn artifact');
    return {
      entry,
      artifact,
      joinKey: buildArtifactJoinKey(entry),
      handoffVerdict: normalizeHandoffVerdict(artifact),
    };
  });
}

function accumulateHarnessMetrics(options = {}) {
  const filters = {
    workflow: String(options.workflow || '').trim(),
    date: normalizeDatePrefix(options.date || ''),
    from: normalizeDatePrefix(options.from || ''),
    to: normalizeDatePrefix(options.to || ''),
  };

  const artifactHistory = queryTurnArtifactHistory({
    root: options.artifacts || DEFAULT_ARTIFACT_ROOT,
    workflow: filters.workflow,
    date: filters.date,
    from: filters.from,
    to: filters.to,
  });
  const artifactDetails = loadArtifactDetails(artifactHistory.entries);
  const traceHistory = loadTraceHistory(options.traces || DEFAULT_TRACE_ROOT, filters);

  let handoffAvailableCount = 0;
  let handoffMismatchCount = 0;
  let missingHandoffCount = 0;
  let traceJoinedCount = 0;
  let traceMissingCount = 0;
  let traceRetryCount = 0;
  let traceErrorTurnCount = 0;
  let traceErrorCount = 0;
  let totalTraceDurationMs = 0;
  let duplicateTraceJoinKeys = 0;

  const turns = artifactDetails.map(({ entry, joinKey, handoffVerdict }) => {
    const traceGroup = traceHistory.groups.get(joinKey) || null;
    const hasTrace = !!traceGroup;
    const hasHandoff = handoffVerdict.length > 0;
    if (hasTrace) {
      traceJoinedCount += 1;
      traceRetryCount += Number(traceGroup.summary.retryCount || 0);
      traceErrorCount += Number(traceGroup.summary.errorCount || 0);
      totalTraceDurationMs += Number(traceGroup.summary.totalDurationMs || 0);
      if (Number(traceGroup.summary.errorCount || 0) > 0) {
        traceErrorTurnCount += 1;
      }
      if (Number(traceGroup.summary.traceArtifactCount || 0) > 1) {
        duplicateTraceJoinKeys += 1;
      }
    } else {
      traceMissingCount += 1;
    }

    if (hasHandoff) {
      handoffAvailableCount += 1;
      if (handoffVerdict !== 'pass' && handoffVerdict !== 'ok' && handoffVerdict !== 'valid' && handoffVerdict !== 'attached') {
        handoffMismatchCount += 1;
      }
    } else {
      missingHandoffCount += 1;
    }

    return {
      joinKey,
      artifactPath: entry.path,
      workflow: entry.workflow,
      task: entry.task,
      generatedAt: entry.generatedAt,
      date: entry.date,
      estTokens: entry.estTokens,
      totalBytes: entry.totalBytes,
      artifactStatus: entry.status,
      handoffVerdict: hasHandoff ? handoffVerdict : 'missing',
      trace: hasTrace
        ? {
            available: true,
            traceArtifactCount: traceGroup.summary.traceArtifactCount,
            paths: traceGroup.paths,
            retryCount: traceGroup.summary.retryCount,
            errorCount: traceGroup.summary.errorCount,
            totalDurationMs: traceGroup.summary.totalDurationMs,
            traceStatusCounts: traceGroup.summary.traceStatusCounts,
          }
        : {
            available: false,
          },
    };
  });

  const turnCount = turns.length;
  const avgContextTokens = divide(sumNumbers(turns, (turn) => turn.estTokens), turnCount);
  const avgContextBytes = divide(sumNumbers(turns, (turn) => turn.totalBytes), turnCount);
  const artifactCoverage = divide(artifactHistory.scan.matchedArtifactCount, artifactHistory.scan.matchedArtifactCount + artifactHistory.scan.skippedCount);
  const traceCoverageRate = divide(traceJoinedCount, turnCount);
  const handoffCoverageRate = divide(handoffAvailableCount, turnCount);
  const handoffMismatchRate = divide(handoffMismatchCount, handoffAvailableCount);
  const gateFailRate = divide(traceErrorTurnCount, traceJoinedCount);
  const avgTraceDurationMs = divide(totalTraceDurationMs, traceJoinedCount);

  return {
    schemaVersion: 'harness-metrics-summary/v1',
    kind: 'harness-metrics-summary',
    generatedAt: new Date().toISOString(),
    joinStrategy: {
      key: 'generatedAtDate + workflow + task',
      artifactKeyFields: ['generatedAt(date)', 'workflow', 'task'],
      traceKeyFields: ['generatedAt(date)', 'summary.workflowCounts', 'summary.taskCounts'],
      note: 'Same-day same-workflow same-task traces are grouped together; duplicate trace groups are counted explicitly instead of silently discarded.',
    },
    filters,
    sources: {
      artifacts: artifactHistory.root,
      traces: traceHistory.root,
    },
    scan: {
      artifactScan: artifactHistory.scan,
      traceScan: {
        scannedFileCount: traceHistory.scannedFileCount,
        matchedGroupCount: traceHistory.groups.size,
        skippedCount: traceHistory.skipped.length,
      },
    },
    metrics: {
      turnCount,
      avgContextTokens,
      avgContextBytes,
      artifactCoverage,
      handoffMismatchRate,
      handoffAvailableCount,
      missingHandoffCount,
      traceRetryCount,
      traceCoverageRate,
      traceJoinedCount,
      traceMissingCount,
      gateFailRate,
      traceErrorCount,
      avgTraceDurationMs,
      duplicateTraceJoinKeys,
    },
    missingData: {
      traceMissingCount,
      handoffMissingCount: missingHandoffCount,
      duplicateTraceJoinKeys,
    },
    skipped: {
      artifacts: artifactHistory.skipped,
      traces: traceHistory.skipped,
    },
    turns,
  };
}

function writeOutput(result, outputPath) {
  const absolutePath = resolveProjectPath(outputPath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  return absolutePath;
}

function printSummary(result) {
  console.log(`[accumulate-harness-metrics] turns=${result.metrics.turnCount} avgContextTokens=${result.metrics.avgContextTokens ?? 'n/a'} artifactCoverage=${result.metrics.artifactCoverage ?? 'n/a'}`);
  console.log(`[accumulate-harness-metrics] traceCoverage=${result.metrics.traceCoverageRate ?? 'n/a'} traceRetryCount=${result.metrics.traceRetryCount} gateFailRate=${result.metrics.gateFailRate ?? 'n/a'}`);
  console.log(`[accumulate-harness-metrics] handoffMismatchRate=${result.metrics.handoffMismatchRate ?? 'n/a'} missingHandoff=${result.metrics.missingHandoffCount} missingTrace=${result.metrics.traceMissingCount}`);
  if (result.skipped.artifacts.length > 0) {
    result.skipped.artifacts.forEach((entry) => {
      console.log(`[accumulate-harness-metrics] skipped artifact ${entry.path}: ${entry.reason} ${entry.detail}`.trim());
    });
  }
  if (result.skipped.traces.length > 0) {
    result.skipped.traces.forEach((entry) => {
      console.log(`[accumulate-harness-metrics] skipped trace ${entry.path}: ${entry.reason} ${entry.detail}`.trim());
    });
  }
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`[accumulate-harness-metrics] ${error.message}`);
    printHelp();
    process.exit(1);
  }

  if (args.help) {
    printHelp();
    return;
  }

  try {
    const result = accumulateHarnessMetrics(args);
    if (args.output) {
      const writtenPath = writeOutput(result, args.output);
      console.log(`[accumulate-harness-metrics] output=${relativePath(writtenPath)}`);
    }
    if (args.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    printSummary(result);
  } catch (error) {
    console.error(`[accumulate-harness-metrics] ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  buildArtifactJoinKey,
  buildTraceJoinKey,
  loadTraceHistory,
  accumulateHarnessMetrics,
};