#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const projectConfig = require('../lib/project-config');
const { readTasksAtmStore } = require('../lib/tasks-atm-shard-store');
const { LockAdapter } = require('../adapters/atm-3klife/lock-adapter');
const { createLockAdapterConfig } = require('../adapters/atm-3klife/lock-adapter-config');
const {
  findTaskCardPath,
  getTaskCardRelativePath,
} = require('../lib/task-card-paths');
const {
  buildNodeEntrypointArgs,
  buildNodeInvocationCommand,
  resolveUpstreamPaths,
} = require('../lib/upstream-env');
const { buildH2uGateArgs, resolveH2uGateConfig } = require('../lib/h2u-gate-defaults');

const projectRoot = projectConfig.ROOT;
const taskCardDir = path.join(projectRoot, 'docs', 'agent-briefs', 'tasks');
const taskCardDirRel = path.relative(projectRoot, taskCardDir);
const taskStorePath = path.join(projectRoot, 'docs', 'tasks', 'tasks-atm.json');
const upstreamPaths = resolveUpstreamPaths({
  projectRoot,
});
const upstreamCliPath = upstreamPaths.upstreamCliEntrypoint;
const upstreamCliCommandBase = buildNodeInvocationCommand(upstreamCliPath);
const lockAdapter = new LockAdapter(createLockAdapterConfig());

function toRelative(filePath) {
  return path.relative(projectRoot, filePath).replace(/\\/g, '/');
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function toKebabCase(value) {
  return normalizeText(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function readTaskCardTitle(taskId) {
  const filePath = findTaskCardPath(projectRoot, taskId, taskCardDirRel);
  if (!fs.existsSync(filePath)) {
    return '';
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/^#\s+\[[^\]]+\]\s+(.+)$/m);
  return match ? normalizeText(match[1]) : '';
}

function parseCommandLines(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function pickFirstMeaningfulToken(title) {
  const stopwords = new Set([
    'atom',
    'atoms',
    'case',
    'create',
    'contract',
    'factory',
    'first',
    'generator',
    'implementation',
    'onboarding',
    'router',
    'task',
    'atm',
  ]);

  const tokens = normalizeText(title)
    .split(/[\s/|]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  return tokens.find((token) => !stopwords.has(token.toLowerCase())) || tokens[0] || '';
}

function mergeTaskRecord(taskId) {
  let storeRecord = null;
  try {
    const store = readTasksAtmStore(projectRoot);
    storeRecord = Array.isArray(store.tasks)
      ? store.tasks.find((entry) => entry && entry.id === taskId) || null
      : null;
  } catch {
    storeRecord = null;
  }

  const taskCardFrontmatter = lockAdapter.readTaskFrontmatter(taskId) || {};
  const taskCardTitle = readTaskCardTitle(taskId);

  const task = Object.assign({}, storeRecord || {}, taskCardFrontmatter || {});
  task.id = taskId;
  task.title = normalizeText(task.title || storeRecord?.title || taskCardTitle || taskId);
  task.description = normalizeText(task.description || storeRecord?.description || '');
  task.notes = normalizeText(task.notes || storeRecord?.notes || '');
  task.type = normalizeText(task.type || storeRecord?.type || '');
  task.phase = normalizeText(task.phase || storeRecord?.phase || '');
  task.status = normalizeText(task.status || storeRecord?.status || '');
  task.owner = normalizeText(task.owner || storeRecord?.owner || '');
  task.doc_id = normalizeText(task.doc_id || storeRecord?.doc_id || '');
  task.started_at = normalizeText(task.started_at || storeRecord?.started_at || '');
  task.started_by_agent = normalizeText(task.started_by_agent || storeRecord?.started_by_agent || '');
  task.depends = Array.from(new Set([...(Array.isArray(storeRecord?.depends) ? storeRecord.depends : []), ...(Array.isArray(task.depends) ? task.depends : [])])).filter(Boolean);
  task.acceptance = Array.from(new Set([...(Array.isArray(storeRecord?.acceptance) ? storeRecord.acceptance : []), ...(Array.isArray(task.acceptance) ? task.acceptance : [])])).filter(Boolean);
  task.deliverables = Array.from(new Set([...(Array.isArray(storeRecord?.deliverables) ? storeRecord.deliverables : []), ...(Array.isArray(task.deliverables) ? task.deliverables : [])])).filter(Boolean);
  task.related = Array.from(new Set([...(Array.isArray(storeRecord?.related) ? storeRecord.related : []), ...(Array.isArray(task.related) ? task.related : [])])).filter(Boolean);
  task.contracts = Object.assign({}, storeRecord?.contracts || {}, task.contracts || {});

  return task;
}

function buildTaskText(task) {
  return [
    task.id,
    task.title,
    task.description,
    task.notes,
    task.type,
    task.phase,
    task.doc_id,
    ...(Array.isArray(task.depends) ? task.depends : []),
    ...(Array.isArray(task.acceptance) ? task.acceptance : []),
    ...(Array.isArray(task.deliverables) ? task.deliverables : []),
    JSON.stringify(task.contracts || {}),
  ].join('\n').toLowerCase();
}

function classifyRoute(task) {
  const text = buildTaskText(task);
  const reasons = [];

  if (normalizeText(task.type).toLowerCase() === 'atom-case') {
    reasons.push('task.type=atom-case');
  }
  if (/atomize/i.test(text)) {
    reasons.push('keyword=atomize');
  }
  if (/atom generation|atom-generation/i.test(text)) {
    reasons.push('keyword=atom-generation');
  }
  if (/atm-core-0004/i.test(text)) {
    reasons.push('anchor=ATM-CORE-0004');
  }
  if (/html-to-ucuf/i.test(text)) {
    reasons.push('domain=html-to-ucuf');
  }
  if (/normalizecsscolor/i.test(text)) {
    reasons.push('sample=normalizeCssColor');
  }
  if (/atom generator|generateatom|atm create/i.test(text)) {
    reasons.push('generator=atm create');
  }

  return {
    kind: reasons.length > 0 ? 'atom-generation' : 'docs-first',
    reasons,
  };
}

function inferHints(task, routeKind) {
  const text = buildTaskText(task);
  const titleToken = pickFirstMeaningfulToken(task.title);

  const bucketHint = /html-to-ucuf|\bh2u\b/i.test(text)
    ? 'H2U'
    : /\b(core|generator|bootstrap|provision)\b/i.test(text)
      ? 'CORE'
      : routeKind === 'atom-generation'
        ? 'CORE'
        : '';

  const namespaceHint = /html-to-ucuf|\bh2u\b/i.test(text)
    ? 'html-to-ucuf'
    : /\bcore\b/i.test(text) && /\bgenerator\b/i.test(text)
      ? 'core'
      : '';

  let logicalNameHint = '';
  if (/normalizecsscolor/i.test(text)) {
    logicalNameHint = 'atom.html-to-ucuf.normalize-css-color';
  } else if (namespaceHint && titleToken) {
    logicalNameHint = `atom.${namespaceHint}.${toKebabCase(titleToken)}`;
  } else if (/atom generator/i.test(text)) {
    logicalNameHint = 'atom.core-atom-generator';
  }

  return {
    bucketHint,
    namespaceHint,
    titleToken,
    logicalNameHint,
  };
}

function buildCreateCommand(task, hints) {
  return [
    'node',
    ...buildNodeEntrypointArgs(upstreamCliPath, [
    'create',
    '--bucket',
    hints.bucketHint || '<bucket>',
    '--title',
    task.title || '<title>',
    '--description',
    task.description || '<description>',
    '--logical-name',
    hints.logicalNameHint || '<logical-name>',
    '--dry-run',
    ]),
  ];
}

function buildAtomDiscoveryChannels(taskId = '') {
  const channels = [];
  if (taskId) {
    channels.push({
      channel: 'task-card',
      when: '有明確 task card 可讀時。',
      command: `node tools_node/atomic-framework/task-router.js --task ${taskId} --format markdown`,
    });
  }
  channels.push({
    channel: 'intent',
    when: '沒有 task card，但已知現在要建立一顆新 atom。',
    command: 'node tools_node/atomic-framework/task-router.js --intent create-atom --title <Title> --description "<Description>" --format markdown',
  });
  channels.push({
    channel: 'upstream-guide',
    when: '不是從 3KLife task flow 進來，或是其他 ATM 使用者。',
    command: buildNodeInvocationCommand(upstreamCliPath, ['guide', 'create-atom']),
  });
  return channels;
}

function buildFixH2uDiscoveryChannels(taskId = '') {
  const channels = [];
  if (taskId) {
    channels.push({
      channel: 'task-card',
      when: '有明確 task card 可讀時。',
      command: `node tools_node/atomic-framework/task-router.js --task ${taskId} --format markdown`,
    });
  }
  channels.push({
    channel: 'intent',
    when: '沒有 task card，但目標是修 H2U / html-to-ucuf legacy 流程。',
    command: 'node tools_node/atomic-framework/task-router.js --intent fix-h2u --goal "<Goal>" --format markdown',
  });
  channels.push({
    channel: 'upstream-guide',
    when: '需要回到 upstream ATM 的通用導覽，再由 host repo 自行擴充私有 intent。',
    command: buildNodeInvocationCommand(upstreamCliPath, ['guide', 'overview']),
  });
  return channels;
}

function buildFixH2uCommands(args = {}) {
  const goal = normalizeText(args.goal || args.description || args.title || 'Fix H2U legacy flow');
  const escapedGoal = goal.replace(/"/g, '\\"');
  const h2uGateArgs = buildH2uGateArgs(resolveH2uGateConfig({}));
  const h2uGateArgText = h2uGateArgs.length > 0 ? ` ${h2uGateArgs.join(' ')}` : '';
  return [
    `node tools_node/atomic-framework/doctor.js --goal "${escapedGoal}" --mode dev${h2uGateArgText} --json`,
    `node tools_node/validate-legacy-h2u-launch.js --strict --require-worktree-check${h2uGateArgText}`,
    `node tools_node/atm-flow.js --mode dev${h2uGateArgText} --json`,
    `node tools_node/validate-legacy-h2u-first-win.js --strict --require-worktree-check${h2uGateArgText}`,
  ];
}

function applyIntentOverrides(hints, args = {}) {
  return {
    bucketHint: normalizeText(args.bucket) || hints.bucketHint,
    namespaceHint: normalizeText(args.domain) || hints.namespaceHint,
    titleToken: normalizeText(args.title) || hints.titleToken,
    logicalNameHint: normalizeText(args.logicalName) || hints.logicalNameHint,
  };
}

function buildIntentTask(args = {}) {
  return {
    id: '',
    title: normalizeText(args.title || 'Create Atom Intent'),
    description: normalizeText(args.description || 'Ad-hoc atom creation intent without a task card.'),
    notes: normalizeText([args.domain, args.legacyRef].filter(Boolean).join(' | ')),
    type: 'intent',
    phase: '',
    status: 'untracked',
    owner: '',
    doc_id: '',
    started_at: '',
    started_by_agent: '',
    depends: [],
    acceptance: [],
    deliverables: [],
    related: [],
    contracts: {
      validation_cmd: normalizeText(args.validation || ''),
    },
  };
}

function buildIntentRoute(intent, args = {}) {
  if (intent === 'create-atom') {
    const task = buildIntentTask(args);
    const route = {
      kind: 'atom-generation',
      reasons: ['intent=create-atom', 'fallback=no-task-card'],
    };
    const baseHints = inferHints(task, route.kind);
    const hints = applyIntentOverrides(baseHints, args);
    if (!hints.logicalNameHint && hints.namespaceHint && hints.titleToken) {
      hints.logicalNameHint = `atom.${toKebabCase(hints.namespaceHint)}.${toKebabCase(hints.titleToken)}`;
    }
    const validationHints = parseCommandLines(args.validation || '');
    const readFirst = [
      'docs/keep.summary.md',
      'docs/ATOM_GENERATOR.md',
      'docs/SELF_HOSTING_ALPHA.md',
    ];
    const primaryAtom = {
      atomId: 'ATM-CORE-0004',
      logicalName: 'atom.core-atom-generator',
      upstreamCli: upstreamCliCommandBase,
      createCommand: buildCreateCommand(task, hints),
    };

    return {
      ok: true,
      task: {
        id: '',
        docId: '',
        title: task.title,
        type: task.type,
        phase: '',
        status: task.status,
        owner: '',
        startedAt: '',
        startedByAgent: '',
        depends: [],
        related: [],
      },
      lock: {
        locked: false,
        agentName: '',
        lockedAt: '',
        files: [],
      },
      route: {
        intent,
        kind: route.kind,
        reasons: route.reasons,
        readFirst,
        upstreamDocs: [
          'docs/ATOM_GENERATOR.md',
          'docs/ARCHITECTURE.md',
          'docs/SELF_HOSTING_ALPHA.md',
        ],
        discoveryChannels: buildAtomDiscoveryChannels(),
        primaryAtom,
        guardrails: [
          '不要手工配 ATM-* ID。',
          '不要先寫 registry entry 再回頭補 generator。',
          '先用 --dry-run，把 bucket / logicalName / description 定好再正式建立。',
        ],
      },
      hints: {
        bucketHint: hints.bucketHint,
        namespaceHint: hints.namespaceHint,
        titleToken: hints.titleToken,
        logicalNameHint: hints.logicalNameHint,
        legacyRef: normalizeText(args.legacyRef || ''),
      },
      validationHints,
      inputs: {
        taskCard: '',
        taskStore: '',
      },
      routeKind: route.kind,
      taskStatus: task.status,
      readFirst,
      primaryAtom,
      summary: '沒有 task card 時，先走 create-atom intent route，再交由 ATM-CORE-0004 / atm create 負責正式 birth。',
    };
  }

  if (intent === 'fix-h2u') {
    const goal = normalizeText(args.goal || args.description || args.title || 'Fix H2U legacy flow');
    const readFirst = [
      'docs/keep.summary.md',
      'docs/ai_atomic_framework/legacy-h2u-first-battle-launch-checklist.md',
      'docs/ai_atomic_framework/atm-h2u-three-tier-gates.md',
      'docs/html-to-ucuf/current-roadmap.md',
    ];
    const nextCommands = buildFixH2uCommands(args);
    const validationHints = [
      nextCommands[1],
      nextCommands[2],
    ];

    return {
      ok: true,
      task: {
        id: '',
        docId: '',
        title: goal,
        type: 'intent',
        phase: '',
        status: 'untracked',
        owner: '',
        startedAt: '',
        startedByAgent: '',
        depends: [],
        related: [],
      },
      lock: {
        locked: false,
        agentName: '',
        lockedAt: '',
        files: [],
      },
      route: {
        intent,
        kind: 'legacy-fix',
        reasons: ['intent=fix-h2u', 'domain=html-to-ucuf', 'guard=legacy-gates'],
        readFirst,
        upstreamDocs: [
          'README.md',
          'docs/ATOM_GENERATOR.md',
          'docs/SELF_HOSTING_ALPHA.md',
        ],
        discoveryChannels: buildFixH2uDiscoveryChannels(),
        primaryAtom: null,
        nextCommands,
        guardrails: [
          '不要直接重寫 draft-builder 主幹。',
          '先過 launch gate，再進 flow gate。',
          '分數不達標時，先回報 nextFixes / owner bucket，不做全盤大改。',
        ],
      },
      hints: {
        goal,
        legacyRef: normalizeText(args.legacyRef || ''),
      },
      validationHints,
      inputs: {
        taskCard: '',
        taskStore: '',
      },
      routeKind: 'legacy-fix',
      taskStatus: 'untracked',
      readFirst,
      primaryAtom: null,
      summary: '沒有 task card 時，fix-h2u intent 先導向 launch/flow/first-win 三段閘門，再依 gate 結果拆小卡處理。',
    };
  }

  throw new Error(`Unsupported intent: ${intent}. Supported intents: create-atom, fix-h2u.`);
}

function buildTaskRoute(taskId) {
  const task = mergeTaskRecord(taskId);
  if (!task.title) {
    throw new Error(`Task card not found: ${toRelative(path.join(projectRoot, getTaskCardRelativePath(taskId)))}`);
  }

  const taskCardPath = findTaskCardPath(projectRoot, taskId, taskCardDirRel);
  const taskCardRelativePath = taskCardPath
    ? toRelative(taskCardPath)
    : getTaskCardRelativePath(taskId);

  const lock = lockAdapter.readAllLocks().find((entry) => entry.taskId === taskId) || null;
  const route = classifyRoute(task);
  const hints = inferHints(task, route.kind);
  const validationHints = parseCommandLines(task.contracts?.validation_cmd || task.validation_cmd || '');
  const primaryAtom = route.kind === 'atom-generation'
    ? {
        atomId: 'ATM-CORE-0004',
        logicalName: 'atom.core-atom-generator',
        upstreamCli: upstreamCliCommandBase,
        createCommand: buildCreateCommand(task, hints),
      }
    : null;

  const readFirst = [
    'docs/keep.summary.md',
    taskCardRelativePath,
  ];

  if (route.kind === 'atom-generation') {
    readFirst.splice(1, 0, 'docs/ATOM_GENERATOR.md', 'docs/SELF_HOSTING_ALPHA.md');
  }

  return {
    ok: true,
    task: {
      id: task.id,
      docId: task.doc_id || '',
      title: task.title,
      type: task.type,
      phase: task.phase,
      status: task.status,
      owner: task.owner,
      startedAt: task.started_at,
      startedByAgent: task.started_by_agent,
      depends: task.depends,
      related: task.related,
    },
    lock: lock
      ? {
          locked: true,
          agentName: lock.agentName,
          lockedAt: lock.lockedAt,
          files: lock.files,
        }
      : {
          locked: false,
          agentName: '',
          lockedAt: '',
          files: [],
        },
    route: {
      kind: route.kind,
      reasons: route.reasons,
      readFirst,
      upstreamDocs: [
        'docs/ATOM_GENERATOR.md',
        'docs/ARCHITECTURE.md',
        'docs/SELF_HOSTING_ALPHA.md',
      ],
      discoveryChannels: buildAtomDiscoveryChannels(taskId),
      primaryAtom: route.kind === 'atom-generation'
        ? {
            atomId: 'ATM-CORE-0004',
            logicalName: 'atom.core-atom-generator',
            upstreamCli: upstreamCliCommandBase,
            createCommand: buildCreateCommand(task, hints),
          }
        : null,
    },
    hints: {
      bucketHint: hints.bucketHint,
      namespaceHint: hints.namespaceHint,
      titleToken: hints.titleToken,
      logicalNameHint: hints.logicalNameHint,
    },
    validationHints,
    inputs: {
      taskCard: taskCardRelativePath,
      taskStore: toRelative(taskStorePath),
    },
    routeKind: route.kind,
    taskStatus: task.status,
    readFirst,
    primaryAtom,
    summary: route.kind === 'atom-generation'
      ? '先走 ATM-CORE-0004 / atm create，再用 task card 的 validation hints 驗證。'
      : '先讀 task card 與 keep.summary，這張卡不需要先進 atom factory。',
  };
}

function renderMarkdown(report) {
  const taskLabel = report.task.id
    ? `${report.task.id} ${report.task.title}`
    : report.task.title;
  const lines = [
    '# ATM Task Router',
    '',
    `- Task: ${taskLabel}`,
    `- taskStatus: ${report.taskStatus || report.task.status || 'unknown'}`,
    `- Type: ${report.task.type || 'unknown'}`,
    `- routeKind: ${report.routeKind || report.route.kind}`,
    `- Summary: ${report.summary}`,
  ];

  if (report.route.intent) {
    lines.push(`- Intent: ${report.route.intent}`);
  }

  if (report.lock.locked) {
    lines.push(`- Lock: ${report.lock.agentName} @ ${report.lock.lockedAt}`);
  } else {
    lines.push('- Lock: unlocked');
  }

  if (report.route.reasons.length > 0) {
    lines.push(`- Reasons: ${report.route.reasons.join(', ')}`);
  }

  lines.push('', '## Read First');
  for (const item of report.route.readFirst) {
    lines.push(`- ${item}`);
  }

  if (Array.isArray(report.route.discoveryChannels) && report.route.discoveryChannels.length > 0) {
    lines.push('', '## Discovery Channels');
    for (const channel of report.route.discoveryChannels) {
      lines.push(`- ${channel.channel}: ${channel.when}`);
      lines.push(`  ${channel.command}`);
    }
  }

  if (report.route.primaryAtom) {
    lines.push('', '## Primary Atom');
    lines.push(`- Atom ID: ${report.route.primaryAtom.atomId}`);
    lines.push(`- Logical Name: ${report.route.primaryAtom.logicalName}`);
    lines.push(`- Upstream CLI: ${report.route.primaryAtom.upstreamCli}`);
    lines.push('', '### Suggested Create Command');
    lines.push('```json');
    lines.push(JSON.stringify(report.route.primaryAtom.createCommand, null, 2));
    lines.push('```');
  }

  lines.push('', '## Validation Hints');
  if (report.validationHints.length > 0) {
    for (const item of report.validationHints) {
      lines.push(`- ${item}`);
    }
  } else {
    lines.push('- none');
  }

  lines.push('', '## Inputs');
  lines.push(`- Task card: ${report.inputs.taskCard || 'none'}`);
  lines.push(`- Task store: ${report.inputs.taskStore || 'none'}`);

  if (Array.isArray(report.route.guardrails) && report.route.guardrails.length > 0) {
    lines.push('', '## Guardrails');
    for (const item of report.route.guardrails) {
      lines.push(`- ${item}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

function parseArgs(argv = process.argv.slice(2)) {
  const state = {
    taskId: '',
    intent: '',
    format: 'markdown',
    bucket: '',
    goal: '',
    title: '',
    description: '',
    logicalName: '',
    domain: '',
    legacyRef: '',
    validation: '',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!state.taskId && token && !token.startsWith('--')) {
      state.taskId = token;
      continue;
    }

    if (token === '--task') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error('--task requires a value.');
      }
      state.taskId = value;
      index += 1;
      continue;
    }

    if (token === '--intent') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error('--intent requires a value.');
      }
      state.intent = value;
      index += 1;
      continue;
    }

    if (token === '--bucket' || token === '--title' || token === '--description' || token === '--logical-name' || token === '--domain' || token === '--legacy-ref' || token === '--validation') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error(`${token} requires a value.`);
      }
      if (token === '--logical-name') {
        state.logicalName = value;
      } else if (token === '--legacy-ref') {
        state.legacyRef = value;
      } else {
        state[token.slice(2).replace(/-([a-z])/g, (_, char) => char.toUpperCase())] = value;
      }
      index += 1;
      continue;
    }

    if (token === '--goal') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error('--goal requires a value.');
      }
      state.goal = value;
      index += 1;
      continue;
    }

    if (token === '--format') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error('--format requires a value.');
      }
      state.format = value;
      index += 1;
      continue;
    }

    if (token === '--json') {
      state.format = 'json';
      continue;
    }

    if (token === '--markdown') {
      state.format = 'markdown';
      continue;
    }

    if (token === '--help' || token === '-h') {
      state.help = true;
    }
  }

  return state;
}

function printUsage() {
  process.stdout.write([
    'Usage: node tools_node/atomic-framework/task-router.js (--task <task-id> | --intent <create-atom|fix-h2u>) [options]',
    '',
    'Examples:',
    '  node tools_node/atomic-framework/task-router.js --task ATM-4-0003 --format markdown',
    '  node tools_node/atomic-framework/task-router.js --intent create-atom --title NormalizeCssColor --description "Canonicalize CSS color input" --domain html-to-ucuf --format markdown',
    '  node tools_node/atomic-framework/task-router.js --intent fix-h2u --goal "把 H2U 功能改好" --format markdown',
    '  node tools_node/atomic-framework/task-router.js ATM-2-0048 --json',
  ].join('\n') + '\n');
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    printUsage();
    return 0;
  }

  if (!args.taskId && !args.intent) {
    throw new Error('task-router requires --task <task-id> or --intent <intent>.');
  }

  const report = args.intent
    ? buildIntentRoute(args.intent, args)
    : buildTaskRoute(args.taskId);

  if (args.format === 'json') {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    process.stdout.write(renderMarkdown(report));
  }

  return 0;
}

if (require.main === module) {
  try {
    process.exitCode = main();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  buildIntentRoute,
  buildTaskRoute,
  classifyRoute,
  inferHints,
  main,
  parseArgs,
  renderMarkdown,
};
