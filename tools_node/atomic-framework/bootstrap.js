'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const baseConfig = require('../adapters/atm-3klife/atm.config');

function readNextValue(argv, index, flagName) {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${flagName} requires a value.`);
  }
  return value;
}

function parseWrapperArgs(argv = []) {
  const state = {
    apply: false,
    reportOnly: true,
    upstreamRepoRoot: null,
    upstreamCliEntrypoint: null,
    command: null,
    args: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--apply') {
      state.apply = true;
      state.reportOnly = false;
      continue;
    }

    if (token === '--report-only') {
      state.reportOnly = true;
      continue;
    }

    if (token === '--upstream-root') {
      state.upstreamRepoRoot = path.resolve(readNextValue(argv, index, '--upstream-root'));
      index += 1;
      continue;
    }

    if (token === '--upstream-cli') {
      state.upstreamCliEntrypoint = path.resolve(readNextValue(argv, index, '--upstream-cli'));
      index += 1;
      continue;
    }

    if (state.command === null && !token.startsWith('--')) {
      state.command = token;
      continue;
    }

    state.args.push(token);
  }

  return state;
}

function resolveConfig(overrides = {}) {
  const config = Object.assign({}, baseConfig, overrides);

  config.repositoryRoot = path.resolve(config.repositoryRoot || baseConfig.repositoryRoot || process.cwd());
  config.upstreamRepoRoot = path.resolve(config.upstreamRepoRoot || baseConfig.upstreamRepoRoot);
  config.upstreamCliEntrypoint = path.resolve(
    config.upstreamCliEntrypoint || baseConfig.upstreamCliEntrypoint || path.join(config.upstreamRepoRoot, 'packages', 'cli', 'src', 'atm.mjs')
  );
  config.localWorkbenchRoot = path.resolve(
    config.localWorkbenchRoot || config.workbenchRoot || baseConfig.localWorkbenchRoot || path.join(config.repositoryRoot, 'tools_node', 'atomic-framework', 'workbench')
  );
  config.workbenchRoot = config.localWorkbenchRoot;
  config.reportOnly = overrides.reportOnly !== undefined ? Boolean(overrides.reportOnly) : Boolean(baseConfig.reportOnly);
  config.apply = Boolean(overrides.apply);

  return config;
}

function ensureWorkbenchRoot(config) {
  fs.mkdirSync(config.localWorkbenchRoot, { recursive: true });
  return config.localWorkbenchRoot;
}

function buildCommandArgs(commandName, commandArgs, config) {
  const args = [...commandArgs];
  const shouldReportOnly = config.reportOnly && !config.apply;

  if (shouldReportOnly && !args.includes('--json')) {
    args.push('--json');
  }

  if (shouldReportOnly && (commandName === 'bootstrap' || commandName === 'init') && !args.includes('--dry-run')) {
    args.push('--dry-run');
  }

  return args;
}

function runUpstreamCommand(commandName, commandArgs = [], overrides = {}) {
  const config = resolveConfig(overrides);
  ensureWorkbenchRoot(config);

  if (!fs.existsSync(config.upstreamCliEntrypoint)) {
    process.stderr.write(`[atm bootstrap wrapper] Upstream CLI not found: ${config.upstreamCliEntrypoint}\n`);
    return 1;
  }

  const args = buildCommandArgs(commandName, commandArgs, config);
  const result = spawnSync(process.execPath, [config.upstreamCliEntrypoint, commandName, ...args], {
    cwd: config.repositoryRoot,
    env: {
      ...process.env,
      ATM_UPSTREAM_REPO_ROOT: config.upstreamRepoRoot,
      ATM_UPSTREAM_CLI_ENTRYPOINT: config.upstreamCliEntrypoint,
      ATM_LOCAL_WORKBENCH_ROOT: config.localWorkbenchRoot,
    },
    encoding: 'utf8',
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  if (result.error) {
    process.stderr.write(`[atm bootstrap wrapper] ${result.error.message}\n`);
  }

  return typeof result.status === 'number' ? result.status : 1;
}

function runBootstrap(argv = process.argv.slice(2), overrides = {}) {
  const parsed = parseWrapperArgs(argv);
  const config = resolveConfig({
    ...parsed,
    ...overrides,
  });

  return runUpstreamCommand('bootstrap', parsed.args, config);
}

function runAtmCli(argv = process.argv.slice(2), overrides = {}) {
  const parsed = parseWrapperArgs(argv);
  const commandName = parsed.command || 'bootstrap';
  const config = resolveConfig({
    ...parsed,
    ...overrides,
  });

  return runUpstreamCommand(commandName, parsed.command ? parsed.args : parsed.args, config);
}

if (require.main === module) {
  process.exitCode = runBootstrap();
}

module.exports = {
  baseConfig,
  parseWrapperArgs,
  resolveConfig,
  ensureWorkbenchRoot,
  buildCommandArgs,
  runUpstreamCommand,
  runBootstrap,
  runAtmCli,
};