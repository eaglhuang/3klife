'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const {
  formatTaskIdInspection,
  inspectTaskId,
  previewNextTaskId,
  releaseReservedTaskId,
  reserveNextTaskId,
  reserveTaskId,
} = require('../../lib/task-id-guard');
const { createLockAdapter } = require('./lock-adapter');
const { createLockAdapterConfig } = require('./lock-adapter-config');

const DEFAULT_PROFILE = Object.freeze({
  taskIdPrefixes: ['ATM-', 'H2U-', 'PROG-2-'],
  template: {
    defaultTaskTemplate: 'docs/agent-briefs/atm-task-template.md',
  },
});

function loadProfile(profilePath) {
  if (!profilePath || !fs.existsSync(profilePath)) {
    return DEFAULT_PROFILE;
  }
  const parsed = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
  return {
    taskIdPrefixes: Array.isArray(parsed.taskIdPrefixes) && parsed.taskIdPrefixes.length > 0
      ? parsed.taskIdPrefixes.map((value) => String(value || '').trim()).filter(Boolean)
      : DEFAULT_PROFILE.taskIdPrefixes,
    template: {
      defaultTaskTemplate: parsed.template && parsed.template.defaultTaskTemplate
        ? String(parsed.template.defaultTaskTemplate)
        : DEFAULT_PROFILE.template.defaultTaskTemplate,
    },
  };
}

class TaskAdapter {
  constructor(options = {}) {
    this.projectRoot = options.projectRoot ? path.resolve(options.projectRoot) : path.resolve(__dirname, '..', '..', '..');
    this.profilePath = options.profilePath
      ? path.resolve(options.profilePath)
      : path.resolve(__dirname, 'task-profile.json');
    this.profile = loadProfile(this.profilePath);
    this.lockAdapter = createLockAdapter(createLockAdapterConfig());
  }

  getProfile() {
    return this.profile;
  }

  previewNextTaskId(prefix) {
    return previewNextTaskId(this.projectRoot, prefix);
  }

  reserveNextTaskId(prefix, agentName) {
    return reserveNextTaskId(this.projectRoot, prefix, agentName);
  }

  reserveTaskId(taskId, agentName) {
    return reserveTaskId(this.projectRoot, taskId, agentName);
  }

  releaseReservedTaskId(taskId, agentName) {
    return releaseReservedTaskId(this.projectRoot, taskId, agentName);
  }

  inspectTaskId(taskId) {
    return inspectTaskId(this.projectRoot, taskId);
  }

  formatTaskIdInspection(inspection) {
    return formatTaskIdInspection(inspection);
  }

  relativeOutputFile(filePath) {
    if (!filePath) {
      return '';
    }
    return path.relative(this.projectRoot, path.resolve(filePath)).replace(/\\/g, '/');
  }

  promoteReservationToLock(taskId, agentName, files) {
    const normalizedFiles = Array.from(new Set((files || []).filter(Boolean)));
    this.lockAdapter.lock(taskId, agentName, normalizedFiles);
  }

  assignDocId(markdownFilePath) {
    const resolved = path.resolve(markdownFilePath);
    const relative = path.relative(this.projectRoot, resolved).replace(/\\/g, '/');
    cp.execFileSync(
      process.execPath,
      [path.join(this.projectRoot, 'tools_node', 'doc-id-registry.js'), '--assign', relative],
      {
        cwd: this.projectRoot,
        stdio: 'inherit',
      }
    );
  }
}

function createTaskAdapter(options = {}) {
  return new TaskAdapter(options);
}

module.exports = {
  TaskAdapter,
  createTaskAdapter,
};