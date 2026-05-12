#!/usr/bin/env node
'use strict';

const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..', '..');
const upstreamCliPath = path.join(projectRoot, '..', 'AI-Atomic-Framework', 'packages', 'cli', 'src', 'atm.mjs');

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

function parseArgs(argv = process.argv.slice(2)) {
  const state = {
    goal: '',
    task: '',
    mode: 'dev',
    format: 'markdown',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = () => argv[++index] || '';

    if (token === '--goal') {
      state.goal = normalizeText(next());
      continue;
    }
    if (token === '--task') {
      state.task = normalizeText(next());
      continue;
    }
    if (token === '--mode') {
      state.mode = normalizeText(next()).toLowerCase() || 'dev';
      continue;
    }
    if (token === '--format') {
      state.format = normalizeText(next()).toLowerCase() || 'markdown';
      continue;
    }
    if (token === '--json') {
      state.format = 'json';
      continue;
    }
    if (token === '--help' || token === '-h') {
      state.help = true;
      continue;
    }
    throw new Error(`unknown arg: ${token}`);
  }

  if (!state.goal) {
    throw new Error('kickoff requires --goal "<text>".');
  }

  return state;
}

function printUsage() {
  process.stdout.write([
    'Usage: node tools_node/atomic-framework/kickoff.js --goal "<text>" [options]',
    '',
    'Options:',
    '  --task <task-id>               Optional task card id.',
    '  --mode <dev|pr|release>        Initial flow mode for doctor (default: dev).',
    '  --json                         Emit machine-readable result.',
  ].join('\n') + '\n');
}

function inferTitle(goal) {
  const tokens = normalizeText(goal).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 'CreateAtom';
  const seed = tokens.slice(0, 5).join(' ');
  return seed
    .replace(/[^A-Za-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1).toLowerCase())
    .join('');
}

function classifyGoal(goal) {
  const text = normalizeText(goal).toLowerCase();
  if (/h2u|html-to-ucuf|legacy/.test(text)) return 'h2u-fix';
  if (/create-map|map|atomic map|映射/.test(text)) return 'map-birth';
  if (/create|new|build|atom|原子|capsule/.test(text)) return 'atom-birth';
  return 'generic';
}

function escapeDoubleQuotes(value) {
  return String(value || '').replace(/"/g, '\\"');
}

function buildPlan(args) {
  const routeProfile = classifyGoal(args.goal);
  const steps = [];
  let nextCommand = '';
  const safeGoal = escapeDoubleQuotes(args.goal);
  const safeTitle = inferTitle(args.goal);

  if (args.task) {
    nextCommand = `node tools_node/atomic-framework/task-router.js --task ${args.task} --format markdown`;
    steps.push({
      id: 'route-task',
      title: '先走 task-router（task 驅動）',
      command: nextCommand,
    });
  } else if (routeProfile === 'h2u-fix') {
    nextCommand = `node tools_node/atomic-framework/task-router.js --intent fix-h2u --goal "${safeGoal}" --format markdown`;
    steps.push({
      id: 'route-intent-fix-h2u',
      title: '先走 fix-h2u intent route（no-task-card）',
      command: nextCommand,
    });
  } else if (routeProfile === 'atom-birth') {
    nextCommand = `node tools_node/atomic-framework/task-router.js --intent create-atom --title ${safeTitle} --description "${safeGoal}" --format markdown`;
    steps.push({
      id: 'route-intent',
      title: '先走 intent route（no-task-card）',
      command: nextCommand,
    });
  } else if (routeProfile === 'map-birth') {
    nextCommand = `node ${upstreamCliPath.replace(/\\/g, '/')} guide create-map`;
    steps.push({
      id: 'guide-map',
      title: '讀 upstream create-map guide',
      command: nextCommand,
    });
  } else {
    nextCommand = `node tools_node/atomic-framework/doctor.js --goal "${safeGoal}" --mode ${args.mode} --json`;
    steps.push({
      id: 'doctor-first',
      title: '先跑 doctor 取當前 lane 的下一步',
      command: nextCommand,
    });
  }

  if (routeProfile === 'h2u-fix') {
    steps.push({
      id: 'doctor-h2u',
      title: '跑 doctor 取得當前 lane 的實際下一步',
      command: `node tools_node/atomic-framework/doctor.js --goal "${safeGoal}" --mode dev --json`,
    });
    steps.push({
      id: 'h2u-launch-gate',
      title: '跑 H2U 首戰 launch gate',
      command: 'node tools_node/validate-legacy-h2u-launch.js --strict',
    });
    steps.push({
      id: 'flow-dev',
      title: '跑 ATM dev gate',
      command: 'node tools_node/atm-flow.js --mode dev --json',
    });
  } else {
    steps.push({
      id: 'flow-dev',
      title: '跑 ATM dev gate',
      command: 'node tools_node/atm-flow.js --mode dev --json',
    });
  }

  return {
    routeProfile,
    nextCommand,
    steps,
    guardrails: [
      '先拿下一步命令，不要直接改主幹。',
      '先 dry-run / gate，再做 apply。',
      '若 gate 回傳 blocker，先解 blocker 再前進。',
    ],
  };
}

function renderMarkdown(result) {
  const lines = [
    '# ATM Kickoff',
    '',
    `- Goal: ${result.goal}`,
    `- routeProfile: ${result.routeProfile}`,
    `- Next: ${result.nextCommand}`,
    '',
    '## Steps',
  ];
  for (const step of result.steps) {
    lines.push(`- ${step.id}: ${step.title}`);
    lines.push(`  ${step.command}`);
  }
  lines.push('', '## Guardrails');
  for (const item of result.guardrails) {
    lines.push(`- ${item}`);
  }
  return `${lines.join('\n')}\n`;
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    printUsage();
    return 0;
  }

  const plan = buildPlan(args);
  const result = {
    ok: true,
    goal: args.goal,
    routeProfile: plan.routeProfile,
    nextCommand: plan.nextCommand,
    steps: plan.steps,
    guardrails: plan.guardrails,
  };

  if (args.format === 'json') {
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
  buildPlan,
  classifyGoal,
  inferTitle,
  main,
  parseArgs,
};
