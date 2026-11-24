'use strict';

const fs = require('fs');
const path = require('path');

const projectConfig = require('./project-config');
const { readTasksAtmStore } = require('./tasks-atm-shard-store');
const {
  findTaskCardPath,
  listTaskCardFiles,
} = require('./task-card-paths');
const remoteOccupancy = require('./task-id-remote-occupancy');

const TASK_CARD_DIR_REL = 'docs/agent-briefs/tasks';
const LOCK_DIR_REL = '.task-locks';
const TASKS_ATM_PARTS_DIR_REL = 'docs/tasks/tasks-atm';
const SHARED_LOCK_FENCE = '.task-lock-acquire.json';

function normalizeTaskId(taskId) {
  return String(taskId || '').trim();
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function taskIdPrefix(taskId) {
  return normalizeTaskId(taskId).replace(/-\d+$/, '');
}

function remoteView(projectRoot, prefix, options = {}) {
  return remoteOccupancy.collectRemoteOccupancy(projectRoot, prefix, options);
}

function sharedReservationLocks(projectRoot, view) {
  return view.reservations.map((entry) => {
    const ownWorktree = remoteOccupancy.sameWorktree(entry, projectRoot);
    return {
      taskId: normalizeTaskId(entry.taskId),
      agentName: ownWorktree
        ? String(entry.agentName || '').trim()
        : `${entry.agentName || 'unknown'} (worktree ${entry.worktree || 'unknown'})`,
      lockedAt: String(entry.reservedAt || '').trim(),
      reservationOnly: true,
      reservationPrefix: taskIdPrefix(entry.taskId),
      path: 'git-common-dir/task-id-reservations.json',
      shared: true,
    };
  });
}

function relPath(projectRoot, filePath) {
  return path.relative(projectRoot, filePath).replace(/\\/g, '/');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function ensureLockDir(projectRoot) {
  const lockDir = path.join(projectRoot, LOCK_DIR_REL);
  if (!fs.existsSync(lockDir)) {
    fs.mkdirSync(lockDir, { recursive: true });
  }
  return lockDir;
}

function listTaskCardIds(projectRoot = projectConfig.ROOT) {
  return listTaskCardFiles(projectRoot, TASK_CARD_DIR_REL)
    .map((filePath) => path.basename(filePath, '.md'))
    .map(normalizeTaskId)
    .filter(Boolean);
}

function listTasksAtmIds(projectRoot = projectConfig.ROOT) {
  try {
    return readTasksAtmStore(projectRoot).tasks
      .map((task) => normalizeTaskId(task && task.id))
      .filter(Boolean);
  } catch {
    const partsDir = path.join(projectRoot, TASKS_ATM_PARTS_DIR_REL);
    if (!fs.existsSync(partsDir)) {
      return [];
    }

    const taskIds = [];
    for (const entryName of fs.readdirSync(partsDir).filter((name) => /^tasks-atm-part-\d+\.json$/i.test(name))) {
      const filePath = path.join(partsDir, entryName);
      const text = fs.readFileSync(filePath, 'utf8');
      const regex = /"id"\s*:\s*"([^"]+)"/g;
      let match = regex.exec(text);
      while (match) {
        const taskId = normalizeTaskId(match[1]);
        if (taskId) {
          taskIds.push(taskId);
        }
        match = regex.exec(text);
      }
    }
    return taskIds;
  }
}

function listTaskLocks(projectRoot = projectConfig.ROOT) {
  const lockDir = ensureLockDir(projectRoot);
  return fs.readdirSync(lockDir)
    .filter((entryName) => entryName.endsWith('.lock.json'))
    .sort((left, right) => left.localeCompare(right))
    .map((entryName) => {
      const filePath = path.join(lockDir, entryName);
      const data = readJson(filePath);
      return {
        taskId: normalizeTaskId(data.taskId),
        agentName: String(data.agentName || '').trim(),
        lockedAt: String(data.lockedAt || '').trim(),
        reservationOnly: Boolean(data.reservationOnly),
        reservationPrefix: normalizeTaskId(data.reservationPrefix),
        path: relPath(projectRoot, filePath),
      };
    })
    .filter((entry) => entry.taskId.length > 0);
}

function collectOccupiedTaskIds(projectRoot = projectConfig.ROOT, options = {}) {
  const remoteIds = [];
  if (options.prefix) {
    const view = remoteView(projectRoot, options.prefix, options);
    remoteIds.push(...view.sources.keys(), ...view.reservations.map((entry) => normalizeTaskId(entry.taskId)));
  }
  return Array.from(new Set([
    ...listTaskCardIds(projectRoot),
    ...listTasksAtmIds(projectRoot),
    ...listTaskLocks(projectRoot).map((entry) => entry.taskId),
    ...remoteIds,
  ])).sort((left, right) => left.localeCompare(right, 'en', { numeric: true, sensitivity: 'base' }));
}

function inspectTaskId(projectRoot = projectConfig.ROOT, taskId, options = {}) {
  const normalizedTaskId = normalizeTaskId(taskId);
  const view = remoteView(projectRoot, taskIdPrefix(normalizedTaskId), options);
  const taskCardPath = findTaskCardPath(projectRoot, normalizedTaskId, TASK_CARD_DIR_REL);
  const taskCards = taskCardPath
    ? [relPath(projectRoot, taskCardPath)]
    : [];
  const taskStoreCount = listTasksAtmIds(projectRoot).filter((id) => id === normalizedTaskId).length;
  const localLocks = listTaskLocks(projectRoot).filter((entry) => entry.taskId === normalizedTaskId);
  const sharedLocks = sharedReservationLocks(projectRoot, view)
    .filter((entry) => entry.taskId === normalizedTaskId)
    .filter((entry) => !localLocks.some((local) => local.agentName === entry.agentName));
  const locks = [...localLocks, ...sharedLocks];
  const ownCardPresent = taskCards.length > 0 || taskStoreCount > 0;
  const remoteSources = (view.sources.get(normalizedTaskId) || [])
    // A card committed in this worktree also shows up on its own branch; only
    // count unmerged sources when this worktree holds no local copy of the id.
    .filter((source) => !(ownCardPresent && source.kind === 'unmerged-commit'));

  return {
    taskId: normalizedTaskId,
    occupied: taskCards.length > 0 || taskStoreCount > 0 || locks.length > 0 || remoteSources.length > 0,
    taskCards,
    taskStoreCount,
    locks,
    remoteSources,
    remoteChecked: view.enabled,
    warnings: view.warnings,
  };
}

function formatTaskIdInspection(inspection) {
  const parts = [];
  if (inspection.taskCards.length > 0) {
    parts.push(`task card: ${inspection.taskCards.join(', ')}`);
  }
  if (inspection.taskStoreCount > 0) {
    parts.push(`tasks-atm entries: ${inspection.taskStoreCount}`);
  }
  if (inspection.locks.length > 0) {
    parts.push(`locks: ${inspection.locks.map((entry) => {
      const suffix = entry.reservationOnly ? ' (reservation)' : '';
      return `${entry.agentName || 'unknown'}@${entry.lockedAt || 'unknown'}${suffix}`;
    }).join(', ')}`);
  }
  if (Array.isArray(inspection.remoteSources) && inspection.remoteSources.length > 0) {
    parts.push(`remote: ${inspection.remoteSources.map((source) => `${source.kind} ${source.detail}`).join(', ')}`);
  }
  return parts.join(' | ');
}

function previewNextTaskId(projectRoot = projectConfig.ROOT, prefix, options = {}) {
  const normalizedPrefix = normalizeTaskId(prefix);
  if (!normalizedPrefix) {
    throw new Error('task id prefix is required');
  }

  const matcher = new RegExp(`^${escapeRegExp(normalizedPrefix)}-(\\d+)$`);
  let maxSerial = 0;
  for (const occupiedTaskId of collectOccupiedTaskIds(projectRoot, { ...options, prefix: normalizedPrefix })) {
    const match = occupiedTaskId.match(matcher);
    if (!match) {
      continue;
    }
    const serial = Number.parseInt(match[1], 10);
    if (Number.isFinite(serial) && serial > maxSerial) {
      maxSerial = serial;
    }
  }

  return `${normalizedPrefix}-${String(maxSerial + 1).padStart(4, '0')}`;
}

function acquireTaskIdFence(projectRoot, prefix, agentName) {
  const lockDir = ensureLockDir(projectRoot);
  const fencePath = path.join(lockDir, SHARED_LOCK_FENCE);
  const fenceData = {
    prefix: normalizeTaskId(prefix),
    agentName: String(agentName || '').trim(),
    acquiredAt: new Date().toISOString(),
    pid: process.pid,
  };

  try {
    fs.writeFileSync(fencePath, `${JSON.stringify(fenceData, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    return fencePath;
  } catch (error) {
    if (error && error.code === 'EEXIST') {
      let existing = null;
      try {
        existing = readJson(fencePath);
      } catch {
        existing = null;
      }
      const busyError = new Error(existing
        ? `task id reservation busy: ${existing.prefix || 'unknown'} / ${existing.agentName || 'unknown'} 正在保留新卡號`
        : 'task id reservation busy: 另一個 agent 正在保留新卡號');
      busyError.code = 'TASK_ID_RESERVATION_BUSY';
      busyError.fence = existing;
      throw busyError;
    }
    throw error;
  }
}

function releaseTaskIdFence(fencePath) {
  try {
    if (fencePath && fs.existsSync(fencePath)) {
      fs.unlinkSync(fencePath);
    }
  } catch {
    // best-effort cleanup only
  }
}

function taskLockPath(projectRoot, taskId) {
  return path.join(ensureLockDir(projectRoot), `${normalizeTaskId(taskId)}.lock.json`);
}

function writeJsonFile(filePath, data, options = {}) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, {
    encoding: 'utf8',
    flag: options.flag || 'w',
  });
}

function hasOnlyOwnReservation(inspection, agentName) {
  const normalizedAgentName = String(agentName || '').trim();
  return inspection.taskCards.length === 0
    && inspection.taskStoreCount === 0
    && (inspection.remoteSources || []).length === 0
    && inspection.locks.length > 0
    && inspection.locks.every((entry) => entry.agentName === normalizedAgentName && entry.reservationOnly);
}

function reserveTaskIdWithActiveFence(projectRoot, taskId, agentName, options = {}) {
  const normalizedTaskId = normalizeTaskId(taskId);
  const normalizedAgentName = String(agentName || '').trim();
  const prefix = normalizeTaskId(options.prefix) || taskIdPrefix(normalizedTaskId);
  const inspection = inspectTaskId(projectRoot, normalizedTaskId, options);
  if (hasOnlyOwnReservation(inspection, normalizedAgentName)) {
    if (!options.dryRun) {
      claimSharedReservation(projectRoot, normalizedTaskId, normalizedAgentName, inspection, prefix, options);
    }
    return {
      taskId: normalizedTaskId,
      prefix: normalizeTaskId(options.prefix),
      agentName: normalizedAgentName,
      dryRun: Boolean(options.dryRun),
      reused: true,
    };
  }
  if (inspection.occupied) {
    throw buildCollisionError(projectRoot, normalizedTaskId, prefix, inspection, options);
  }

  if (!options.dryRun) {
    claimSharedReservation(projectRoot, normalizedTaskId, normalizedAgentName, inspection, prefix, options);
    const now = new Date().toISOString();
    const lockData = {
      taskId: normalizedTaskId,
      agentName: normalizedAgentName,
      lockedAt: now,
      files: [],
      scopeFingerprint: '',
      scopeFingerprintVersion: 'scope-fingerprint/v1',
      scopeSnapshotAt: now,
      reservationOnly: true,
      reservationPrefix: normalizeTaskId(options.prefix),
    };
    writeJsonFile(taskLockPath(projectRoot, normalizedTaskId), lockData, { flag: 'wx' });
  }

  return {
    taskId: normalizedTaskId,
    prefix: normalizeTaskId(options.prefix),
    agentName: normalizedAgentName,
    dryRun: Boolean(options.dryRun),
    reused: false,
  };
}

function buildCollisionError(projectRoot, taskId, prefix, inspection, options = {}) {
  let suggestedTaskId = '';
  try {
    suggestedTaskId = prefix ? previewNextTaskId(projectRoot, prefix, options) : '';
  } catch {
    suggestedTaskId = '';
  }
  const hint = suggestedTaskId
    ? ` 下一個可用卡號：${suggestedTaskId}（\`task-lock.js reserve ${prefix}\` 或 \`task-card-opener --next-id-prefix ${prefix}\` 會直接保留它）`
    : '';
  const error = new Error(`task id reservation collision for "${taskId}": ${formatTaskIdInspection(inspection)}.${hint}`);
  error.code = 'TASK_ID_COLLISION';
  error.taskId = taskId;
  error.suggestedTaskId = suggestedTaskId;
  error.inspection = inspection;
  return error;
}

function claimSharedReservation(projectRoot, taskId, agentName, inspection, prefix, options = {}) {
  if (!inspection.remoteChecked) {
    return;
  }
  const view = remoteView(projectRoot, prefix, options);
  const landedIds = new Set();
  for (const [id, sources] of view.sources) {
    if (sources.some((source) => source.kind === 'base-ref')) landedIds.add(id);
  }
  const outcome = remoteOccupancy.recordSharedReservation(projectRoot, { taskId, agentName }, undefined, { landedIds });
  if (!outcome.ok) {
    const holder = outcome.holder || {};
    const raced = {
      ...inspection,
      occupied: true,
      locks: [...inspection.locks, {
        taskId,
        agentName: `${holder.agentName || 'unknown'} (worktree ${holder.worktree || 'unknown'})`,
        lockedAt: holder.reservedAt || '',
        reservationOnly: true,
        shared: true,
      }],
    };
    throw buildCollisionError(projectRoot, taskId, prefix, raced, { ...options, noCache: true });
  }
}

function reserveTaskId(projectRoot = projectConfig.ROOT, taskId, agentName, options = {}) {
  const normalizedTaskId = normalizeTaskId(taskId);
  const normalizedAgentName = String(agentName || '').trim();
  if (!normalizedTaskId) {
    throw new Error('task id is required');
  }
  if (!normalizedAgentName) {
    throw new Error('agent name is required to reserve task id');
  }

  const prefix = normalizeTaskId(options.prefix || normalizedTaskId.replace(/-\d+$/, ''));
  const fencePath = acquireTaskIdFence(projectRoot, prefix || normalizedTaskId, normalizedAgentName);
  try {
    return reserveTaskIdWithActiveFence(projectRoot, normalizedTaskId, normalizedAgentName, {
      ...options,
      prefix,
    });
  } finally {
    releaseTaskIdFence(fencePath);
  }
}

/**
 * Release the worktree-local reservation lock. The shared ledger entry is kept
 * (it protects an uncommitted card from other worktrees until it lands on the
 * base ref or the TTL expires) unless options.dropShared is set, e.g. when card
 * creation failed and the id is genuinely abandoned.
 */
function releaseReservedTaskId(projectRoot = projectConfig.ROOT, taskId, agentName, options = {}) {
  const normalizedTaskId = normalizeTaskId(taskId);
  const normalizedAgentName = String(agentName || '').trim();
  if (!normalizedTaskId || !normalizedAgentName) {
    return false;
  }
  if (options.dropShared) {
    try {
      remoteOccupancy.dropSharedReservation(projectRoot, { taskId: normalizedTaskId, agentName: normalizedAgentName });
    } catch {
      // best effort only
    }
  }
  const lockPath = taskLockPath(projectRoot, normalizedTaskId);
  if (!fs.existsSync(lockPath)) {
    return false;
  }
  const data = readJson(lockPath);
  if (normalizeTaskId(data.taskId) !== normalizedTaskId || String(data.agentName || '').trim() !== normalizedAgentName || !data.reservationOnly) {
    return false;
  }
  fs.unlinkSync(lockPath);
  return true;
}

function reserveNextTaskId(projectRoot = projectConfig.ROOT, prefix, agentName, options = {}) {
  const normalizedPrefix = normalizeTaskId(prefix);
  const normalizedAgentName = String(agentName || '').trim();
  if (!normalizedPrefix) {
    throw new Error('task id prefix is required');
  }
  if (!normalizedAgentName) {
    throw new Error('agent name is required to reserve task id');
  }

  const fencePath = acquireTaskIdFence(projectRoot, normalizedPrefix, normalizedAgentName);
  try {
    let lastError = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const taskId = previewNextTaskId(projectRoot, normalizedPrefix, { ...options, noCache: attempt > 0 || options.noCache });
      try {
        return reserveTaskIdWithActiveFence(projectRoot, taskId, normalizedAgentName, {
          ...options,
          prefix: normalizedPrefix,
        });
      } catch (error) {
        if (!error || error.code !== 'TASK_ID_COLLISION') throw error;
        lastError = error;
      }
    }
    throw lastError;
  } finally {
    releaseTaskIdFence(fencePath);
  }
}

/**
 * Broker-style exact reservation: reserve taskId when it is free, otherwise
 * reserve the next free id under the same prefix and report the reassignment
 * instead of refusing.
 */
function reserveTaskIdOrNext(projectRoot = projectConfig.ROOT, taskId, agentName, options = {}) {
  try {
    return { ...reserveTaskId(projectRoot, taskId, agentName, options), requestedTaskId: normalizeTaskId(taskId), reassigned: false };
  } catch (error) {
    if (!error || error.code !== 'TASK_ID_COLLISION') throw error;
    const next = reserveNextTaskId(projectRoot, taskIdPrefix(taskId), agentName, { ...options, noCache: true });
    return {
      ...next,
      requestedTaskId: normalizeTaskId(taskId),
      reassigned: true,
      collision: error.message,
    };
  }
}

module.exports = {
  TASK_CARD_DIR_REL,
  LOCK_DIR_REL,
  collectOccupiedTaskIds,
  formatTaskIdInspection,
  inspectTaskId,
  listTaskCardIds,
  listTaskLocks,
  listTasksAtmIds,
  previewNextTaskId,
  releaseReservedTaskId,
  reserveNextTaskId,
  reserveTaskId,
  reserveTaskIdOrNext,
  taskIdPrefix,
};
