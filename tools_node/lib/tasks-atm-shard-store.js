'use strict';

const fs = require('fs');
const path = require('path');

const TASKS_ATM_INDEX_REL = 'docs/tasks/tasks-atm.json';
const TASKS_ATM_PARTS_DIR_REL = 'docs/tasks/tasks-atm';
const DEFAULT_MAX_PART_BYTES = 10 * 1024;
const DEFAULT_MAX_PART_LINES = 300;

function normalizeStatus(status) {
  const value = String(status || 'open').trim().toLowerCase();
  if (value === 'done' || value === 'closed' || value === 'completed') {
    return 'done';
  }
  if (value === 'in-progress' || value === 'in_progress' || value === 'in progress') {
    return 'in-progress';
  }
  if (value === 'blocked') {
    return 'blocked';
  }
  return value || 'open';
}

function recalcSummary(tasks) {
  const summary = {
    done: 0,
    in_progress: 0,
    open: 0,
    total: tasks.length,
  };

  for (const task of tasks) {
    const status = normalizeStatus(task && task.status);
    if (status === 'done') {
      summary.done += 1;
    } else if (status === 'in-progress') {
      summary.in_progress += 1;
    } else {
      summary.open += 1;
    }
  }

  return summary;
}

function relPath(projectRoot, filePath) {
  return path.relative(projectRoot, filePath).replace(/\\/g, '/');
}

function getStorePaths(projectRoot) {
  return {
    indexPath: path.join(projectRoot, TASKS_ATM_INDEX_REL),
    partsDir: path.join(projectRoot, TASKS_ATM_PARTS_DIR_REL),
    shardRcPath: path.join(projectRoot, TASKS_ATM_PARTS_DIR_REL, '.shardrc.json'),
  };
}

function isTasksAtmIndexPath(projectRoot, filePath) {
  return path.resolve(filePath) === path.resolve(path.join(projectRoot, TASKS_ATM_INDEX_REL));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function serializePart(tasks) {
  return `${JSON.stringify(tasks, null, 2)}\n`;
}

function calcTextLineCount(text) {
  const trimmed = text.endsWith('\n') ? text.slice(0, -1) : text;
  return trimmed.length === 0 ? 0 : trimmed.split('\n').length;
}

function calcPartMetrics(tasks) {
  const text = serializePart(tasks);
  return {
    text,
    bytes: Buffer.byteLength(text, 'utf8'),
    lines: calcTextLineCount(text),
    count: tasks.length,
  };
}

function readTasksAtmStore(projectRoot) {
  const paths = getStorePaths(projectRoot);
  if (!fs.existsSync(paths.indexPath)) {
    throw new Error(`${TASKS_ATM_INDEX_REL} not found`);
  }

  const indexData = readJson(paths.indexPath);
  if (Array.isArray(indexData.tasks)) {
    return {
      tasks: indexData.tasks,
      summary: indexData.summary || recalcSummary(indexData.tasks),
      mode: 'aggregate',
    };
  }

  if (!fs.existsSync(paths.shardRcPath)) {
    throw new Error(`${relPath(projectRoot, paths.indexPath)} is an index stub but ${relPath(projectRoot, paths.shardRcPath)} is missing`);
  }

  const shardRc = readJson(paths.shardRcPath);
  const shards = Array.isArray(shardRc.shards) ? shardRc.shards : [];
  const tasks = [];
  for (const shard of shards) {
    const partPath = path.join(paths.partsDir, `${shard.name}.json`);
    if (!fs.existsSync(partPath)) {
      throw new Error(`Missing ATM shard part: ${relPath(projectRoot, partPath)}`);
    }
    const data = readJson(partPath);
    if (!Array.isArray(data)) {
      throw new Error(`ATM shard part must be a JSON array: ${relPath(projectRoot, partPath)}`);
    }
    tasks.push(...data);
  }

  return {
    tasks,
    summary: indexData.summary || recalcSummary(tasks),
    mode: 'thin-index',
  };
}

function splitTasksIntoParts(tasks, options = {}) {
  const maxPartBytes = options.maxPartBytes || DEFAULT_MAX_PART_BYTES;
  const maxPartLines = options.maxPartLines || DEFAULT_MAX_PART_LINES;
  const parts = [];

  let batch = [];
  let batchStart = 0;

  const flushBatch = (endExclusive) => {
    if (batch.length === 0) {
      return;
    }
    const metrics = calcPartMetrics(batch);
    if (metrics.bytes > maxPartBytes || metrics.lines > maxPartLines) {
      const taskId = batch[0] && batch[0].id ? batch[0].id : '<unknown>';
      throw new Error(`ATM shard part starting at ${taskId} exceeds thresholds (${metrics.bytes} bytes, ${metrics.lines} lines)`);
    }
    parts.push({
      name: `tasks-atm-part-${parts.length + 1}`,
      title: `Part ${parts.length + 1} (items ${batchStart + 1}-${endExclusive})`,
      range: [batchStart, endExclusive - 1],
      tasks: batch,
      metrics,
    });
    batch = [];
    batchStart = endExclusive;
  };

  for (let index = 0; index < tasks.length; index += 1) {
    const candidate = batch.concat(tasks[index]);
    const metrics = calcPartMetrics(candidate);
    if (batch.length > 0 && (metrics.bytes > maxPartBytes || metrics.lines > maxPartLines)) {
      flushBatch(index);
    }
    batch.push(tasks[index]);
  }

  flushBatch(tasks.length);
  return parts;
}

function buildIndexStub(projectRoot, parts, summary, options = {}) {
  const maxPartBytes = options.maxPartBytes || DEFAULT_MAX_PART_BYTES;
  const maxPartLines = options.maxPartLines || DEFAULT_MAX_PART_LINES;
  return {
    kind: 'task-aggregate-index',
    _note: `Thin index stub. Full ATM tasks live in ${TASKS_ATM_PARTS_DIR_REL}/`,
    _usage: `Read ${TASKS_ATM_PARTS_DIR_REL}/tasks-atm-part-*.json as needed`,
    _rebuild: 'node tools_node/rebuild-tasks-atm-auto-parts.js',
    _sourceOfTruth: `${TASKS_ATM_PARTS_DIR_REL}/`,
    thresholds: {
      maxPartKB: Math.round((maxPartBytes / 1024) * 10) / 10,
      maxPartLines,
    },
    summary,
    shards: parts.map((part) => ({
      name: part.name,
      title: part.title,
      path: `${TASKS_ATM_PARTS_DIR_REL}/${part.name}.json`,
      count: part.metrics.count,
      bytes: part.metrics.bytes,
      lines: part.metrics.lines,
      range: part.range,
    })),
  };
}

function writeTasksAtmStore(projectRoot, tasks, options = {}) {
  const paths = getStorePaths(projectRoot);
  const maxPartBytes = options.maxPartBytes || DEFAULT_MAX_PART_BYTES;
  const maxPartLines = options.maxPartLines || DEFAULT_MAX_PART_LINES;
  const dryRun = Boolean(options.dryRun);
  const parts = splitTasksIntoParts(tasks, { maxPartBytes, maxPartLines });
  const summary = recalcSummary(tasks);
  const indexStub = buildIndexStub(projectRoot, parts, summary, { maxPartBytes, maxPartLines });
  const shardRc = {
    _autoGenerated: true,
    _generatedBy: 'tasks-atm-shard-store',
    _thresholdKB: Math.round((maxPartBytes / 1024) * 10) / 10,
    _thresholdLines: maxPartLines,
    version: 1,
    source: '../tasks-atm.json',
    indexTitle: 'ATM Tasks (ATM-*) (thin-index parts)',
    type: 'auto-parts',
    shards: parts.map((part) => ({
      name: part.name,
      title: part.title,
      range: part.range,
    })),
  };

  if (!dryRun) {
    fs.mkdirSync(paths.partsDir, { recursive: true });
    for (const entry of fs.readdirSync(paths.partsDir)) {
      if (entry === '.shardrc.json' || /^tasks-atm-part-\d+\.json$/.test(entry)) {
        fs.rmSync(path.join(paths.partsDir, entry), { force: true });
      }
    }

    for (const part of parts) {
      writeJson(path.join(paths.partsDir, `${part.name}.json`), part.tasks);
    }
    writeJson(paths.shardRcPath, shardRc);
    writeJson(paths.indexPath, indexStub);
  }

  return {
    indexStub,
    shardRc,
    parts,
    summary,
    paths: {
      indexPath: relPath(projectRoot, paths.indexPath),
      partsDir: relPath(projectRoot, paths.partsDir),
      shardRcPath: relPath(projectRoot, paths.shardRcPath),
    },
  };
}

function upsertTaskInTasksAtmStore(projectRoot, task, options = {}) {
  const state = readTasksAtmStore(projectRoot);
  const tasks = [...state.tasks];
  const index = tasks.findIndex((item) => item && item.id === task.id);
  if (index >= 0) {
    tasks[index] = task;
  } else {
    tasks.push(task);
  }
  return writeTasksAtmStore(projectRoot, tasks, options);
}

module.exports = {
  DEFAULT_MAX_PART_BYTES,
  DEFAULT_MAX_PART_LINES,
  TASKS_ATM_INDEX_REL,
  TASKS_ATM_PARTS_DIR_REL,
  isTasksAtmIndexPath,
  readTasksAtmStore,
  recalcSummary,
  upsertTaskInTasksAtmStore,
  writeTasksAtmStore,
};