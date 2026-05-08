'use strict';

const fs = require('fs');
const path = require('path');

const projectConfig = require('./project-config');
const { readTasksAtmStore } = require('./tasks-atm-shard-store');
const {
  findTaskCardPath,
  listTaskCardFiles,
} = require('./task-card-paths');

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

function collectOccupiedTaskIds(projectRoot = projectConfig.ROOT) {
  return Array.from(new Set([
    ...listTaskCardIds(projectRoot),
    ...listTasksAtmIds(projectRoot),
    ...listTaskLocks(projectRoot).map((entry) => entry.taskId),
  ])).sort((left, right) => left.localeCompare(right, 'en', { numeric: true, sensitivity: 'base' }));
}

function inspectTaskId(projectRoot = projectConfig.ROOT, taskId) {
  const normalizedTaskId = normalizeTaskId(taskId);
  const taskCardPath = findTaskCardPath(projectRoot, normalizedTaskId, TASK_CARD_DIR_REL);
  const taskCards = taskCardPath
    ? [relPath(projectRoot, taskCardPath)]
    : [];
  const taskStoreCount = listTasksAtmIds(projectRoot).filter((id) => id === normalizedTaskId).length;
  const locks = listTaskLocks(projectRoot).filter((entry) => entry.taskId === normalizedTaskId);

  return {
    taskId: normalizedTaskId,
    occupied: taskCards.length > 0 || taskStoreCount > 0 || locks.length > 0,
    taskCards,
    taskStoreCount,
    locks,
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
  return parts.join(' | ');
}

function previewNextTaskId(projectRoot = projectConfig.ROOT, prefix) {
  const normalizedPrefix = normalizeTaskId(prefix);
  if (!normalizedPrefix) {
    throw new Error('task id prefix is required');
  }

  const matcher = new RegExp(`^${escapeRegExp(normalizedPrefix)}-(\\d+)$`);
  let maxSerial = 0;
  for (const occupiedTaskId of collectOccupiedTaskIds(projectRoot)) {
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
    && inspection.locks.length > 0
    && inspection.locks.every((entry) => entry.agentName === normalizedAgentName && entry.reservationOnly);
}

function reserveTaskIdWithActiveFence(projectRoot, taskId, agentName, options = {}) {
  const normalizedTaskId = normalizeTaskId(taskId);
  const normalizedAgentName = String(agentName || '').trim();
  const inspection = inspectTaskId(projectRoot, normalizedTaskId);
  if (hasOnlyOwnReservation(inspection, normalizedAgentName)) {
    return {
      taskId: normalizedTaskId,
      prefix: normalizeTaskId(options.prefix),
      agentName: normalizedAgentName,
      dryRun: Boolean(options.dryRun),
      reused: true,
    };
  }
  if (inspection.occupied) {
    throw new Error(`task id reservation collision for "${normalizedTaskId}": ${formatTaskIdInspection(inspection)}`);
  }

  if (!options.dryRun) {
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

function releaseReservedTaskId(projectRoot = projectConfig.ROOT, taskId, agentName) {
  const normalizedTaskId = normalizeTaskId(taskId);
  const normalizedAgentName = String(agentName || '').trim();
  if (!normalizedTaskId || !normalizedAgentName) {
    return false;
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
    const taskId = previewNextTaskId(projectRoot, normalizedPrefix);
    return reserveTaskIdWithActiveFence(projectRoot, taskId, normalizedAgentName, {
      ...options,
      prefix: normalizedPrefix,
    });
  } finally {
    releaseTaskIdFence(fencePath);
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
};
