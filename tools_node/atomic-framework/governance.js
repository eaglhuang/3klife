#!/usr/bin/env node
'use strict';

const { runGovernanceCheck, runGovernanceMigrate, runGovernanceRender } = require('./governance/index');

function parseArgs(argv = process.argv.slice(2)) {
  const state = {
    command: '',
    json: false,
    strict: false,
    dryRun: false,
    fromVersion: '',
    toVersion: '',
    profilePath: '',
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = () => argv[++index] || '';

    if (!state.command && !token.startsWith('--')) {
      state.command = token;
      continue;
    }
    if (token === '--json') {
      state.json = true;
      continue;
    }
    if (token === '--strict') {
      state.strict = true;
      continue;
    }
    if (token === '--dry-run') {
      state.dryRun = true;
      continue;
    }
    if (token === '--from') {
      state.fromVersion = String(next() || '').trim();
      continue;
    }
    if (token === '--to') {
      state.toVersion = String(next() || '').trim();
      continue;
    }
    if (token === '--profile') {
      state.profilePath = String(next() || '').trim();
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

function printHelp() {
  process.stdout.write([
    'Usage: node tools_node/atomic-framework/governance.js <render|check|migrate> [options]',
    '',
    'Options:',
    '  --profile <path>  Override governance profile path.',
    '  --dry-run         Render without writing files.',
    '  --from <version>  Migration source version (example: v2).',
    '  --to <version>    Migration target version (example: v3).',
    '  --json            Emit machine-readable output.',
    '  --strict          Exit non-zero on schema/drift failures.',
  ].join('\n') + '\n');
}

function renderMarkdown(result, command) {
  if (command === 'render') {
    const lines = [
      '# ATM Governance Render',
      '',
      `- Profile: ${result.profileRelPath}`,
      `- Dry run: ${result.dryRun}`,
      `- Schema: ${result.schema.ok ? 'pass' : 'fail'}`,
      '',
      '## Targets',
      ...result.writes.map((item) => `- ${item.targetPath} (${item.kind}) changed=${item.changed}`),
    ];
    if (!result.schema.ok) {
      lines.push('', '## Errors', ...result.schema.errors.map((error) => `- ${error}`));
    }
    return `${lines.join('\n')}\n`;
  }

  const lines = [
    '# ATM Governance Check',
    '',
    `- Profile: ${result.profileRelPath}`,
    `- Drift: ${result.drift.status}`,
    `- Local surfaces: ${result.localSurfaces.status}`,
    `- Portability: ${result.portability.status}`,
    `- Doctor status: ${result.overall.doctorStatus}`,
  ];
  if (!result.schema.ok) {
    lines.push('', '## Errors', ...result.schema.errors.map((error) => `- ${error}`));
  }
  if (result.drift.mismatches.length > 0) {
    lines.push('', '## Drift', ...result.drift.mismatches.map((item) => `- ${item.targetPath}`));
  }
  return `${lines.join('\n')}\n`;
}

function renderMigrateMarkdown(result) {
  const lines = [
    '# ATM Governance Migrate',
    '',
    `- Profile: ${result.profileRelPath}`,
    `- Dry run: ${result.dryRun}`,
    `- From: v${result.fromVersion}`,
    `- To: v${result.toVersion}`,
    `- Schema: ${result.schema.ok ? 'pass' : 'fail'}`,
    `- Wrote profile: ${result.wroteProfile}`,
  ];
  if (Array.isArray(result.migration && result.migration.changes) && result.migration.changes.length > 0) {
    lines.push('', '## Changes');
    for (const change of result.migration.changes) {
      lines.push(`- ${change}`);
    }
  }
  if (!result.schema.ok) {
    lines.push('', '## Errors', ...result.schema.errors.map((error) => `- ${error}`));
  }
  return `${lines.join('\n')}\n`;
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help || !args.command) {
    printHelp();
    return args.help ? 0 : 1;
  }

  let result;
  if (args.command === 'render') {
    result = runGovernanceRender({
      profilePath: args.profilePath,
      dryRun: args.dryRun,
    });
  } else if (args.command === 'check') {
    result = runGovernanceCheck({
      profilePath: args.profilePath,
    });
  } else if (args.command === 'migrate') {
    result = runGovernanceMigrate({
      profilePath: args.profilePath,
      dryRun: args.dryRun,
      fromVersion: args.fromVersion,
      toVersion: args.toVersion,
    });
  } else {
    throw new Error(`unknown governance command: ${args.command}`);
  }

  if (args.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    if (args.command === 'migrate') {
      process.stdout.write(renderMigrateMarkdown(result));
    } else {
      process.stdout.write(renderMarkdown(result, args.command));
    }
  }

  if (args.strict && !result.ok) {
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
