#!/usr/bin/env node
'use strict';

const path = require('node:path');

const { buildGovernanceReport } = require('./governance/checker');
const { resolveUpstreamPaths } = require('../lib/upstream-env');

const projectRoot = path.resolve(__dirname, '..', '..');
const upstreamPaths = resolveUpstreamPaths({
  projectRoot,
});
const upstreamCliPath = upstreamPaths.upstreamCliEntrypoint;

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
    '  --mode <dev|pr|release>       Initial flow mode for doctor (default: dev).',
    '  --json                        Emit machine-readable result.',
  ].join('\n') + '\n');
}

function inferTitle(goal) {
  const tokens = normalizeText(goal).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return 'CreateAtom';
  }
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
  if (/h2u|html-to-ucuf|legacy/.test(text)) {
    return 'h2u-fix';
  }
  if (/create-map|map|atomic map/.test(text)) {
    return 'map-birth';
  }
  if (/create|new|build|atom|capsule/.test(text)) {
    return 'atom-birth';
  }
  return 'generic';
}

function escapeDoubleQuotes(value) {
  return String(value || '').replace(/"/g, '\\"');
}

function probeGovernance() {
  try {
    return buildGovernanceReport();
  } catch {
    return null;
  }
}

function buildRoutingSteps(args, routeProfile) {
  const safeGoal = escapeDoubleQuotes(args.goal);
  const safeTitle = inferTitle(args.goal);

  if (args.task) {
    return {
      nextCommand: `node tools_node/atomic-framework/task-router.js --task ${args.task} --format markdown`,
      steps: [
        {
          id: 'route-task',
          title: 'Route directly from task id.',
          command: `node tools_node/atomic-framework/task-router.js --task ${args.task} --format markdown`,
        },
      ],
    };
  }

  if (routeProfile === 'h2u-fix') {
    return {
      nextCommand: `node tools_node/atomic-framework/task-router.js --intent fix-h2u --goal "${safeGoal}" --format markdown`,
      steps: [
        {
          id: 'route-intent-fix-h2u',
          title: 'Route through the fix-h2u intent taxonomy.',
          command: `node tools_node/atomic-framework/task-router.js --intent fix-h2u --goal "${safeGoal}" --format markdown`,
        },
      ],
    };
  }

  if (routeProfile === 'atom-birth') {
    return {
      nextCommand: `node tools_node/atomic-framework/task-router.js --intent create-atom --title ${safeTitle} --description "${safeGoal}" --format markdown`,
      steps: [
        {
          id: 'route-intent',
          title: 'Route through the create-atom intent.',
          command: `node tools_node/atomic-framework/task-router.js --intent create-atom --title ${safeTitle} --description "${safeGoal}" --format markdown`,
        },
      ],
    };
  }

  if (routeProfile === 'map-birth') {
    return {
      nextCommand: `node ${upstreamCliPath.replace(/\\/g, '/')} guide create-map`,
      steps: [
        {
          id: 'guide-map',
          title: 'Open the upstream create-map guide.',
          command: `node ${upstreamCliPath.replace(/\\/g, '/')} guide create-map`,
        },
      ],
    };
  }

  return {
    nextCommand: `node tools_node/atomic-framework/doctor.js --goal "${safeGoal}" --mode ${args.mode} --json`,
    steps: [
      {
        id: 'doctor-first',
        title: 'Run doctor first to pick the right lane.',
        command: `node tools_node/atomic-framework/doctor.js --goal "${safeGoal}" --mode ${args.mode} --json`,
      },
    ],
  };
}

function buildPlan(args) {
  const routeProfile = classifyGoal(args.goal);
  const governance = probeGovernance();
  const governanceStatus = governance ? governance.overall.doctorStatus : 'pass';
  const routing = buildRoutingSteps(args, routeProfile);
  const steps = [
    {
      id: 'identity-gate',
      title: 'Align AGENT_IDENTITY and repo-local git identity.',
      command: 'node tools_node/agent-identity.js ensure --write-git',
    },
  ];

  if (governance) {
    steps.push({
      id: 'governance-check',
      title: 'Check canonical shared governance surfaces.',
      command: 'node tools_node/atomic-framework/atm-cli.js governance check --json',
    });
    if (governanceStatus === 'drift') {
      steps.push({
        id: 'governance-render',
        title: 'Re-render shared governance surfaces from the canonical profile.',
        command: 'node tools_node/atomic-framework/atm-cli.js governance render',
      });
    }
  }

  steps.push(...routing.steps);

  if (routeProfile === 'h2u-fix') {
    steps.push(
      {
        id: 'doctor-h2u',
        title: 'Run doctor on the H2U lane.',
        command: `node tools_node/atomic-framework/doctor.js --goal "${escapeDoubleQuotes(args.goal)}" --mode dev --check-governance-drift --json`,
      },
      {
        id: 'h2u-launch-gate',
        title: 'Run the H2U launch gate.',
        command: 'node tools_node/validate-legacy-h2u-launch.js --strict',
      },
      {
        id: 'flow-dev',
        title: 'Run the ATM dev gate.',
        command: 'node tools_node/atm-flow.js --mode dev --json',
      }
    );
  } else {
    steps.push({
      id: 'flow-dev',
      title: 'Run the ATM dev gate.',
      command: 'node tools_node/atm-flow.js --mode dev --json',
    });
  }

  const guardrails = [
    'Keep governance generation limited to shared repo-tracked surfaces.',
    'Do not absorb H2U, UCUF, or Cocos domain rules into ATM core.',
    'Treat release portability as governance-profile-driven and verify it through doctor probes.',
  ];

  if (governanceStatus === 'drift') {
    guardrails.unshift('Fix governance drift before routing new work through stale shared surfaces.');
  } else if (governanceStatus === 'blocked-by-portability') {
    guardrails.push('Release portability is still blocked by active governance portability probes.');
  } else if (governanceStatus === 'advisory-local-only') {
    guardrails.push('Local editor-private settings remain advisory and outside the canonical shared profile.');
  }

  return {
    routeProfile,
    nextCommand: governanceStatus === 'drift'
      ? 'node tools_node/atomic-framework/atm-cli.js governance render'
      : routing.nextCommand,
    steps,
    guardrails,
    governance: governance
      ? {
        profileRelPath: governance.profileRelPath,
        doctorStatus: governance.overall.doctorStatus,
        driftStatus: governance.drift.status,
        portabilityStatus: governance.portability.status,
      }
      : null,
  };
}

function renderMarkdown(result) {
  const lines = [
    '# ATM Kickoff',
    '',
    `- Goal: ${result.goal}`,
    `- routeProfile: ${result.routeProfile}`,
    '- Identity gate: node tools_node/agent-identity.js ensure --write-git',
    `- Next: ${result.nextCommand}`,
  ];

  if (result.governance) {
    lines.push(`- Governance status: ${result.governance.doctorStatus}`);
  }

  lines.push('', '## Steps');
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
    governance: plan.governance,
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
  toKebabCase,
};
