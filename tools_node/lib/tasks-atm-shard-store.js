'use strict';

const fs = require('fs');
const path = require('path');

const TASKS_ATM_INDEX_REL = 'docs/tasks/tasks-atm.json';
const TASKS_ATM_PARTS_DIR_REL = 'docs/tasks/tasks-atm';
const DEFAULT_MAX_PART_BYTES = 10 * 1024;
const DEFAULT_MAX_PART_LINES = 300;
const STABLE_ASSIGNMENT_LAYOUT = 'sticky-least-pool';
const STABLE_ASSIGNMENT_POOL_FRACTION = 0.15;
const STABLE_ASSIGNMENT_MIN_POOL = 4;

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

function writeJsonIfChanged(filePath, value) {
  const next = `${JSON.stringify(value, null, 2)}\n`;
  if (fs.existsSync(filePath)) {
    const current = fs.readFileSync(filePath, 'utf8');
    if (current === next) {
      return false;
    }
  }
  fs.writeFileSync(filePath, next, 'utf8');
  return true;
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

function extractPartNumber(partName) {
  const match = String(partName || '').match(/^tasks-atm-part-(\d+)$/);
  return match ? Number.parseInt(match[1], 10) : Number.POSITIVE_INFINITY;
}

function comparePartNames(left, right) {
  const leftNumber = extractPartNumber(left);
  const rightNumber = extractPartNumber(right);
  if (leftNumber !== rightNumber) {
    return leftNumber - rightNumber;
  }
  return String(left || '').localeCompare(String(right || ''), 'en', { numeric: true, sensitivity: 'base' });
}

function stableHashFloat(value) {
  let hash = 2166136261;
  const text = String(value || '');
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0xFFFFFFFF;
}

function compareTaskIds(left, right) {
  const leftId = String(left && left.id ? left.id : '');
  const rightId = String(right && right.id ? right.id : '');
  return leftId.localeCompare(rightId, 'en', { numeric: true, sensitivity: 'base' });
}

function sortTasksByTaskId(tasks) {
  return [...(Array.isArray(tasks) ? tasks : [])].sort(compareTaskIds);
}

function createPartRecord({ name, title, range, layout, stride, offset, indices, tasks, metrics }) {
  return {
    name,
    title,
    range,
    layout,
    stride,
    offset,
    indices,
    tasks,
    metrics,
  };
}

function titleForPart(name, layout, count) {
  const number = extractPartNumber(name);
  const label = Number.isFinite(number) ? number : name;
  return `Part ${label} (${layout}, ${count} items)`;
}

function titleForShardDefinition(name) {
  const number = extractPartNumber(name);
  const label = Number.isFinite(number) ? number : name;
  return `Part ${label}`;
}

function buildContiguousParts(tasks, maxPartBytes, maxPartLines) {
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

    const indices = batch.map((_, offset) => batchStart + offset);
    parts.push(createPartRecord({
      name: `tasks-atm-part-${parts.length + 1}`,
      title: `Part ${parts.length + 1} (contiguous, ${batch.length} items)`,
      range: [batchStart, endExclusive - 1],
      layout: 'contiguous',
      stride: 1,
      offset: 0,
      indices,
      tasks: batch,
      metrics,
    }));

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

function buildStripedParts(tasks, partCount, maxPartBytes, maxPartLines) {
  if (partCount <= 1) {
    return null;
  }

  const buckets = Array.from({ length: partCount }, () => ({ tasks: [], indices: [] }));

  tasks.forEach((task, index) => {
    const bucketIndex = index % partCount;
    buckets[bucketIndex].tasks.push(task);
    buckets[bucketIndex].indices.push(index);
  });

  const parts = [];

  for (let bucketIndex = 0; bucketIndex < buckets.length; bucketIndex += 1) {
    const bucket = buckets[bucketIndex];
    if (bucket.tasks.length === 0) {
      continue;
    }

    const metrics = calcPartMetrics(bucket.tasks);
    if (metrics.bytes > maxPartBytes || metrics.lines > maxPartLines) {
      return null;
    }

    const firstIndex = bucket.indices[0];
    const lastIndex = bucket.indices[bucket.indices.length - 1];
    parts.push(createPartRecord({
      name: `tasks-atm-part-${parts.length + 1}`,
      title: `Part ${parts.length + 1} (striped, ${bucket.tasks.length} items)`,
      range: [firstIndex, lastIndex],
      layout: 'striped',
      stride: partCount,
      offset: bucketIndex,
      indices: bucket.indices,
      tasks: bucket.tasks,
      metrics,
    }));
  }

  return parts;
}

function buildBalancedParts(tasks, partCount, maxPartBytes, maxPartLines) {
  if (partCount <= 1) {
    return null;
  }

  const entries = tasks.map((task, index) => {
    const serialized = `${JSON.stringify(task, null, 2)}\n`;
    return {
      task,
      index,
      bytes: Buffer.byteLength(serialized, 'utf8'),
      lines: calcTextLineCount(serialized),
    };
  }).sort((left, right) => {
    if (right.bytes !== left.bytes) {
      return right.bytes - left.bytes;
    }
    if (right.lines !== left.lines) {
      return right.lines - left.lines;
    }
    return compareTaskIds(left.task, right.task) || left.index - right.index;
  });

  const buckets = Array.from({ length: partCount }, () => ({ entries: [] }));

  for (const entry of entries) {
    let chosenBucketIndex = -1;
    let chosenScore = Infinity;
    let chosenBytes = Infinity;
    let chosenLines = Infinity;

    for (let bucketIndex = 0; bucketIndex < buckets.length; bucketIndex += 1) {
      const bucket = buckets[bucketIndex];
      const candidateTasks = bucket.entries.map((item) => item.task).concat(entry.task);
      const metrics = calcPartMetrics(candidateTasks);
      if (metrics.bytes > maxPartBytes || metrics.lines > maxPartLines) {
        continue;
      }

      const score = Math.max(metrics.bytes / maxPartBytes, metrics.lines / maxPartLines);
      if (
        score < chosenScore
        || (
          score === chosenScore
          && (
            metrics.bytes < chosenBytes
            || (
              metrics.bytes === chosenBytes
              && (
                metrics.lines < chosenLines
                || (
                  metrics.lines === chosenLines
                  && bucketIndex < chosenBucketIndex
                )
              )
            )
          )
        )
      ) {
        chosenBucketIndex = bucketIndex;
        chosenScore = score;
        chosenBytes = metrics.bytes;
        chosenLines = metrics.lines;
      }
    }

    if (chosenBucketIndex < 0) {
      return null;
    }

    buckets[chosenBucketIndex].entries.push(entry);
  }

  const parts = [];

  for (let bucketIndex = 0; bucketIndex < buckets.length; bucketIndex += 1) {
    const bucket = buckets[bucketIndex];
    if (bucket.entries.length === 0) {
      continue;
    }

    const orderedEntries = bucket.entries.slice().sort((left, right) => left.index - right.index);
    const tasksForPart = orderedEntries.map((entry) => entry.task);
    const indices = orderedEntries.map((entry) => entry.index);
    const metrics = calcPartMetrics(tasksForPart);
    if (metrics.bytes > maxPartBytes || metrics.lines > maxPartLines) {
      return null;
    }

    parts.push(createPartRecord({
      name: `tasks-atm-part-${parts.length + 1}`,
      title: `Part ${parts.length + 1} (striped, ${tasksForPart.length} items)`,
      range: [indices[0], indices[indices.length - 1]],
      layout: 'striped',
      stride: partCount,
      offset: bucketIndex,
      indices,
      tasks: tasksForPart,
      metrics,
    }));
  }

  return parts;
}

function readExistingPartNames(paths) {
  const names = [];
  if (fs.existsSync(paths.shardRcPath)) {
    try {
      const shardRc = readJson(paths.shardRcPath);
      for (const shard of Array.isArray(shardRc.shards) ? shardRc.shards : []) {
        if (shard && shard.name) {
          names.push(String(shard.name));
        }
      }
    } catch {
      // Fall back to the files on disk below.
    }
  }

  if (fs.existsSync(paths.partsDir)) {
    for (const entryName of fs.readdirSync(paths.partsDir)) {
      const match = entryName.match(/^(tasks-atm-part-\d+)\.json$/);
      if (match) {
        names.push(match[1]);
      }
    }
  }

  return Array.from(new Set(names)).sort(comparePartNames);
}

function readExistingPartRecords(paths) {
  return readExistingPartNames(paths).map((name) => {
    const partPath = path.join(paths.partsDir, `${name}.json`);
    const tasks = fs.existsSync(partPath) ? readJson(partPath) : [];
    if (!Array.isArray(tasks)) {
      throw new Error(`ATM shard part must be a JSON array: ${partPath}`);
    }
    return {
      name,
      tasks: sortTasksByTaskId(tasks),
    };
  });
}

function makePartName(parts) {
  const maxNumber = parts.reduce((maxValue, part) => {
    const number = extractPartNumber(part.name);
    return Number.isFinite(number) ? Math.max(maxValue, number) : maxValue;
  }, 0);
  return `tasks-atm-part-${maxNumber + 1}`;
}

function partPathRel(partName) {
  return `${TASKS_ATM_PARTS_DIR_REL}/${partName}.json`;
}

function collectLockedPartNames(projectRoot) {
  const lockDir = path.join(projectRoot, '.task-locks');
  const locked = new Set();
  if (!fs.existsSync(lockDir)) {
    return locked;
  }

  for (const entryName of fs.readdirSync(lockDir)) {
    if (!entryName.endsWith('.lock.json')) {
      continue;
    }
    try {
      const lock = readJson(path.join(lockDir, entryName));
      for (const filePath of Array.isArray(lock.files) ? lock.files : []) {
        const normalized = String(filePath || '').replace(/\\/g, '/');
        const match = normalized.match(/^docs\/tasks\/tasks-atm\/(tasks-atm-part-\d+)\.json$/);
        if (match) {
          locked.add(match[1]);
        }
      }
    } catch {
      // Ignore broken transient locks; lock validation still owns enforcement.
    }
  }
  return locked;
}

function assertSingleTaskFits(task, maxPartBytes, maxPartLines) {
  const metrics = calcPartMetrics([task]);
  if (metrics.bytes > maxPartBytes || metrics.lines > maxPartLines) {
    const taskId = task && task.id ? task.id : '<unknown>';
    throw new Error(`ATM task ${taskId} exceeds one-part thresholds (${metrics.bytes} bytes, ${metrics.lines} lines)`);
  }
}

function canFitTask(part, task, maxPartBytes, maxPartLines) {
  const metrics = calcPartMetrics(part.tasks.concat(task));
  return metrics.bytes <= maxPartBytes && metrics.lines <= maxPartLines
    ? metrics
    : null;
}

function chooseStablePart(parts, task, options) {
  const maxPartBytes = options.maxPartBytes;
  const maxPartLines = options.maxPartLines;
  const lockedPartNames = options.lockedPartNames || new Set();
  const excludePartName = options.excludePartName || '';
  const candidates = [];

  for (const part of parts) {
    if (part.name === excludePartName) {
      continue;
    }
    const metrics = canFitTask(part, task, maxPartBytes, maxPartLines);
    if (!metrics) {
      continue;
    }
    candidates.push({
      part,
      metrics,
      fill: Math.max(metrics.bytes / maxPartBytes, metrics.lines / maxPartLines),
      locked: lockedPartNames.has(part.name),
    });
  }

  if (candidates.length === 0) {
    return null;
  }

  const unlockedCandidates = candidates.filter((candidate) => !candidate.locked);
  const poolSource = unlockedCandidates.length > 0 ? unlockedCandidates : candidates;
  poolSource.sort((left, right) => {
    if (left.fill !== right.fill) {
      return left.fill - right.fill;
    }
    if (left.metrics.lines !== right.metrics.lines) {
      return left.metrics.lines - right.metrics.lines;
    }
    if (left.metrics.bytes !== right.metrics.bytes) {
      return left.metrics.bytes - right.metrics.bytes;
    }
    return comparePartNames(left.part.name, right.part.name);
  });

  const poolSize = Math.min(
    poolSource.length,
    Math.max(STABLE_ASSIGNMENT_MIN_POOL, Math.ceil(poolSource.length * STABLE_ASSIGNMENT_POOL_FRACTION)),
  );
  const leastLoadedPool = poolSource.slice(0, poolSize);

  leastLoadedPool.sort((left, right) => {
    const leftHash = stableHashFloat(`${task && task.id ? task.id : ''}|${left.part.name}`);
    const rightHash = stableHashFloat(`${task && task.id ? task.id : ''}|${right.part.name}`);
    if (leftHash !== rightHash) {
      return rightHash - leftHash;
    }
    return comparePartNames(left.part.name, right.part.name);
  });

  return leastLoadedPool[0].part;
}

function ensurePartForTask(parts, task, options = {}) {
  assertSingleTaskFits(task, options.maxPartBytes, options.maxPartLines);
  let chosenPart = chooseStablePart(parts, task, options);
  if (!chosenPart) {
    chosenPart = {
      name: makePartName(parts),
      tasks: [],
    };
    parts.push(chosenPart);
  }
  chosenPart.tasks.push(task);
  return chosenPart;
}

function isPartOverLimit(part, maxPartBytes, maxPartLines) {
  const metrics = calcPartMetrics(part.tasks);
  return metrics.bytes > maxPartBytes || metrics.lines > maxPartLines;
}

function taskMovePriority(task, newTaskIds) {
  const id = String(task && task.id ? task.id : '');
  const metrics = calcPartMetrics([task]);
  return {
    isNew: newTaskIds.has(id) ? 0 : 1,
    lines: -metrics.lines,
    bytes: -metrics.bytes,
    id,
  };
}

function compareMoveCandidates(left, right, newTaskIds) {
  const leftPriority = taskMovePriority(left, newTaskIds);
  const rightPriority = taskMovePriority(right, newTaskIds);
  if (leftPriority.isNew !== rightPriority.isNew) {
    return leftPriority.isNew - rightPriority.isNew;
  }
  if (leftPriority.lines !== rightPriority.lines) {
    return leftPriority.lines - rightPriority.lines;
  }
  if (leftPriority.bytes !== rightPriority.bytes) {
    return leftPriority.bytes - rightPriority.bytes;
  }
  return leftPriority.id.localeCompare(rightPriority.id, 'en', { numeric: true, sensitivity: 'base' });
}

function relieveOverflowParts(parts, options) {
  const maxPartBytes = options.maxPartBytes;
  const maxPartLines = options.maxPartLines;
  const newTaskIds = options.newTaskIds || new Set();

  for (let guard = 0; guard < parts.length * 4 + 32; guard += 1) {
    const overflowPart = parts.find((part) => isPartOverLimit(part, maxPartBytes, maxPartLines));
    if (!overflowPart) {
      return;
    }

    const candidates = overflowPart.tasks
      .slice()
      .sort((left, right) => compareMoveCandidates(left, right, newTaskIds));

    let moved = false;
    for (const task of candidates) {
      overflowPart.tasks = overflowPart.tasks.filter((item) => item !== task);
      const chosenPart = chooseStablePart(parts, task, {
        ...options,
        excludePartName: overflowPart.name,
      });
      if (chosenPart) {
        chosenPart.tasks.push(task);
        moved = true;
        break;
      }
      overflowPart.tasks.push(task);
    }

    if (moved) {
      continue;
    }

    const task = candidates[0];
    overflowPart.tasks = overflowPart.tasks.filter((item) => item !== task);
    const newPart = {
      name: makePartName(parts),
      tasks: [task],
    };
    assertSingleTaskFits(task, maxPartBytes, maxPartLines);
    parts.push(newPart);
  }

  throw new Error('Unable to stabilize ATM shard parts within thresholds');
}

function buildStablePartsFromExisting(projectRoot, tasks, options = {}) {
  const paths = getStorePaths(projectRoot);
  const existingParts = readExistingPartRecords(paths);
  if (existingParts.length === 0) {
    return null;
  }

  const maxPartBytes = options.maxPartBytes || DEFAULT_MAX_PART_BYTES;
  const maxPartLines = options.maxPartLines || DEFAULT_MAX_PART_LINES;
  const sortedTasks = sortTasksByTaskId(tasks);
  const incomingIds = new Set(sortedTasks.map((task) => String(task && task.id ? task.id : '')).filter(Boolean));
  const existingPartByTaskId = new Map();
  for (const part of existingParts) {
    for (const task of part.tasks) {
      const taskId = String(task && task.id ? task.id : '');
      if (taskId) {
        existingPartByTaskId.set(taskId, part.name);
      }
    }
  }

  const parts = existingParts.map((part) => ({
    name: part.name,
    tasks: [],
  }));
  const partByName = new Map(parts.map((part) => [part.name, part]));
  const newTaskIds = new Set();
  const unassigned = [];

  for (const task of sortedTasks) {
    const taskId = String(task && task.id ? task.id : '');
    const existingPartName = existingPartByTaskId.get(taskId);
    if (existingPartName && partByName.has(existingPartName)) {
      partByName.get(existingPartName).tasks.push(task);
      continue;
    }
    if (taskId && !incomingIds.has(taskId)) {
      continue;
    }
    if (taskId) {
      newTaskIds.add(taskId);
    }
    unassigned.push(task);
  }

  const lockedPartNames = collectLockedPartNames(projectRoot);
  for (const task of unassigned) {
    ensurePartForTask(parts, task, {
      maxPartBytes,
      maxPartLines,
      lockedPartNames,
    });
  }

  relieveOverflowParts(parts, {
    maxPartBytes,
    maxPartLines,
    lockedPartNames,
    newTaskIds,
  });

  return parts
    .sort((left, right) => comparePartNames(left.name, right.name))
    .map((part) => {
      const orderedTasks = sortTasksByTaskId(part.tasks);
      const metrics = calcPartMetrics(orderedTasks);
      if (metrics.bytes > maxPartBytes || metrics.lines > maxPartLines) {
        const taskId = orderedTasks[0] && orderedTasks[0].id ? orderedTasks[0].id : '<empty>';
        throw new Error(`ATM shard part ${part.name} starting at ${taskId} exceeds thresholds (${metrics.bytes} bytes, ${metrics.lines} lines)`);
      }
      return createPartRecord({
        name: part.name,
        title: titleForPart(part.name, STABLE_ASSIGNMENT_LAYOUT, orderedTasks.length),
        range: undefined,
        layout: STABLE_ASSIGNMENT_LAYOUT,
        stride: undefined,
        offset: undefined,
        indices: undefined,
        tasks: orderedTasks,
        metrics,
      });
    });
}

function readTasksAtmStore(projectRoot) {
  const paths = getStorePaths(projectRoot);
  if (!fs.existsSync(paths.indexPath)) {
    throw new Error(`${TASKS_ATM_INDEX_REL} not found`);
  }

  const indexData = readJson(paths.indexPath);
  if (Array.isArray(indexData.tasks)) {
    return {
      tasks: sortTasksByTaskId(indexData.tasks),
      summary: recalcSummary(indexData.tasks),
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
    tasks: sortTasksByTaskId(tasks),
    summary: recalcSummary(tasks),
    mode: 'thin-index',
  };
}

function splitTasksIntoParts(tasks, options = {}) {
  const maxPartBytes = options.maxPartBytes || DEFAULT_MAX_PART_BYTES;
  const maxPartLines = options.maxPartLines || DEFAULT_MAX_PART_LINES;
  const preferredPartCount = Number.isInteger(options.preferredPartCount) ? options.preferredPartCount : null;
  const sortedTasks = sortTasksByTaskId(tasks);

  if (preferredPartCount && preferredPartCount > 1) {
    const preferredBalancedParts = buildBalancedParts(sortedTasks, preferredPartCount, maxPartBytes, maxPartLines);
    if (preferredBalancedParts) {
      return preferredBalancedParts;
    }
  }

  const contiguousParts = buildContiguousParts(sortedTasks, maxPartBytes, maxPartLines);

  if (contiguousParts.length <= 1) {
    return contiguousParts;
  }

  for (let candidatePartCount = contiguousParts.length; candidatePartCount <= sortedTasks.length; candidatePartCount += 1) {
    const stripedParts = buildStripedParts(sortedTasks, candidatePartCount, maxPartBytes, maxPartLines);
    if (stripedParts) {
      return stripedParts;
    }
  }

  return contiguousParts;
}

function buildIndexStub(projectRoot, parts, summary, options = {}) {
  const maxPartBytes = options.maxPartBytes || DEFAULT_MAX_PART_BYTES;
  const maxPartLines = options.maxPartLines || DEFAULT_MAX_PART_LINES;
  const assignmentPolicy = options.assignmentPolicy || STABLE_ASSIGNMENT_LAYOUT;
  return {
    kind: 'task-aggregate-index',
    _note: `Thin index stub. Full ATM tasks live in ${TASKS_ATM_PARTS_DIR_REL}/`,
    _usage: `Read ${TASKS_ATM_PARTS_DIR_REL}/tasks-atm-part-*.json as needed`,
    _rebuild: 'node tools_node/rebuild-tasks-atm-auto-parts.js',
    _sourceOfTruth: `${TASKS_ATM_PARTS_DIR_REL}/`,
    assignmentPolicy: {
      name: assignmentPolicy,
      stableExistingTasks: true,
      newTaskPlacement: 'least-loaded-pool + task-id hash',
      lockedPartAvoidance: true,
      rebuildDiff: 'only changed part files plus index; .shardrc changes only when part list changes',
    },
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
      layout: part.layout,
    })),
  };
}

function writeTasksAtmStore(projectRoot, tasks, options = {}) {
  const paths = getStorePaths(projectRoot);
  const maxPartBytes = options.maxPartBytes || DEFAULT_MAX_PART_BYTES;
  const maxPartLines = options.maxPartLines || DEFAULT_MAX_PART_LINES;
  const dryRun = Boolean(options.dryRun);
  const stableParts = buildStablePartsFromExisting(projectRoot, tasks, { maxPartBytes, maxPartLines });
  let preferredPartCount = null;
  if (!stableParts && fs.existsSync(paths.shardRcPath)) {
    try {
      const shardRc = readJson(paths.shardRcPath);
      if (Array.isArray(shardRc.shards) && shardRc.shards.length > 1) {
        preferredPartCount = Math.min(shardRc.shards.length, 65);
      }
    } catch {
      preferredPartCount = null;
    }
  }

  const parts = stableParts || splitTasksIntoParts(tasks, { maxPartBytes, maxPartLines, preferredPartCount });
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
    assignmentPolicy: indexStub.assignmentPolicy,
    shards: parts.map((part) => ({
      name: part.name,
      title: titleForShardDefinition(part.name),
      layout: part.layout,
      path: `${part.name}.json`,
    })),
  };
  const taskPartPaths = {};
  for (const part of parts) {
    for (const task of part.tasks) {
      const taskId = String(task && task.id ? task.id : '').trim();
      if (taskId) {
        taskPartPaths[taskId] = partPathRel(part.name);
      }
    }
  }

  const changedFiles = [];

  if (!dryRun) {
    fs.mkdirSync(paths.partsDir, { recursive: true });
    for (const part of parts) {
      const partPath = path.join(paths.partsDir, `${part.name}.json`);
      if (writeJsonIfChanged(partPath, part.tasks)) {
        changedFiles.push(relPath(projectRoot, partPath));
      }
    }
    if (writeJsonIfChanged(paths.shardRcPath, shardRc)) {
      changedFiles.push(relPath(projectRoot, paths.shardRcPath));
    }
    if (writeJsonIfChanged(paths.indexPath, indexStub)) {
      changedFiles.push(relPath(projectRoot, paths.indexPath));
    }
  }

  return {
    indexStub,
    shardRc,
    parts,
    summary,
    changedFiles,
    taskPartPaths,
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
  const result = writeTasksAtmStore(projectRoot, tasks, options);
  result.upsertedTaskPartPath = result.taskPartPaths[String(task && task.id ? task.id : '').trim()] || '';
  return result;
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
