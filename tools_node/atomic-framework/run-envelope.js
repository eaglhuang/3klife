#!/usr/bin/env node
'use strict';

const path = require('path');
const { spawnSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    finalize: false,
    task: '',
    workflow: '',
    json: false,
    agentFeedback: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--finalize') {
      args.finalize = true;
      continue;
    }
    if (token === '--task') {
      args.task = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--workflow') {
      args.workflow = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--json') {
      args.json = true;
      continue;
    }
    if (token === '--no-agent-feedback') {
      args.agentFeedback = false;
      continue;
    }
  }

  return args;
}

function isAtmTask(taskId) {
  return /^ATM-/i.test(String(taskId || '').trim());
}

function runComputeGate(profile, options = {}) {
  const commandArgs = [
    path.join(PROJECT_ROOT, 'tools_node', 'compute-gate.js'),
    '--profile',
    profile,
  ];
  if (options.agentFeedback !== false) {
    commandArgs.push('--agent-feedback');
  }

  const result = spawnSync(process.execPath, commandArgs, {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    shell: false,
  });

  return {
    ok: (result.status ?? 1) === 0,
    exitCode: result.status ?? 1,
    stdout: String(result.stdout || ''),
    stderr: String(result.stderr || ''),
    command: `node tools_node/compute-gate.js --profile ${profile}${options.agentFeedback !== false ? ' --agent-feedback' : ''}`,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.finalize) {
    const message = 'atm run envelope currently supports --finalize only.';
    if (args.json) {
      process.stdout.write(`${JSON.stringify({
        ok: false,
        mode: 'run-envelope',
        finalize: false,
        message,
      }, null, 2)}\n`);
    } else {
      process.stderr.write(`${message}\n`);
    }
    process.exit(1);
  }

  const profile = isAtmTask(args.task) ? 'atm' : 'standard';
  const computeGate = runComputeGate(profile, { agentFeedback: args.agentFeedback });

  const payload = {
    ok: computeGate.ok,
    mode: 'run-envelope',
    finalize: true,
    task: args.task,
    workflow: args.workflow,
    computeGate,
  };

  if (args.json) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  } else {
    if (computeGate.stdout) {
      process.stdout.write(computeGate.stdout);
    }
    if (computeGate.stderr) {
      process.stderr.write(computeGate.stderr);
    }
    process.stdout.write(`[atm-run-envelope] finalize profile=${profile} task=${args.task || '(unset)'} ok=${computeGate.ok}\n`);
  }

  process.exit(computeGate.exitCode);
}

main();
