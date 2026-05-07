'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const yaml = require('yaml');

const projectConfig = require('../../lib/project-config');
const docIdRegistryLoader = require('../../lib/doc-id-registry-loader');
const tasksAtmStore = require('../../lib/tasks-atm-shard-store');

const ROOT = projectConfig.ROOT;
const LIFECYCLE_MODES = Object.freeze(['birth', 'evolution']);

const default3KLifeGovernanceLayout = Object.freeze({
  root: '.',
  taskStorePath: 'docs/agent-briefs/tasks',
  lockStorePath: '.task-locks',
  documentIndexPath: 'docs/doc-id-registry-shards',
  shardStorePath: 'docs/tasks/tasks-atm',
  stateStorePath: 'docs',
  artifactStorePath: 'artifacts',
  logStorePath: 'artifacts/atm-3-0001/logs',
  runReportStorePath: 'artifacts/atm-3-0001/reports',
  ruleGuardPath: 'tools_node',
  evidenceStorePath: 'artifacts/atm-3-0001/evidence',
  registryStorePath: 'docs/tasks/tasks-atm.json',
  contextSummaryStorePath: 'artifacts/turn-artifacts/atm-3-0001/context-summary'
});

const threeKLifeGovernancePhaseMatrix = Object.freeze([
  {
    storeId: 'taskStore',
    capabilityId: '3klife.task-store.shadow',
    kind: 'task-store',
    required: true,
    phase1: {
      mode: 'shadow-adapter',
      delegates: ['tools_node/task-card-opener.js', 'docs/agent-briefs/tasks/*.md', 'docs/tasks/tasks-atm/*.json'],
      behavior: 'Read existing task cards/shards directly; create/update mutations are mirrored into shadow plans only.'
    },
    phase2: {
      mode: 'governed-atom',
      plannedSeries: 'ATM-GOV-*',
      proposedAtomSlug: 'governance-task-store',
      rationale: 'Task creation and status mutation must be independently versioned and police-governed, not trapped in a monolithic host adapter.'
    }
  },
  {
    storeId: 'lockStore',
    capabilityId: '3klife.lock-store.shadow',
    kind: 'lock-store',
    required: true,
    phase1: {
      mode: 'shadow-adapter',
      delegates: ['tools_node/task-lock.js'],
      behavior: 'Use check/check-cross-shard for parity, synthesize lock records without mutating repo lock state by default.'
    },
    phase2: {
      mode: 'governed-atom',
      plannedSeries: 'ATM-GOV-*',
      proposedAtomSlug: 'governance-lock-store',
      rationale: 'Lock service is a reusable governance primitive and should evolve independently from other stores.'
    }
  },
  {
    storeId: 'documentIndex',
    capabilityId: '3klife.document-index.shadow',
    kind: 'document-index',
    required: true,
    phase1: {
      mode: 'shadow-adapter',
      delegates: ['tools_node/doc-id-registry.js', 'tools_node/resolve-doc-id.js', 'tools_node/lib/doc-id-registry-loader.js'],
      behavior: 'Read doc-id registry shards directly; document updates become shadow plans unless explicit mutation mode is enabled.'
    },
    phase2: {
      mode: 'governed-atom',
      plannedSeries: 'ATM-GOV-*',
      proposedAtomSlug: 'governance-document-index',
      rationale: 'Document identity is a shared contract and must become an auditable atomized capability.'
    }
  },
  {
    storeId: 'shardStore',
    capabilityId: '3klife.shard-store.shadow',
    kind: 'shard-store',
    required: true,
    phase1: {
      mode: 'shadow-adapter',
      delegates: ['tools_node/shard-manager.js', 'tools_node/lib/tasks-atm-shard-store.js'],
      behavior: 'Read shards directly and mirror writes/rebuilds into shadow artifacts unless mutation mode is explicitly enabled.'
    },
    phase2: {
      mode: 'governed-atom',
      plannedSeries: 'ATM-GOV-*',
      proposedAtomSlug: 'governance-shard-store',
      rationale: 'Shard orchestration is a composition primitive that must remain replaceable per repository.'
    }
  },
  {
    storeId: 'artifactStore',
    capabilityId: '3klife.artifact-store.shadow',
    kind: 'artifact-store',
    required: true,
    phase1: {
      mode: 'filesystem-adapter',
      delegates: ['artifacts/', 'artifacts/turn-artifacts/'],
      behavior: 'Write adapter-owned artifacts directly under artifacts/ without changing existing producer CLIs.'
    },
    phase2: {
      mode: 'governed-atom',
      plannedSeries: 'ATM-GOV-*',
      proposedAtomSlug: 'governance-artifact-store',
      rationale: 'Artifact persistence is reusable across repos and should not stay hard-wired to one adapter implementation.'
    }
  },
  {
    storeId: 'logStore',
    capabilityId: '3klife.log-store.shadow',
    kind: 'log-store',
    required: true,
    phase1: {
      mode: 'filesystem-adapter',
      delegates: ['artifacts/atm-3-0001/logs', 'artifacts/turn-artifacts/'],
      behavior: 'Append adapter logs without touching existing Cocos/editor/browser log producers.'
    },
    phase2: {
      mode: 'governed-atom',
      plannedSeries: 'ATM-GOV-*',
      proposedAtomSlug: 'governance-log-store',
      rationale: 'Log routing must stay composable and enforceable per evidence policy.'
    }
  },
  {
    storeId: 'stateStore',
    capabilityId: '3klife.state-store.shadow',
    kind: 'state-store',
    required: true,
    phase1: {
      mode: 'shadow-adapter',
      delegates: ['docs/**/*.md', 'docs/**/*.json'],
      behavior: 'Read live markdown/json state; mirror writes under artifacts/atm-3-0001/shadow-writes/ by default.'
    },
    phase2: {
      mode: 'governed-atom',
      plannedSeries: 'ATM-GOV-*',
      proposedAtomSlug: 'governance-state-store',
      rationale: 'State mutation policies differ by host and must be independently tested.'
    }
  },
  {
    storeId: 'ruleGuard',
    capabilityId: '3klife.rule-guard.shadow',
    kind: 'rule-guard',
    required: true,
    phase1: {
      mode: 'shadow-adapter',
      delegates: [
        'tools_node/compute-gate.js',
        'tools_node/check-encoding-touched.js',
        'tools_node/check-import-boundaries.js',
        'tools_node/check-task-scope.js'
      ],
      behavior: 'Keep existing CLI guard entrypoints intact and route adapter calls into them.'
    },
    phase2: {
      mode: 'atom-map',
      plannedSeries: 'ATM-GOV-*',
      proposedAtomMapId: 'ATM-GOV-MAP-0001',
      proposedMembers: [
        'ATM-GOV-0005 ts-syntax gate',
        'ATM-GOV-0006 encoding gate',
        'ATM-GOV-0007 task-scope gate',
        'ATM-GOV-0008 ui-spec-contract gate',
        'ATM-GOV-0009 shard-health gate',
        'ATM-GOV-0010 import-boundary gate',
        'ATM-GOV-0011 eslint-rules gate',
        'ATM-GOV-0012 dead-code gate'
      ],
      rationale: 'compute-gate is not a giant atom; it is a selector over independently evolvable governance atoms.'
    }
  },
  {
    storeId: 'evidenceStore',
    capabilityId: '3klife.evidence-store.shadow',
    kind: 'evidence-store',
    required: true,
    phase1: {
      mode: 'filesystem-adapter',
      delegates: ['artifacts/atm-3-0001/evidence'],
      behavior: 'Persist adapter-owned evidence envelopes without changing existing evidence producers.'
    },
    phase2: {
      mode: 'governed-atom',
      plannedSeries: 'ATM-GOV-*',
      proposedAtomSlug: 'governance-evidence-store',
      rationale: 'Evidence policy must stay decoupled from specific adapter code paths.'
    }
  },
  {
    storeId: 'contextSummaryStore',
    capabilityId: '3klife.context-summary.shadow',
    kind: 'artifact-store',
    required: false,
    phase1: {
      mode: 'filesystem-adapter',
      delegates: ['artifacts/turn-artifacts/atm-3-0001/context-summary'],
      behavior: 'Write adapter-owned context summaries beside existing turn-artifacts.'
    },
    phase2: {
      mode: 'governed-atom',
      plannedSeries: 'ATM-GOV-*',
      proposedAtomSlug: 'governance-context-summary-store',
      rationale: 'Turn summaries are portable evidence and should be reusable outside 3KLife.'
    }
  }
]);

const default3KLifeGovernanceConfig = Object.freeze({
  repositoryRoot: ROOT,
  adapterName: '@3klife/governance-adapter-shadow',
  adapterVersion: '0.1.0-shadow',
  shadowMode: true,
  allowMutations: false,
  artifactRoot: 'artifacts/atm-3-0001',
  logRoot: 'artifacts/atm-3-0001/logs',
  evidenceRoot: 'artifacts/atm-3-0001/evidence',
  reportRoot: 'artifacts/atm-3-0001/reports',
  shadowWriteRoot: 'artifacts/atm-3-0001/shadow-writes',
  contextSummaryRoot: 'artifacts/turn-artifacts/atm-3-0001/context-summary',
  taskCardDir: 'docs/agent-briefs/tasks',
  tasksAtmIndexPath: tasksAtmStore.TASKS_ATM_INDEX_REL,
  tasksAtmPartsDir: tasksAtmStore.TASKS_ATM_PARTS_DIR_REL,
  tools: Object.freeze({
    taskCardOpener: 'tools_node/task-card-opener.js',
    taskLock: 'tools_node/task-lock.js',
    computeGate: 'tools_node/compute-gate.js',
    checkEncodingTouched: 'tools_node/check-encoding-touched.js',
    checkImportBoundaries: 'tools_node/check-import-boundaries.js',
    checkTaskScope: 'tools_node/check-task-scope.js',
    resolveDocId: 'tools_node/resolve-doc-id.js',
    docIdRegistry: 'tools_node/doc-id-registry.js',
    shardManager: 'tools_node/shard-manager.js'
  })
});

function mergeGovernanceConfig(overrides = {}) {
  const tools = Object.assign({}, default3KLifeGovernanceConfig.tools, overrides.tools || {});
  return Object.assign({}, default3KLifeGovernanceConfig, overrides, { tools });
}

function resolveRelative(repositoryRoot, candidatePath) {
  if (!candidatePath) {
    return repositoryRoot;
  }
  return path.isAbsolute(candidatePath)
    ? path.normalize(candidatePath)
    : path.resolve(repositoryRoot, candidatePath);
}

function toPosix(relativePath) {
  return String(relativePath || '').replace(/\\/g, '/');
}

function relativeToRoot(repositoryRoot, absolutePath) {
  return toPosix(path.relative(repositoryRoot, absolutePath));
}

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeText(filePath, content) {
  ensureParentDir(filePath);
  fs.writeFileSync(filePath, content, 'utf8');
}

function writeJson(filePath, value) {
  writeText(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function normalizeTaskStatus(status) {
  const value = String(status || 'open').trim().toLowerCase();
  if (value === 'in_progress' || value === 'in progress') {
    return 'in-progress';
  }
  if (value === 'done' || value === 'closed' || value === 'completed') {
    return 'done';
  }
  if (value === 'blocked') {
    return 'blocked';
  }
  return value || 'open';
}

function taskStatusToWorkItemStatus(taskStatus) {
  const normalized = normalizeTaskStatus(taskStatus);
  if (normalized === 'in-progress') {
    return 'running';
  }
  if (normalized === 'done') {
    return 'done';
  }
  if (normalized === 'blocked') {
    return 'blocked';
  }
  return 'planned';
}

function workItemStatusToTaskStatus(workItemStatus) {
  const normalized = String(workItemStatus || '').trim().toLowerCase();
  if (normalized === 'running' || normalized === 'locked' || normalized === 'verified') {
    return 'in-progress';
  }
  if (normalized === 'done') {
    return 'done';
  }
  if (normalized === 'blocked') {
    return 'blocked';
  }
  return 'open';
}

function createArtifact(artifactPath, artifactKind, producedBy) {
  return { artifactPath, artifactKind, producedBy };
}

function createEvidence(evidenceKind, summary, artifactPaths) {
  return { evidenceKind, summary, artifactPaths };
}

function createCapabilityResult(ok, messages, artifacts = [], evidence = []) {
  return {
    ok,
    messages,
    artifacts,
    evidence,
  };
}

function runNodeTool(config, toolKey, args = [], options = {}) {
  const toolRelativePath = config.tools[toolKey];
  const toolAbsolutePath = resolveRelative(config.repositoryRoot, toolRelativePath);
  const result = spawnSync(process.execPath, [toolAbsolutePath, ...args], {
    cwd: config.repositoryRoot,
    encoding: 'utf8',
    shell: false,
    timeout: options.timeout || 60000,
  });
  return {
    ok: (result.status ?? 1) === 0,
    exitCode: result.status ?? 1,
    stdout: String(result.stdout || '').trim(),
    stderr: String(result.stderr || '').trim(),
    command: [process.execPath, relativeToRoot(config.repositoryRoot, toolAbsolutePath), ...args].join(' '),
  };
}

function writeShadowPlan(config, category, name, payload) {
  const absolutePath = resolveRelative(config.repositoryRoot, path.join(config.shadowWriteRoot, category, name));
  writeJson(absolutePath, payload);
  return createArtifact(relativeToRoot(config.repositoryRoot, absolutePath), 'report', '@3klife/governance-adapter-shadow');
}

function readTasksAtmRecords(config) {
  return tasksAtmStore.readTasksAtmStore(config.repositoryRoot).tasks;
}

function findTaskRecord(config, workItemId) {
  return readTasksAtmRecords(config).find((task) => task && task.id === workItemId) || null;
}

function taskRecordToWorkItem(taskRecord) {
  if (!taskRecord) {
    return null;
  }
  return {
    workItemId: taskRecord.id,
    title: taskRecord.title || taskRecord.description || taskRecord.id,
    status: taskStatusToWorkItemStatus(taskRecord.status),
  };
}

function parseFrontmatter(markdown) {
  const text = String(markdown || '');
  if (!text.startsWith('---\n') && !text.startsWith('---\r\n')) {
    return {};
  }
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    return {};
  }
  return yaml.parse(match[1]) || {};
}

function buildTaskCardPath(config, workItemId) {
  return resolveRelative(config.repositoryRoot, path.join(config.taskCardDir, `${workItemId}.md`));
}

function buildDocumentIndex(config) {
  return {
    resolveDocumentId(documentId) {
      const registry = docIdRegistryLoader.loadDocIdRegistryMap();
      const entry = registry[documentId];
      return entry ? entry.path : null;
    },
    searchDocuments(query) {
      const needle = String(query || '').trim().toLowerCase();
      if (!needle) {
        return [];
      }
      const registry = docIdRegistryLoader.loadDocIdRegistryMap();
      return Object.entries(registry)
        .filter(([docId, entry]) =>
          docId.toLowerCase().includes(needle)
          || String(entry.path || '').toLowerCase().includes(needle)
          || String(entry.title || '').toLowerCase().includes(needle)
        )
        .map(([, entry]) => entry.path)
        .sort((left, right) => left.localeCompare(right));
    },
    updateDocument(documentPath, metadata) {
      const artifact = writeShadowPlan(config, 'document-index', `${path.basename(documentPath)}.json`, {
        operation: 'documentIndex.updateDocument',
        mode: config.shadowMode ? 'shadow' : 'mutation',
        documentPath: toPosix(documentPath),
        metadata,
      });
      return createCapabilityResult(true, [
        'Document update recorded as a shadow plan.',
      ], [artifact], [
        createEvidence('handoff', `Document index update planned for ${toPosix(documentPath)}.`, [artifact.artifactPath]),
      ]);
    },
  };
}

function buildTaskStore(config) {
  return {
    createTask(workItem) {
      writeShadowPlan(config, 'task-store', `${workItem.workItemId}.create.json`, {
        operation: 'taskStore.createTask',
        mode: config.shadowMode ? 'shadow' : 'mutation',
        delegatedTool: config.tools.taskCardOpener,
        workItem,
      });
      return Object.assign({}, workItem, {
        status: workItem.status || 'planned',
        shadowMode: config.shadowMode,
      });
    },
    getTask(workItemId) {
      return taskRecordToWorkItem(findTaskRecord(config, workItemId));
    },
    updateTaskStatus(workItemId, status) {
      const existing = this.getTask(workItemId) || {
        workItemId,
        title: workItemId,
        status: 'planned',
      };
      writeShadowPlan(config, 'task-store', `${workItemId}.status.json`, {
        operation: 'taskStore.updateTaskStatus',
        mode: config.shadowMode ? 'shadow' : 'mutation',
        delegatedTool: config.tools.taskCardOpener,
        workItemId,
        targetStatus: workItemStatusToTaskStatus(status),
      });
      return Object.assign({}, existing, {
        status,
        shadowMode: config.shadowMode,
      });
    },
    listTasks() {
      return readTasksAtmRecords(config).map(taskRecordToWorkItem).filter(Boolean);
    },
  };
}

function buildLockStore(config) {
  return {
    acquireLock(workItem, files, actor) {
      const normalizedFiles = Array.from(new Set((Array.isArray(files) ? files : []).map(toPosix)));
      const checkResult = runNodeTool(config, 'taskLock', ['check-cross-shard', workItem.workItemId, '--files', ...normalizedFiles]);
      if (!checkResult.ok) {
        throw new Error(checkResult.stderr || checkResult.stdout || `task-lock check-cross-shard failed for ${workItem.workItemId}`);
      }
      if (!config.shadowMode && config.allowMutations) {
        const lockResult = runNodeTool(config, 'taskLock', ['lock', workItem.workItemId, actor, '--files', ...normalizedFiles]);
        if (!lockResult.ok) {
          throw new Error(lockResult.stderr || lockResult.stdout || `task-lock lock failed for ${workItem.workItemId}`);
        }
      } else {
        writeShadowPlan(config, 'locks', `${workItem.workItemId}.lock.json`, {
          operation: 'lockStore.acquireLock',
          mode: 'shadow',
          delegatedTool: config.tools.taskLock,
          workItemId: workItem.workItemId,
          actor,
          files: normalizedFiles,
          validation: checkResult.stdout,
        });
      }
      return {
        workItemId: workItem.workItemId,
        lockedBy: actor,
        lockedAt: new Date().toISOString(),
        files: normalizedFiles,
        shadowMode: config.shadowMode,
      };
    },
    getLock(workItemId) {
      const filePath = resolveRelative(config.repositoryRoot, path.join(default3KLifeGovernanceLayout.lockStorePath, `${workItemId}.lock.json`));
      if (!fileExists(filePath)) {
        return null;
      }
      return readJson(filePath);
    },
    releaseLock(workItemId, actor) {
      if (!config.shadowMode && config.allowMutations) {
        const result = runNodeTool(config, 'taskLock', ['unlock', workItemId, actor]);
        return createCapabilityResult(result.ok, [result.stdout || result.stderr || `Release lock ${workItemId}`], [], []);
      }
      const artifact = writeShadowPlan(config, 'locks', `${workItemId}.unlock.json`, {
        operation: 'lockStore.releaseLock',
        mode: 'shadow',
        delegatedTool: config.tools.taskLock,
        workItemId,
        actor,
      });
      return createCapabilityResult(true, ['Shadow mode: lock release recorded without mutating .task-locks.'], [artifact], [
        createEvidence('handoff', `Shadow release planned for ${workItemId}.`, [artifact.artifactPath]),
      ]);
    },
  };
}

function buildShardStore(config) {
  return {
    readShard(shardPath) {
      const absolutePath = resolveRelative(config.repositoryRoot, shardPath);
      return readJson(absolutePath);
    },
    writeShard(shardPath, value) {
      const relativePath = toPosix(shardPath);
      const absolutePath = resolveRelative(config.repositoryRoot, path.join(config.shadowWriteRoot, 'shards', relativePath));
      writeJson(absolutePath, value);
      const artifact = createArtifact(relativeToRoot(config.repositoryRoot, absolutePath), 'file', '@3klife/governance-adapter-shadow');
      return createCapabilityResult(true, [`Shadow shard write recorded for ${relativePath}.`], [artifact], [
        createEvidence('validation', `Shard write mirrored in shadow mode for ${relativePath}.`, [artifact.artifactPath]),
      ]);
    },
    rebuildIndex(indexPath) {
      const artifact = writeShadowPlan(config, 'shards', `${path.basename(indexPath)}.rebuild.json`, {
        operation: 'shardStore.rebuildIndex',
        mode: config.shadowMode ? 'shadow' : 'mutation',
        delegatedTool: config.tools.shardManager,
        indexPath: toPosix(indexPath),
      });
      return createCapabilityResult(true, [`Shadow rebuild-index recorded for ${toPosix(indexPath)}.`], [artifact], [
        createEvidence('handoff', `Shard rebuild planned for ${toPosix(indexPath)}.`, [artifact.artifactPath]),
      ]);
    },
  };
}

function resolveArtifactOutputPath(config, record) {
  const requestedPath = String((record && record.artifactPath) || '').trim();
  if (!requestedPath) {
    throw new Error('Artifact record requires artifactPath.');
  }
  if (requestedPath.startsWith('artifacts/')) {
    return resolveRelative(config.repositoryRoot, requestedPath);
  }
  return resolveRelative(config.repositoryRoot, path.join(config.artifactRoot, requestedPath));
}

function listFilesRecursive(baseDir) {
  if (!fileExists(baseDir)) {
    return [];
  }
  const files = [];
  const stack = [baseDir];
  while (stack.length > 0) {
    const currentDir = stack.pop();
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const nextPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        stack.push(nextPath);
      } else {
        files.push(nextPath);
      }
    }
  }
  return files;
}

function buildArtifactStore(config) {
  return {
    writeArtifact(record, content) {
      const absolutePath = resolveArtifactOutputPath(config, record);
      ensureParentDir(absolutePath);
      if (content instanceof Uint8Array) {
        fs.writeFileSync(absolutePath, Buffer.from(content));
      } else {
        fs.writeFileSync(absolutePath, String(content), 'utf8');
      }
      return createArtifact(
        relativeToRoot(config.repositoryRoot, absolutePath),
        record.artifactKind || 'file',
        record.producedBy || '@3klife/governance-adapter-shadow'
      );
    },
    listArtifacts(workItemId) {
      const artifactRoot = resolveRelative(config.repositoryRoot, config.artifactRoot);
      return listFilesRecursive(artifactRoot)
        .filter((filePath) => relativeToRoot(config.repositoryRoot, filePath).includes(workItemId))
        .map((filePath) => createArtifact(relativeToRoot(config.repositoryRoot, filePath), 'file', '@3klife/governance-adapter-shadow'));
    },
  };
}

function buildLogStore(config) {
  return {
    appendLog(workItemId, message) {
      const absolutePath = resolveRelative(config.repositoryRoot, path.join(config.logRoot, `${workItemId}.log`));
      ensureParentDir(absolutePath);
      fs.appendFileSync(absolutePath, `${message}\n`, 'utf8');
      const artifact = createArtifact(relativeToRoot(config.repositoryRoot, absolutePath), 'log', '@3klife/governance-adapter-shadow');
      return createCapabilityResult(true, [`Appended adapter log for ${workItemId}.`], [artifact], [
        createEvidence('validation', `Adapter log updated for ${workItemId}.`, [artifact.artifactPath]),
      ]);
    },
    readLog(workItemId) {
      const absolutePath = resolveRelative(config.repositoryRoot, path.join(config.logRoot, `${workItemId}.log`));
      return fileExists(absolutePath) ? fs.readFileSync(absolutePath, 'utf8') : '';
    },
  };
}

function buildRunReportStore(config) {
  return {
    writeRunReport(reportId, report) {
      const absolutePath = resolveRelative(config.repositoryRoot, path.join(config.reportRoot, `${reportId}.json`));
      writeJson(absolutePath, report);
      const artifact = createArtifact(relativeToRoot(config.repositoryRoot, absolutePath), 'report', '@3klife/governance-adapter-shadow');
      return createCapabilityResult(true, [`Run report written: ${reportId}.`], [artifact], [
        createEvidence('validation', `Run report persisted for ${reportId}.`, [artifact.artifactPath]),
      ]);
    },
    readRunReport(reportId) {
      const absolutePath = resolveRelative(config.repositoryRoot, path.join(config.reportRoot, `${reportId}.json`));
      return fileExists(absolutePath) ? readJson(absolutePath) : null;
    },
  };
}

function buildStateStore(config) {
  return {
    readMarkdown(targetPath) {
      return fs.readFileSync(resolveRelative(config.repositoryRoot, targetPath), 'utf8');
    },
    writeMarkdown(targetPath, content) {
      const absolutePath = resolveRelative(config.repositoryRoot, path.join(config.shadowWriteRoot, 'state', targetPath));
      writeText(absolutePath, String(content));
      const artifact = createArtifact(relativeToRoot(config.repositoryRoot, absolutePath), 'file', '@3klife/governance-adapter-shadow');
      return createCapabilityResult(true, [`Shadow markdown write recorded for ${toPosix(targetPath)}.`], [artifact], [
        createEvidence('handoff', `Shadow markdown write recorded for ${toPosix(targetPath)}.`, [artifact.artifactPath]),
      ]);
    },
    readJson(targetPath) {
      return readJson(resolveRelative(config.repositoryRoot, targetPath));
    },
    writeJson(targetPath, value) {
      const absolutePath = resolveRelative(config.repositoryRoot, path.join(config.shadowWriteRoot, 'state', targetPath));
      writeJson(absolutePath, value);
      const artifact = createArtifact(relativeToRoot(config.repositoryRoot, absolutePath), 'file', '@3klife/governance-adapter-shadow');
      return createCapabilityResult(true, [`Shadow json write recorded for ${toPosix(targetPath)}.`], [artifact], [
        createEvidence('handoff', `Shadow json write recorded for ${toPosix(targetPath)}.`, [artifact.artifactPath]),
      ]);
    },
  };
}

function buildRuleGuard(config) {
  function runEncodingGuard(context) {
    const files = Array.isArray(context.files) ? context.files.map(toPosix) : [];
    const args = files.length > 0 ? ['--files', ...files] : [];
    return runNodeTool(config, 'checkEncodingTouched', args);
  }

  function runTaskScopeGuard(context) {
    const taskId = String(context.taskId || context.workItemId || '').trim();
    if (!taskId) {
      return {
        ok: false,
        exitCode: 1,
        stdout: '',
        stderr: 'task-scope guard requires taskId or workItemId',
        command: 'task-scope <missing-task-id>',
      };
    }
    return runNodeTool(config, 'checkTaskScope', ['--task', taskId]);
  }

  return {
    runGuard(guardId, context = {}) {
      let result;
      if (guardId === 'encoding') {
        result = runEncodingGuard(context);
      } else if (guardId === 'import-boundary') {
        result = runNodeTool(config, 'checkImportBoundaries', []);
      } else if (guardId === 'task-scope') {
        result = runTaskScopeGuard(context);
      } else if (guardId === 'doc-id-registry') {
        result = runNodeTool(config, 'docIdRegistry', ['--verify']);
      } else if (guardId === 'compute-gate' || guardId.startsWith('compute-gate:')) {
        const profile = guardId.includes(':') ? guardId.split(':')[1] : String(context.profile || 'standard');
        const args = ['--profile', profile];
        if (context.agentFeedback === true) {
          args.push('--agent-feedback');
        }
        if (context.noStop === true) {
          args.push('--no-stop');
        }
        result = runNodeTool(config, 'computeGate', args);
      } else {
        result = {
          ok: false,
          exitCode: 1,
          stdout: '',
          stderr: `Unknown guardId: ${guardId}`,
          command: guardId,
        };
      }

      const summary = result.ok
        ? `Guard ${guardId} passed.`
        : `Guard ${guardId} failed: ${result.stderr || result.stdout || 'unknown error'}`;
      return createCapabilityResult(result.ok, [summary, result.command], [], [
        createEvidence('validation', summary, []),
      ]);
    },
  };
}

function buildEvidenceStore(config) {
  return {
    writeEvidence(workItemId, evidence) {
      const absolutePath = resolveRelative(config.repositoryRoot, path.join(config.evidenceRoot, `${workItemId}.jsonl`));
      ensureParentDir(absolutePath);
      fs.appendFileSync(absolutePath, `${JSON.stringify(evidence)}\n`, 'utf8');
      return Object.assign({}, evidence);
    },
    listEvidence(workItemId) {
      const absolutePath = resolveRelative(config.repositoryRoot, path.join(config.evidenceRoot, `${workItemId}.jsonl`));
      if (!fileExists(absolutePath)) {
        return [];
      }
      return fs.readFileSync(absolutePath, 'utf8')
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => JSON.parse(line));
    },
  };
}

function buildContextSummaryStore(config) {
  return {
    writeSummary(summary) {
      const absolutePath = resolveRelative(config.repositoryRoot, path.join(config.contextSummaryRoot, `${summary.workItemId}.json`));
      writeJson(absolutePath, summary);
      return Object.assign({}, summary);
    },
    readSummary(workItemId) {
      const absolutePath = resolveRelative(config.repositoryRoot, path.join(config.contextSummaryRoot, `${workItemId}.json`));
      return fileExists(absolutePath) ? readJson(absolutePath) : null;
    },
  };
}

function buildTaskCardSnapshot(config, workItemId) {
  const taskCardPath = buildTaskCardPath(config, workItemId);
  if (!fileExists(taskCardPath)) {
    return null;
  }
  const markdown = fs.readFileSync(taskCardPath, 'utf8');
  return {
    path: relativeToRoot(config.repositoryRoot, taskCardPath),
    frontmatter: parseFrontmatter(markdown),
  };
}

function build3KLifeGovernanceMappingMatrix(config = default3KLifeGovernanceConfig) {
  const effectiveConfig = mergeGovernanceConfig(config);
  return {
    generatedAt: new Date().toISOString(),
    repositoryRoot: effectiveConfig.repositoryRoot,
    adapterName: effectiveConfig.adapterName,
    shadowMode: effectiveConfig.shadowMode,
    layout: default3KLifeGovernanceLayout,
    stores: threeKLifeGovernancePhaseMatrix.map((entry) => ({
      storeId: entry.storeId,
      capabilityId: entry.capabilityId,
      kind: entry.kind,
      required: entry.required,
      runtimePath: default3KLifeGovernanceLayout[`${entry.storeId}Path`] || null,
      phase1: entry.phase1,
      phase2: entry.phase2,
    })),
  };
}

function create3KLifeGovernanceAdapter(configOverrides = {}) {
  const config = mergeGovernanceConfig(configOverrides);
  const stores = {
    taskStore: buildTaskStore(config),
    lockStore: buildLockStore(config),
    documentIndex: buildDocumentIndex(config),
    shardStore: buildShardStore(config),
    artifactStore: buildArtifactStore(config),
    logStore: buildLogStore(config),
    runReportStore: buildRunReportStore(config),
    stateStore: buildStateStore(config),
    ruleGuard: buildRuleGuard(config),
    evidenceStore: buildEvidenceStore(config),
    contextSummaryStore: buildContextSummaryStore(config),
  };

  return {
    adapterName: config.adapterName,
    adapterVersion: config.adapterVersion,
    config,
    layout: default3KLifeGovernanceLayout,
    phaseMatrix: threeKLifeGovernancePhaseMatrix,
    stores,
    buildTaskCardSnapshot(workItemId) {
      return buildTaskCardSnapshot(config, workItemId);
    },
    buildMappingMatrix() {
      return build3KLifeGovernanceMappingMatrix(config);
    },
  };
}

module.exports = {
  ROOT,
  LIFECYCLE_MODES,
  default3KLifeGovernanceLayout,
  default3KLifeGovernanceConfig,
  threeKLifeGovernancePhaseMatrix,
  build3KLifeGovernanceMappingMatrix,
  create3KLifeGovernanceAdapter,
  createCapabilityResult,
  createArtifact,
  createEvidence,
  mergeGovernanceConfig,
  relativeToRoot,
  resolveRelative,
  runNodeTool,
};