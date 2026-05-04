'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DEFAULT_TRACE_ENV = 'EXECUTION_TRACE_JSONL';
const DEFAULT_WORKFLOW_ENV = 'EXECUTION_TRACE_WORKFLOW';
const DEFAULT_TASK_ENV = 'EXECUTION_TRACE_TASK';
const DEFAULT_RUN_ID_ENV = 'EXECUTION_TRACE_RUN_ID';
const OUTPUT_TEXT_LIMIT = 1200;

let sequence = 0;

function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function hashArgs(toolName, args) {
  const normalized = {
    toolName: String(toolName || ''),
    args: Array.isArray(args) ? args.map((arg) => String(arg)) : [],
  };
  return `sha256:${crypto.createHash('sha256').update(stableJson(normalized)).digest('hex')}`;
}

function summarizeOutput(value, limit = OUTPUT_TEXT_LIMIT) {
  const text = String(value || '');
  const truncated = text.length > limit;
  const visible = truncated ? text.slice(0, limit) : text;
  return {
    bytes: Buffer.byteLength(text, 'utf8'),
    lines: text.length === 0 ? 0 : text.split(/\r?\n/).length,
    truncated,
    text: visible,
  };
}

function resolveTracePath(options = {}) {
  const tracePath = options.tracePath || process.env[DEFAULT_TRACE_ENV] || '';
  if (!tracePath) return '';
  return path.isAbsolute(tracePath) ? tracePath : path.resolve(process.cwd(), tracePath);
}

function inferStatus(result) {
  if (!result || result.error) return 'error';
  if ((result.status ?? 1) === 0) return 'success';
  return 'failed';
}

function normalizeExitCode(result) {
  if (result && Number.isInteger(result.status)) return result.status;
  return 1;
}

function buildEvent(details = {}) {
  const startedAt = details.startedAt instanceof Date ? details.startedAt : new Date(details.startedAt || Date.now());
  const endedAt = details.endedAt instanceof Date ? details.endedAt : new Date(details.endedAt || Date.now());
  const result = details.result || null;
  const event = {
    traceVersion: 'execution-trace/v1',
    kind: 'execution-trace-event',
    toolName: String(details.toolName || ''),
    argsHash: hashArgs(details.toolName, details.args),
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    durationMs: Math.max(0, endedAt.getTime() - startedAt.getTime()),
    exitCode: normalizeExitCode(result),
    status: details.status || inferStatus(result),
    sequence: sequence,
    stdoutSummary: summarizeOutput(result && result.stdout),
    stderrSummary: summarizeOutput(result && (result.stderr || (result.error && result.error.message))),
  };

  sequence += 1;

  const traceRunId = details.traceRunId || process.env[DEFAULT_RUN_ID_ENV] || '';
  const workflow = details.workflow || process.env[DEFAULT_WORKFLOW_ENV] || '';
  const task = details.task || process.env[DEFAULT_TASK_ENV] || '';
  if (traceRunId) event.traceRunId = traceRunId;
  if (workflow) event.workflow = workflow;
  if (task) event.task = task;
  if (Number.isInteger(details.attempt) && details.attempt > 0) event.attempt = details.attempt;
  if (details.metadata && typeof details.metadata === 'object') event.metadata = details.metadata;

  return event;
}

function appendJsonl(filePath, event) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, `${JSON.stringify(event)}\n`, 'utf8');
}

function recordNodeToolEvent(details = {}) {
  const tracePath = resolveTracePath(details);
  if (!tracePath) return { enabled: false, path: '' };

  try {
    const event = buildEvent(details);
    appendJsonl(tracePath, event);
    return { enabled: true, path: tracePath, event };
  } catch (error) {
    if (process.env.EXECUTION_TRACE_DEBUG) {
      process.stderr.write(`[execution-trace] write failed: ${error.message}\n`);
    }
    return { enabled: true, path: tracePath, error: error.message };
  }
}

module.exports = {
  DEFAULT_TRACE_ENV,
  DEFAULT_WORKFLOW_ENV,
  DEFAULT_TASK_ENV,
  DEFAULT_RUN_ID_ENV,
  buildEvent,
  hashArgs,
  recordNodeToolEvent,
  resolveTracePath,
  summarizeOutput,
};