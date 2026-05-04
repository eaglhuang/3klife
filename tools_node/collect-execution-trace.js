#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const Ajv2020 = require('ajv/dist/2020');
const addFormats = require('ajv-formats');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const EVENT_SCHEMA_PATH = path.join(PROJECT_ROOT, 'tools_node', 'schemas', 'execution-trace-event.schema.json');

function printHelp() {
  console.log('Usage: node tools_node/collect-execution-trace.js --input <trace.jsonl> [--output <summary.json>] [--strict]');
  console.log('');
  console.log('Options:');
  console.log('  --input <path>    JSONL trace event file emitted by execution-trace-middleware (required)');
  console.log('  --output <path>   Write aggregated execution-trace/v1 artifact to this path');
  console.log('  --strict          Exit non-zero on empty trace, schema mismatch, or broken JSONL line');
  console.log('  --json            Print the aggregated artifact JSON to stdout');
  console.log('  --help, -h        Show this help message');
}

function parseArgs(argv) {
  const args = {
    input: '',
    output: '',
    strict: false,
    json: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--input') {
      args.input = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--output') {
      args.output = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--strict') {
      args.strict = true;
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

function resolveProjectPath(inputPath) {
  return path.isAbsolute(inputPath) ? inputPath : path.join(PROJECT_ROOT, inputPath);
}

function relativePath(filePath) {
  return path.relative(PROJECT_ROOT, filePath).replace(/\\/g, '/');
}

function readJsonOrThrow(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`${label} 讀取失敗：${error.message}`);
  }
}

function createEventValidator() {
  const schema = readJsonOrThrow(EVENT_SCHEMA_PATH, 'execution trace event schema');
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  return ajv.compile(schema);
}

function formatSchemaErrors(errors) {
  return (errors || [])
    .map((error) => `${error.instancePath || '(root)'} ${error.message || 'schema error'}`.trim())
    .join('; ');
}

function loadJsonlEvents(inputPath, validateEvent) {
  const errors = [];
  const warnings = [];
  const validEvents = [];

  if (!fs.existsSync(inputPath)) {
    errors.push(`input not found: ${relativePath(inputPath)}`);
    return { validEvents, errors, warnings, rawEventCount: 0, invalidEventCount: 0 };
  }

  const raw = fs.readFileSync(inputPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  let invalidEventCount = 0;

  if (lines.length === 0) {
    warnings.push('empty trace: no JSONL events found');
  }

  lines.forEach((line, lineIndex) => {
    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch (error) {
      invalidEventCount += 1;
      errors.push(`line ${lineIndex + 1}: broken JSON (${error.message})`);
      return;
    }

    if (!validateEvent(parsed)) {
      invalidEventCount += 1;
      errors.push(`line ${lineIndex + 1}: schema mismatch (${formatSchemaErrors(validateEvent.errors)})`);
      return;
    }

    validEvents.push(parsed);
  });

  return { validEvents, errors, warnings, rawEventCount: lines.length, invalidEventCount };
}

function summarizeOutputOnly(outputSummary) {
  if (!outputSummary || typeof outputSummary !== 'object') {
    return { bytes: 0, lines: 0, truncated: false };
  }
  return {
    bytes: Number.isFinite(outputSummary.bytes) ? outputSummary.bytes : 0,
    lines: Number.isFinite(outputSummary.lines) ? outputSummary.lines : 0,
    truncated: Boolean(outputSummary.truncated),
  };
}

function normalizeEvent(event, index) {
  return {
    index,
    sequence: Number.isInteger(event.sequence) ? event.sequence : index,
    toolName: event.toolName,
    argsHash: event.argsHash,
    startedAt: event.startedAt,
    endedAt: event.endedAt,
    durationMs: event.durationMs,
    exitCode: event.exitCode,
    status: event.status,
    workflow: event.workflow || null,
    task: event.task || null,
    traceRunId: event.traceRunId || null,
    attempt: event.attempt || null,
    stdoutSummary: summarizeOutputOnly(event.stdoutSummary),
    stderrSummary: summarizeOutputOnly(event.stderrSummary),
  };
}

function incrementCount(target, key) {
  if (!key) return;
  target[key] = (target[key] || 0) + 1;
}

function buildSummary(events, rawEventCount, invalidEventCount) {
  const uniqueTools = new Set();
  const statusCounts = {};
  const workflowCounts = {};
  const taskCounts = {};
  const argsSeen = new Map();
  let totalDurationMs = 0;
  let errorCount = 0;
  let retryCount = 0;
  let firstStartedAt = null;
  let lastEndedAt = null;

  events.forEach((event) => {
    uniqueTools.add(event.toolName);
    incrementCount(statusCounts, event.status);
    incrementCount(workflowCounts, event.workflow);
    incrementCount(taskCounts, event.task);
    totalDurationMs += event.durationMs;
    if (event.status === 'failed' || event.status === 'error' || event.exitCode !== 0) {
      errorCount += 1;
    }

    const seenCount = argsSeen.get(event.argsHash) || 0;
    if (seenCount > 0) retryCount += 1;
    argsSeen.set(event.argsHash, seenCount + 1);

    if (!firstStartedAt || event.startedAt < firstStartedAt) firstStartedAt = event.startedAt;
    if (!lastEndedAt || event.endedAt > lastEndedAt) lastEndedAt = event.endedAt;
  });

  return {
    eventCount: events.length,
    rawEventCount,
    invalidEventCount,
    toolCount: uniqueTools.size,
    tools: [...uniqueTools].sort(),
    errorCount,
    retryCount,
    totalDurationMs,
    firstStartedAt,
    lastEndedAt,
    statusCounts,
    workflowCounts,
    taskCounts,
  };
}

function buildArtifact(args, loadResult) {
  const events = loadResult.validEvents.map(normalizeEvent);
  const summary = buildSummary(events, loadResult.rawEventCount, loadResult.invalidEventCount);
  const warnings = [...loadResult.warnings];
  const errors = [...loadResult.errors];
  const status = errors.length > 0 ? 'fail' : (warnings.length > 0 ? 'warn' : 'pass');

  return {
    schemaVersion: 'execution-trace/v1',
    kind: 'execution-trace',
    generatedAt: new Date().toISOString(),
    status,
    eventCount: summary.eventCount,
    toolCount: summary.toolCount,
    errorCount: summary.errorCount,
    totalDurationMs: summary.totalDurationMs,
    source: {
      input: relativePath(resolveProjectPath(args.input)),
      eventSchema: relativePath(EVENT_SCHEMA_PATH),
    },
    summary,
    events,
    warnings,
    errors,
  };
}

function writeArtifact(outputPath, artifact) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`[execution-trace] ${error.message}`);
    printHelp();
    process.exit(1);
  }

  if (args.help) {
    printHelp();
    return;
  }

  if (!args.input) {
    console.error('[execution-trace] 缺少 --input <trace.jsonl>');
    printHelp();
    process.exit(1);
  }

  let validateEvent;
  try {
    validateEvent = createEventValidator();
  } catch (error) {
    console.error(`[execution-trace] ${error.message}`);
    process.exit(1);
  }

  const inputPath = resolveProjectPath(args.input);
  const loadResult = loadJsonlEvents(inputPath, validateEvent);
  const artifact = buildArtifact(args, loadResult);

  if (args.output) {
    writeArtifact(resolveProjectPath(args.output), artifact);
  }

  if (args.json || !args.output) {
    console.log(JSON.stringify(artifact, null, 2));
  } else {
    console.log(`[execution-trace] status=${artifact.status} events=${artifact.summary.eventCount} tools=${artifact.summary.toolCount} errors=${artifact.summary.errorCount} totalDurationMs=${artifact.summary.totalDurationMs}`);
    console.log(`[execution-trace] output=${relativePath(resolveProjectPath(args.output))}`);
  }

  if (args.strict && (artifact.errors.length > 0 || artifact.warnings.length > 0)) {
    process.exit(1);
  }
}

main();