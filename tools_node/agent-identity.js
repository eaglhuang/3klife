#!/usr/bin/env node
'use strict';

const path = require('node:path');
const {
  deriveAgentIdentity,
  expectedLocalEmail,
  readGitUserEmail,
  readGitUserName,
  writeGitIdentity,
} = require('./lib/agent-identity');

const ROOT = path.resolve(__dirname, '..');

function parseArgs(argv = process.argv.slice(2)) {
  const state = {
    command: 'show',
    writeGit: false,
    json: false,
  };
  for (const token of argv) {
    if (token === 'show' || token === 'ensure') {
      state.command = token;
      continue;
    }
    if (token === '--write-git') {
      state.writeGit = true;
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
  return state;
}

function printUsage() {
  process.stdout.write([
    'Usage: node tools_node/agent-identity.js [show|ensure] [options]',
    '',
    'Options:',
    '  --write-git   Ensure repo-local git user.name/user.email use resolved agent identity.',
    '  --json        Emit machine-readable result.',
  ].join('\n') + '\n');
}

function guidanceBlock() {
  return [
    'Agent identity is missing.',
    'Please set one of the following before lock/task operations:',
    '  1) $env:AGENT_IDENTITY="<agent-slug>"',
    '  2) git config user.name "<agent-slug>"',
    'Then run:',
    '  node tools_node/agent-identity.js ensure --write-git',
  ];
}

function renderMarkdown(result) {
  const lines = [
    '# Agent Identity',
    '',
    `- ok: ${result.ok}`,
    `- agentName: ${result.agentName || '(unset)'}`,
    `- source: ${result.source}`,
    `- git.user.name: ${result.gitUserName || '(unset)'}`,
    `- git.user.email: ${result.gitUserEmail || '(unset)'}`,
  ];
  if (result.expectedEmail) {
    lines.push(`- expectedEmail: ${result.expectedEmail}`);
  }
  if (result.writeGit) {
    lines.push(`- writeGit: ${result.writeGit.ok ? 'applied' : `failed (${result.writeGit.error})`}`);
  }
  if (!result.ok) {
    lines.push('', ...guidanceBlock());
  }
  return `${lines.join('\n')}\n`;
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    printUsage();
    return 0;
  }

  const derived = deriveAgentIdentity({ cwd: ROOT });
  if (derived.ok && !process.env.AGENT_IDENTITY) {
    process.env.AGENT_IDENTITY = derived.agentName;
  }

  const result = {
    ok: derived.ok,
    agentName: derived.agentName,
    source: derived.source,
    gitUserName: readGitUserName(ROOT),
    gitUserEmail: readGitUserEmail(ROOT),
    expectedEmail: derived.ok ? expectedLocalEmail(derived.agentName) : '',
    writeGit: null,
  };

  if ((args.command === 'ensure' || args.writeGit) && derived.ok && args.writeGit) {
    result.writeGit = writeGitIdentity(derived.agentName, ROOT);
    result.gitUserName = readGitUserName(ROOT);
    result.gitUserEmail = readGitUserEmail(ROOT);
  }

  if (args.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(renderMarkdown(result));
  }

  if (args.command === 'ensure' && !result.ok) {
    return 1;
  }
  if (result.writeGit && result.writeGit.ok === false) {
    return 1;
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
  main,
  parseArgs,
};
