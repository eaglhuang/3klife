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

function runUpstreamScript(scriptRelativePath, commandArgs = [], overrides = {}) {
  const config = resolveConfig(overrides);
  const scriptPath = path.resolve(config.upstreamRepoRoot, scriptRelativePath);

  if (!fs.existsSync(scriptPath)) {
    process.stderr.write(`[atm wrapper] Missing upstream script: ${scriptPath}\n`);
    return 1;
  }

  const result = spawnSync(process.execPath, [scriptPath, ...commandArgs], {
    cwd: config.upstreamRepoRoot,
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
    process.stderr.write(`[atm wrapper] ${result.error.message}\n`);
  }

  return typeof result.status === 'number' ? result.status : 1;
}

function runRunEnvelope(argv = process.argv.slice(2), overrides = {}) {
  const parsed = parseWrapperArgs(argv);
  const config = resolveConfig({
    ...parsed,
    ...overrides,
  });

  const scriptPath = path.resolve(config.repositoryRoot, 'tools_node', 'atomic-framework', 'run-envelope.js');
  if (!fs.existsSync(scriptPath)) {
    process.stderr.write(`[atm wrapper] Missing run envelope script: ${scriptPath}\n`);
    return 1;
  }

  const result = spawnSync(process.execPath, [scriptPath, ...parsed.args], {
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
    process.stderr.write(`[atm wrapper] ${result.error.message}\n`);
  }

  return typeof result.status === 'number' ? result.status : 1;
}

function runLocalScript(scriptName, scriptArgs = [], overrides = {}) {
  const config = resolveConfig(overrides);
  const scriptPath = path.resolve(config.repositoryRoot, 'tools_node', 'atomic-framework', scriptName);
  if (!fs.existsSync(scriptPath)) {
    process.stderr.write(`[atm wrapper] Missing local script: ${scriptPath}\n`);
    return 1;
  }

  const result = spawnSync(process.execPath, [scriptPath, ...scriptArgs], {
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
    const errorMessage = result.error.message || String(result.error);
    if (/EPERM/i.test(errorMessage)) {
      try {
        const localModule = require(scriptPath);
        if (!localModule || typeof localModule.main !== 'function') {
          process.stderr.write(`[atm wrapper] ${errorMessage}\n`);
          return typeof result.status === 'number' ? result.status : 1;
        }
        return localModule.main(scriptArgs);
      } catch (fallbackError) {
        process.stderr.write(`[atm wrapper] ${errorMessage}\n`);
        process.stderr.write(`[atm wrapper] fallback failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}\n`);
        return typeof result.status === 'number' ? result.status : 1;
      }
    }
    process.stderr.write(`[atm wrapper] ${errorMessage}\n`);
  }

  return typeof result.status === 'number' ? result.status : 1;
}

function runPoliceAll(argv = process.argv.slice(2), overrides = {}) {
  const parsed = parseWrapperArgs(argv);
  return runUpstreamScript('scripts/validate-police.mjs', ['--mode', 'validate', ...parsed.args], overrides);
}

function runVerifyAll(argv = process.argv.slice(2), overrides = {}) {
  const parsed = parseWrapperArgs(argv);
  return runUpstreamScript('scripts/validate-registry-core.mjs', ['--mode', 'validate', ...parsed.args], overrides);
}

function runBootstrap(argv = process.argv.slice(2), overrides = {}) {
  const parsed = parseWrapperArgs(argv);
  const config = resolveConfig({
    ...parsed,
    ...overrides,
  });

  return runUpstreamCommand('bootstrap', parsed.args, config);
}

function buildKickoffArgsFromStart(startArgs = []) {
  const raw = Array.isArray(startArgs) ? startArgs : [];
  if (raw.includes('--goal')) {
    return [...raw];
  }

  const passthrough = [];
  const goalTokens = [];

  for (let index = 0; index < raw.length; index += 1) {
    const token = raw[index];

    if (token === '--mode' || token === '--task' || token === '--format') {
      passthrough.push(token);
      const value = raw[index + 1];
      if (value && !value.startsWith('--')) {
        passthrough.push(value);
        index += 1;
      }
      continue;
    }

    if (token === '--json' || token === '--help' || token === '-h') {
      passthrough.push(token);
      continue;
    }

    if (token.startsWith('--')) {
      passthrough.push(token);
      continue;
    }

    goalTokens.push(token);
  }

  if (goalTokens.length === 0) {
    return passthrough;
  }

  return ['--goal', goalTokens.join(' '), ...passthrough];
}

function runStartCommand(argv = process.argv.slice(2), overrides = {}) {
  const parsed = parseWrapperArgs(argv);
  const config = resolveConfig({
    ...parsed,
    ...overrides,
  });
  const kickoffArgs = buildKickoffArgsFromStart(parsed.args);
  const hasHelp = kickoffArgs.includes('--help') || kickoffArgs.includes('-h');
  const hasGoal = kickoffArgs.includes('--goal');
  if (!hasHelp && !hasGoal) {
    process.stderr.write('start requires a goal text. Example: node tools_node/atomic-framework/atm-cli.js start "幫我寫一個小遊戲"\n');
    return 2;
  }
  return runLocalScript('kickoff.js', kickoffArgs, config);
}

function runAtmCli(argv = process.argv.slice(2), overrides = {}) {
  const parsed = parseWrapperArgs(argv);
  const commandName = parsed.command || 'bootstrap';
  const config = resolveConfig({
    ...parsed,
    ...overrides,
  });

  if (commandName === 'police') {
    return runPoliceAll(argv, config);
  }

  if (commandName === 'verify' && parsed.args.includes('--all')) {
    return runVerifyAll(argv, config);
  }

  if (commandName === 'run') {
    return runRunEnvelope(argv, config);
  }

  if (commandName === 'start') {
    return runStartCommand(argv, config);
  }

  if (commandName === 'doctor') {
    return runLocalScript('doctor.js', parsed.args, config);
  }

  if (commandName === 'kickoff') {
    return runLocalScript('kickoff.js', parsed.args, config);
  }

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
  runUpstreamScript,
  runBootstrap,
  runAtmCli,
  runPoliceAll,
  runVerifyAll,
  runRunEnvelope,
  runLocalScript,
  buildKickoffArgsFromStart,
  runStartCommand,
};
