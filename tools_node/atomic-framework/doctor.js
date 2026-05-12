#!/usr/bin/env node
'use strict';

const path = require('node:path');
const cp = require('node:child_process');

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
  const out = [];
  for (const item of items || []) {
    const value = normalizePath(item).trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
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
      if (value) state.allowDirtyPrefixes.push(value);
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
    '  --goal <text>                  Optional natural-language goal.',
    '  --mode <dev|pr|release>       Flow mode for diagnostics (default: dev).',
    '  --from-mode <mode>            Optional escalation hint for atm-flow.',
    '  --worktree-status-file <path> Optional fallback git-status snapshot.',
    '  --allow-dirty-prefix <path>   Forwarded to strict H2U validators (repeatable).',
    '  --json                         Emit machine-readable result.',
  ].join('\n') + '\n');
}

function detectChangedFiles(args) {
  if (args.worktreeStatusFile) {
    try {
      const absolute = path.isAbsolute(args.worktreeStatusFile)
        ? args.worktreeStatusFile
        : path.resolve(ROOT, args.worktreeStatusFile);
      const output = require('node:fs').readFileSync(absolute, 'utf8');
      return {
        source: `worktree-status-file:${normalizePath(path.relative(ROOT, absolute))}`,
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
    command: ['node', 'tools_node/atm-flow.js', '--mode', args.mode, '--json'].join(' '),
    stdout,
    stderr,
    report,
  };
}

function buildGuidance(profile, flow, changed, mode) {
  const fallback = 'node tools_node/atm-flow.js --mode dev --json';
  const nextCommand = flow.report?.userFacing?.nextCommand || fallback;
  const why = flow.report?.userFacing?.why || (flow.ok ? '目前 gate 可跑。' : 'atm-flow 沒有回傳標準診斷。');
  const blockedAt = flow.report?.userFacing?.blockedAt || '';
  const fallbackSnapshot = 'git status --short > artifacts/legacy-h2u-first-win/worktree-status.txt';
  const fallbackWithSnapshot = `node tools_node/atm-flow.js --mode ${mode} --worktree-status-file artifacts/legacy-h2u-first-win/worktree-status.txt --json`;
  const sawEperm = /eperm/i.test(String(changed.error || ''))
    || /eperm/i.test(String(flow.stderr || ''))
    || /eperm/i.test(String(flow.stdout || ''));

  if (sawEperm) {
    return {
      blockedAt: blockedAt || 'environment-permission',
      why: '執行環境阻擋即時 git/node child process（EPERM），請先產生 worktree snapshot 再跑 flow。',
      nextCommand: fallbackSnapshot,
      afterNext: [
        fallbackWithSnapshot,
        profile === 'h2u-fix'
          ? 'node tools_node/validate-legacy-h2u-launch.js --strict --worktree-status-file artifacts/legacy-h2u-first-win/worktree-status.txt'
          : 'npm run atm:flow -- --mode pr --from-mode dev',
      ],
    };
  }

  const afterNext = profile === 'h2u-fix'
    ? [
        'node tools_node/validate-legacy-h2u-launch.js --strict',
        'node tools_node/validate-legacy-h2u-first-win.js --strict --require-worktree-check',
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
  const flow = runAtmFlowDoctor(args);
  const userFacing = buildGuidance(routeProfile, flow, changed, args.mode);

  const result = {
    ok: true,
    goal: args.goal,
    mode: args.mode,
    routeProfile,
    changedFilesSource: changed.source,
    changedFilesError: changed.error,
    changedFiles: changed.files,
    areas,
    atmFlow: {
      ok: flow.ok,
      status: flow.status,
      command: flow.command,
      parseOk: Boolean(flow.report),
    },
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
  classifyAreas,
  classifyGoal,
  detectChangedFiles,
  main,
  parseArgs,
  runAtmFlowDoctor,
};
