#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

const { buildGovernanceReport } = require('./governance/checker');
const { loadGovernanceProfile } = require('./governance/profile');
const { evaluateIdentityConsistency } = require('../check-agent-identity-consistency');
const { buildH2uGateArgs, resolveH2uGateConfig, DEFAULT_H2U_WORKTREE_STATUS_FILE } = require('../lib/h2u-gate-defaults');

const ROOT = path.resolve(__dirname, '..', '..');
const VALID_MODES = new Set(['dev', 'pr', 'release']);

const H2U_PATH_PATTERNS = [
  /^tools_node\/lib\/html-to-ucuf\//i,
  /^tools_node\/run-html-to-ucuf-workflow\.js$/i,
  /^tools_node\/validate-html-to-ucuf-rule-guard\.js$/i,
  /^tools_node\/validate-legacy-h2u-launch\.js$/i,
  /^tools_node\/validate-legacy-h2u-first-win\.js$/i,
  /^tools_node\/lib\/dom-to-ui\//i,
  /^fixtures\/case-studies\/normalize-css-color\//i,
  /^assets\/resources\/ui-spec\/screens\/legacy-h2u-dryrun/i,
];

function normalizePath(input) {
  return String(input || '').replace(/\\/g, '/');
}

function uniquePaths(items) {
  const seen = new Set();
  const output = [];
  for (const item of items || []) {
    const value = normalizePath(item).trim();
    if (!value || seen.has(value)) {
      continue;
    }
    seen.add(value);
    output.push(value);
  }
  return output;
}

function uniqueList(items) {
  return Array.from(new Set((items || []).map((item) => String(item || '').trim()).filter(Boolean)));
}

function buildH2uGateArgString(config) {
  if (!config) return '';
  const args = buildH2uGateArgs(config);
  return args.length > 0 ? ` ${args.join(' ')}` : '';
}

function parseGitStatusLines(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/\r/g, ''))
    .filter(Boolean)
    .map((line) => {
      const body = line.length > 3 ? line.slice(3).trim() : '';
      const renamed = body.includes(' -> ') ? body.split(' -> ').pop() : body;
      return normalizePath(renamed);
    })
    .filter(Boolean);
}

function parseArgs(argv = process.argv.slice(2)) {
  const state = {
    goal: '',
    mode: 'dev',
    fromMode: '',
    json: false,
    worktreeStatusFile: '',
    allowDirtyPrefixes: [],
    checkGovernanceDrift: false,
    identityMode: '',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = () => argv[++index] || '';

    if (token === '--goal') {
      state.goal = String(next() || '').trim();
      continue;
    }
    if (token === '--mode') {
      state.mode = String(next() || '').trim().toLowerCase();
      continue;
    }
    if (token === '--from-mode') {
      state.fromMode = String(next() || '').trim().toLowerCase();
      continue;
    }
    if (token === '--worktree-status-file') {
      state.worktreeStatusFile = String(next() || '').trim();
      continue;
    }
    if (token === '--allow-dirty-prefix') {
      const value = String(next() || '').trim();
      if (value) {
        state.allowDirtyPrefixes.push(value);
      }
      continue;
    }
    if (token === '--check-governance-drift') {
      state.checkGovernanceDrift = true;
      continue;
    }
    if (token === '--identity-mode') {
      state.identityMode = String(next() || '').trim().toLowerCase();
      continue;
    }
    if (token === '--json') {
      state.json = true;
      continue;
    }
    if (token === '--help' || token === '-h') {
      state.help = true;
      continue;
    }
    throw new Error(`unknown arg: ${token}`);
  }

  if (!VALID_MODES.has(state.mode)) {
    throw new Error(`invalid --mode: ${state.mode} (expected dev|pr|release)`);
  }

  return state;
}

function printUsage() {
  process.stdout.write([
    'Usage: node tools_node/atomic-framework/doctor.js [options]',
    '',
    'Options:',
    '  --goal <text>                   Optional natural-language goal.',
    '  --mode <dev|pr|release>        Flow mode for diagnostics (default: dev).',
    '  --from-mode <mode>             Optional escalation hint for atm-flow.',
    '  --worktree-status-file <path>  Optional fallback git-status snapshot.',
    '  --allow-dirty-prefix <path>    Forwarded to strict H2U validators (repeatable).',
    '  --check-governance-drift       Compare canonical governance surfaces against governance-profile.json.',
    '  --identity-mode <mode>         Force identity check mode (advisory|blocking).',
    '  --json                         Emit machine-readable result.',
  ].join('\n') + '\n');
}

function detectChangedFiles(args) {
  if (args.worktreeStatusFile) {
    try {
      const absolutePath = path.isAbsolute(args.worktreeStatusFile)
        ? args.worktreeStatusFile
        : path.resolve(ROOT, args.worktreeStatusFile);
      const output = fs.readFileSync(absolutePath, 'utf8');
      return {
        source: `worktree-status-file:${normalizePath(path.relative(ROOT, absolutePath))}`,
        error: '',
        files: uniquePaths(parseGitStatusLines(output)),
      };
    } catch (error) {
      return {
        source: 'worktree-status-file',
        error: String(error && (error.message || error) || 'unknown'),
        files: [],
      };
    }
  }

  const proc = cp.spawnSync('git', ['status', '--short'], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (typeof proc.status !== 'number' || proc.status !== 0 || proc.error) {
    return {
      source: 'git-status',
      error: String(proc && proc.error && (proc.error.message || proc.error) || proc.stderr || '').trim(),
      files: [],
    };
  }

  return {
    source: 'git-status',
    error: '',
    files: uniquePaths(parseGitStatusLines(proc.stdout || '')),
  };
}

function classifyAreas(changedFiles) {
  const files = uniquePaths(changedFiles || []);
  const touchesH2U = files.some((filePath) => H2U_PATH_PATTERNS.some((pattern) => pattern.test(normalizePath(filePath))));
  const touchesTaskStore = files.some((filePath) => normalizePath(filePath).startsWith('docs/tasks/tasks-atm'));
  const touchesDocs = files.some((filePath) => normalizePath(filePath).startsWith('docs/'));

  return {
    touchesH2U,
    touchesTaskStore,
    touchesDocs,
  };
}

function classifyGoal(goal, areas) {
  const text = String(goal || '').toLowerCase();
  if (areas.touchesH2U || /h2u|html-to-ucuf|legacy/.test(text)) {
    return 'h2u-fix';
  }
  if (/atom|capsule|create-map|map/.test(text)) {
    return 'atom-or-map';
  }
  return 'generic';
}

function buildAtmFlowArgs(args) {
  const flowArgs = [
    path.join(ROOT, 'tools_node', 'atm-flow.js'),
    '--mode',
    args.mode,
    '--json',
  ];
  if (args.fromMode) {
    flowArgs.push('--from-mode', args.fromMode);
  }
  if (args.worktreeStatusFile) {
    flowArgs.push('--worktree-status-file', args.worktreeStatusFile);
  }
  for (const prefix of args.allowDirtyPrefixes || []) {
    flowArgs.push('--allow-dirty-prefix', prefix);
  }
  return flowArgs;
}

function runAtmFlowDoctor(args) {
  const flowArgs = buildAtmFlowArgs(args);
  const displayArgs = ['--mode', args.mode];
  if (args.fromMode) {
    displayArgs.push('--from-mode', args.fromMode);
  }
  if (args.worktreeStatusFile) {
    displayArgs.push('--worktree-status-file', args.worktreeStatusFile);
  }
  for (const prefix of args.allowDirtyPrefixes || []) {
    displayArgs.push('--allow-dirty-prefix', prefix);
  }
  displayArgs.push('--json');
  const proc = cp.spawnSync(process.execPath, flowArgs, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const stdout = String(proc.stdout || '').trim();
  const stderr = String(proc.stderr || '').trim();
  let report = null;
  try {
    report = stdout ? JSON.parse(stdout) : null;
  } catch {
    report = null;
  }
  return {
    ok: (proc.status ?? 1) === 0,
    status: proc.status ?? 1,
    command: ['node', 'tools_node/atm-flow.js', ...displayArgs].join(' '),
    stdout,
    stderr,
    report,
  };
}

function runGovernanceDoctor(args) {
  if (!args.checkGovernanceDrift) {
    return null;
  }
  return buildGovernanceReport();
}

function resolveIdentityDoctorConfig() {
  try {
    const loaded = loadGovernanceProfile();
    const identity = loaded && loaded.profile && loaded.profile.doctor
      ? loaded.profile.doctor.identityConsistency
      : null;
    if (!identity || typeof identity !== 'object' || identity.enabled === false) {
      return {
        enabled: false,
      };
    }
    return {
      enabled: true,
      defaultMode: String(identity.defaultMode || 'advisory').trim().toLowerCase() || 'advisory',
      commandAdvisory: String(identity.commandAdvisory || '').trim(),
      commandBlocking: String(identity.commandBlocking || '').trim(),
    };
  } catch (error) {
    return {
      enabled: false,
      error: String(error && (error.message || error) || 'unknown'),
    };
  }
}

function runIdentityConsistencyDoctor(args) {
  const config = resolveIdentityDoctorConfig();
  if (!config.enabled) {
    return {
      enabled: false,
      status: 'pass',
      mode: 'advisory',
      command: '',
      consistent: true,
      issues: [],
    };
  }

  const mode = ['advisory', 'blocking'].includes(args.identityMode)
    ? args.identityMode
    : config.defaultMode;
  const result = evaluateIdentityConsistency({
    mode,
    cwd: ROOT,
  });
  const command = mode === 'blocking'
    ? config.commandBlocking
    : config.commandAdvisory;

  return {
    enabled: true,
    ...result,
    command,
  };
}

function buildAtmFlowGuidance(profile, flow, changed, mode, h2uGateConfig = null) {
  const fallback = 'node tools_node/atm-flow.js --mode dev --json';
  const nextCommand = flow.report && flow.report.userFacing && flow.report.userFacing.nextCommand
    ? flow.report.userFacing.nextCommand
    : fallback;
  const why = flow.report && flow.report.userFacing && flow.report.userFacing.why
    ? flow.report.userFacing.why
    : (flow.ok ? 'atm-flow diagnostics are ready.' : 'atm-flow reported a blocker that needs attention.');
  const blockedAt = flow.report && flow.report.userFacing ? flow.report.userFacing.blockedAt || '' : '';
  const fallbackSnapshot = `git status --short > ${DEFAULT_H2U_WORKTREE_STATUS_FILE}`;
  const fallbackH2uConfig = h2uGateConfig || resolveH2uGateConfig({
    worktreeStatusFile: DEFAULT_H2U_WORKTREE_STATUS_FILE,
    allowDirtyPrefixes: [],
  });
  const h2uGateArgsText = buildH2uGateArgString(fallbackH2uConfig);
  const h2uLaunchGateCommand = `node tools_node/validate-legacy-h2u-launch.js --strict --require-worktree-check${h2uGateArgsText}`;
  const h2uFirstWinGateCommand = `node tools_node/validate-legacy-h2u-first-win.js --strict --require-worktree-check${h2uGateArgsText}`;
  const fallbackWithSnapshot = `node tools_node/atm-flow.js --mode ${mode}${h2uGateArgsText} --json`;
  const sawEperm = /eperm/i.test(String(changed.error || ''))
    || /eperm/i.test(String(flow.stderr || ''))
    || /eperm/i.test(String(flow.stdout || ''));

  if (sawEperm) {
    return {
      blockedAt: blockedAt || 'environment-permission',
      why: 'Git or Node child-process access hit EPERM, so doctor is falling back to a worktree snapshot flow.',
      nextCommand: fallbackSnapshot,
      afterNext: [
        fallbackWithSnapshot,
        profile === 'h2u-fix'
          ? h2uLaunchGateCommand
          : 'npm run atm:flow -- --mode pr --from-mode dev',
      ],
    };
  }

  const afterNext = profile === 'h2u-fix'
    ? [
      h2uLaunchGateCommand,
      h2uFirstWinGateCommand,
    ]
    : [
      'npm run atm:flow -- --mode pr --from-mode dev',
    ];

  return {
    blockedAt,
    why,
    nextCommand,
    afterNext,
  };
}

function applyGovernanceGuidance(userFacing, governance, identity) {
  const governanceCheckCommand = 'node tools_node/atomic-framework/atm-cli.js governance check --json';
  let next = {
    ...userFacing,
    afterNext: uniqueList(userFacing.afterNext || []),
  };

  if (governance) {
    const doctorStatus = governance.overall.doctorStatus;
    if (doctorStatus === 'drift') {
      next = {
        blockedAt: 'governance-drift',
        why: 'Canonical shared governance surfaces drifted away from governance-profile.json.',
        nextCommand: 'node tools_node/atomic-framework/atm-cli.js governance render',
        afterNext: uniqueList([
          `${governanceCheckCommand} --strict`,
          userFacing.nextCommand,
          ...userFacing.afterNext,
        ]),
      };
    } else if (doctorStatus === 'blocked-by-portability') {
      next = {
        blockedAt: userFacing.blockedAt || 'release-portability',
        why: `${userFacing.why} Shared governance surfaces are in sync, but release portability is still blocked by active governance portability probes.`,
        nextCommand: userFacing.nextCommand,
        afterNext: uniqueList([
          governanceCheckCommand,
          ...userFacing.afterNext,
        ]),
      };
    } else if (doctorStatus === 'advisory-local-only') {
      next = {
        blockedAt: userFacing.blockedAt,
        why: `${userFacing.why} Local editor-private governance settings exist outside the canonical shared profile.`,
        nextCommand: userFacing.nextCommand,
        afterNext: uniqueList([
          governanceCheckCommand,
          ...userFacing.afterNext,
        ]),
      };
    } else {
      next = {
        blockedAt: userFacing.blockedAt,
        why: `${userFacing.why} Canonical shared governance surfaces are in sync.`,
        nextCommand: userFacing.nextCommand,
        afterNext: uniqueList([
          governanceCheckCommand,
          ...userFacing.afterNext,
        ]),
      };
    }
  }

  if (!identity || !identity.enabled) {
    return next;
  }

  if (identity.status === 'blocking') {
    return {
      blockedAt: next.blockedAt || 'identity-consistency',
      why: `${next.why} Agent identity consistency is in blocking mode and currently mismatched.`,
      nextCommand: identity.command || 'node tools_node/agent-identity.js ensure --write-git',
      afterNext: uniqueList([
        'node tools_node/agent-identity.js ensure --write-git',
        ...next.afterNext,
      ]),
    };
  }

  if (identity.status === 'advisory') {
    return {
      blockedAt: next.blockedAt,
      why: `${next.why} Agent identity consistency check returned advisory warnings.`,
      nextCommand: next.nextCommand,
      afterNext: uniqueList([
        identity.command || 'node tools_node/check-agent-identity-consistency.js --mode advisory --json',
        ...next.afterNext,
      ]),
    };
  }

  return {
    blockedAt: next.blockedAt,
    why: `${next.why} Agent identity consistency is aligned.`,
    nextCommand: next.nextCommand,
    afterNext: uniqueList([
      identity.command || 'node tools_node/check-agent-identity-consistency.js --mode advisory --json',
      ...next.afterNext,
    ]),
  };
}

function summarizeGovernance(governance) {
  if (!governance) {
    return {
      enabled: false,
    };
  }
  return {
    enabled: true,
    profileRelPath: governance.profileRelPath,
    driftStatus: governance.drift.status,
    localSurfaceStatus: governance.localSurfaces.status,
    portabilityStatus: governance.portability.status,
    doctorStatus: governance.overall.doctorStatus,
    mismatches: governance.drift.mismatches.map((item) => item.targetPath),
  };
}

function summarizeIdentity(identity) {
  if (!identity || !identity.enabled) {
    return {
      enabled: false,
    };
  }
  return {
    enabled: true,
    mode: identity.mode,
    status: identity.status,
    consistent: identity.consistent,
    canonicalAgent: identity.canonicalAgent || '',
    expectedEmail: identity.expectedEmail || '',
    issueCount: Array.isArray(identity.issues) ? identity.issues.length : 0,
    issues: Array.isArray(identity.issues) ? identity.issues.map((item) => item.code) : [],
  };
}

function renderMarkdown(result) {
  const lines = [
    '# ATM Doctor',
    '',
    `- Route profile: ${result.routeProfile}`,
    `- Goal: ${result.goal || '(unset)'}`,
    `- Mode: ${result.mode}`,
    `- Changed files: ${result.changedFiles.length}`,
    `- H2U touched: ${result.areas.touchesH2U}`,
    `- Why: ${result.userFacing.why}`,
    `- Next: ${result.userFacing.nextCommand}`,
  ];

  if (result.userFacing.blockedAt) {
    lines.push(`- Blocked at: ${result.userFacing.blockedAt}`);
  }

  if (result.governance && result.governance.enabled) {
    lines.push(`- Governance drift: ${result.governance.driftStatus}`);
    lines.push(`- Governance portability: ${result.governance.portabilityStatus}`);
  }
  if (result.identityConsistency && result.identityConsistency.enabled) {
    lines.push(`- Identity consistency: ${result.identityConsistency.status}`);
    lines.push(`- Identity issues: ${result.identityConsistency.issueCount}`);
  }

  lines.push('', '## After Next');
  for (const command of result.userFacing.afterNext) {
    lines.push(`- ${command}`);
  }
  return `${lines.join('\n')}\n`;
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    printUsage();
    return 0;
  }

  const changed = detectChangedFiles(args);
  const areas = classifyAreas(changed.files);
  const routeProfile = classifyGoal(args.goal, areas);
  const h2uGateConfig = areas.touchesH2U
    ? resolveH2uGateConfig({
      worktreeStatusFile: args.worktreeStatusFile,
      allowDirtyPrefixes: args.allowDirtyPrefixes,
    })
    : null;
  const flow = runAtmFlowDoctor({
    ...args,
    worktreeStatusFile: h2uGateConfig ? h2uGateConfig.worktreeStatusFile : args.worktreeStatusFile,
    allowDirtyPrefixes: h2uGateConfig ? h2uGateConfig.allowDirtyPrefixes : args.allowDirtyPrefixes,
  });
  const governance = runGovernanceDoctor(args);
  const identity = runIdentityConsistencyDoctor(args);
  const userFacing = applyGovernanceGuidance(
    buildAtmFlowGuidance(routeProfile, flow, changed, args.mode, h2uGateConfig),
    governance,
    identity
  );

  const result = {
    ok: true,
    goal: args.goal,
    mode: args.mode,
    routeProfile,
    changedFilesSource: changed.source,
    changedFilesError: changed.error,
    changedFiles: changed.files,
    areas,
    h2uWorktreeGate: h2uGateConfig
      ? {
        enabled: true,
        worktreeStatusFile: h2uGateConfig.worktreeStatusFile,
        allowDirtyPrefixes: h2uGateConfig.allowDirtyPrefixes,
      }
      : {
        enabled: false,
        worktreeStatusFile: '',
        allowDirtyPrefixes: [],
      },
    atmFlow: {
      ok: flow.ok,
      status: flow.status,
      command: flow.command,
      parseOk: Boolean(flow.report),
    },
    governance: summarizeGovernance(governance),
    identityConsistency: summarizeIdentity(identity),
    userFacing,
  };

  if (args.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(renderMarkdown(result));
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
  applyGovernanceGuidance,
  buildAtmFlowGuidance,
  classifyAreas,
  classifyGoal,
  detectChangedFiles,
  main,
  parseArgs,
  runAtmFlowDoctor,
  runIdentityConsistencyDoctor,
  runGovernanceDoctor,
};
