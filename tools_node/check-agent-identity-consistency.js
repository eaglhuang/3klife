#!/usr/bin/env node
'use strict';

const path = require('node:path');
const {
  deriveAgentIdentity,
  expectedLocalEmail,
  normalizeAgentSlug,
  readGitUserEmail,
  readGitUserName,
} = require('./lib/agent-identity');

const ROOT = path.resolve(__dirname, '..');
const VALID_MODES = new Set(['advisory', 'blocking']);

function parseArgs(argv = process.argv.slice(2)) {
  const state = {
    mode: 'advisory',
    json: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = () => argv[++index] || '';

    if (token === '--mode') {
      state.mode = String(next() || '').trim().toLowerCase();
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
    throw new Error(`invalid --mode: ${state.mode} (expected advisory|blocking)`);
  }
  return state;
}

function printUsage() {
  process.stdout.write([
    'Usage: node tools_node/check-agent-identity-consistency.js [options]',
    '',
    'Options:',
    '  --mode <advisory|blocking>  advisory: always exit 0 with warning payload, blocking: exit 1 on mismatch.',
    '  --json                      Emit machine-readable result.',
  ].join('\n') + '\n');
}

function buildIssue(code, message) {
  return { code, message };
}

function evaluateIdentityConsistency(options = {}) {
  const mode = String(options.mode || 'advisory').trim().toLowerCase();
  if (!VALID_MODES.has(mode)) {
    return {
      ok: false,
      mode,
      status: 'error',
      issues: [buildIssue('invalid-mode', `unsupported mode: ${mode}`)],
    };
  }

  const cwd = options.cwd ? path.resolve(options.cwd) : ROOT;
  const env = options.env || process.env;
  const envIdentity = normalizeAgentSlug(env.AGENT_IDENTITY || '');
  const gitUserName = normalizeAgentSlug(readGitUserName(cwd));
  const gitUserEmail = String(readGitUserEmail(cwd) || '').trim();
  const derived = deriveAgentIdentity({ cwd });
  const canonicalAgent = derived.ok ? normalizeAgentSlug(derived.agentName) : '';
  const expectedEmail = canonicalAgent ? expectedLocalEmail(canonicalAgent) : '';
  const issues = [];

  if (!envIdentity) {
    issues.push(buildIssue('missing-env-agent-identity', 'AGENT_IDENTITY is not set.'));
  }

  if (!gitUserName) {
    issues.push(buildIssue('missing-git-user-name', 'repo-local git user.name is not set.'));
  }

  if (!canonicalAgent) {
    issues.push(buildIssue('missing-canonical-agent', 'Cannot resolve canonical agent identity from AGENT_IDENTITY or git user.name.'));
  }

  if (envIdentity && canonicalAgent && envIdentity !== canonicalAgent) {
    issues.push(buildIssue('env-agent-mismatch', `AGENT_IDENTITY=${envIdentity} does not match canonical identity ${canonicalAgent}.`));
  }

  if (gitUserName && canonicalAgent && gitUserName !== canonicalAgent) {
    issues.push(buildIssue('git-user-name-mismatch', `git user.name=${gitUserName} does not match canonical identity ${canonicalAgent}.`));
  }

  if (!gitUserEmail) {
    issues.push(buildIssue('missing-git-user-email', 'repo-local git user.email is not set.'));
  } else if (expectedEmail && gitUserEmail.toLowerCase() !== expectedEmail.toLowerCase()) {
    issues.push(buildIssue('git-user-email-mismatch', `git user.email=${gitUserEmail} does not match expected ${expectedEmail}.`));
  }

  const consistent = issues.length === 0;
  const blocking = mode === 'blocking';
  const status = consistent
    ? 'pass'
    : blocking ? 'blocking' : 'advisory';

  return {
    ok: blocking ? consistent : true,
    mode,
    status,
    consistent,
    source: derived.source || 'none',
    canonicalAgent,
    envAgentIdentity: envIdentity,
    gitUserName,
    gitUserEmail,
    expectedEmail,
    issues,
  };
}

function renderMarkdown(result) {
  const lines = [
    '# Agent Identity Consistency',
    '',
    `- mode: ${result.mode}`,
    `- status: ${result.status}`,
    `- consistent: ${result.consistent}`,
    `- canonicalAgent: ${result.canonicalAgent || '(unset)'}`,
    `- source: ${result.source || 'none'}`,
    `- AGENT_IDENTITY: ${result.envAgentIdentity || '(unset)'}`,
    `- git.user.name: ${result.gitUserName || '(unset)'}`,
    `- git.user.email: ${result.gitUserEmail || '(unset)'}`,
    `- expectedEmail: ${result.expectedEmail || '(unset)'}`,
  ];

  if (Array.isArray(result.issues) && result.issues.length > 0) {
    lines.push('', '## Issues');
    for (const issue of result.issues) {
      lines.push(`- ${issue.code}: ${issue.message}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    printUsage();
    return 0;
  }

  const result = evaluateIdentityConsistency({
    mode: args.mode,
    cwd: ROOT,
  });

  if (args.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(renderMarkdown(result));
  }

  return result.ok ? 0 : 1;
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
  evaluateIdentityConsistency,
  main,
  parseArgs,
};
