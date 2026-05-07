'use strict';

const path = require('node:path');

const {
  ROOT,
  default3KLifeGovernanceConfig,
} = require('./governance-adapter');

const upstreamRepoRoot = path.resolve(
  process.env.ATM_UPSTREAM_REPO_ROOT || path.join(ROOT, '..', 'AI-Atomic-Framework')
);

const upstreamCliEntrypoint = path.resolve(
  process.env.ATM_UPSTREAM_CLI_ENTRYPOINT || path.join(upstreamRepoRoot, 'packages', 'cli', 'src', 'atm.mjs')
);

const localWorkbenchRoot = path.resolve(
  process.env.ATM_LOCAL_WORKBENCH_ROOT || path.join(ROOT, 'tools_node', 'atomic-framework', 'workbench')
);

const config = {
  ...default3KLifeGovernanceConfig,
  adapterName: '@3klife/atm-config-shadow',
  adapterVersion: '0.1.0-shadow',
  shadowMode: true,
  reportOnly: true,
  allowMutations: false,
  repositoryRoot: ROOT,
  upstreamRepoRoot,
  upstreamCliEntrypoint,
  upstreamCliPackageRoot: path.join(upstreamRepoRoot, 'packages', 'cli'),
  localWorkbenchRoot,
  workbenchRoot: localWorkbenchRoot,
  bootstrapCommand: 'bootstrap',
  defaultCliCommand: 'status',
  defaultBootstrapArgs: ['--dry-run', '--json'],
  defaultReportOnly: true,
  defaultRunMode: 'shadow',
  localAdapterRoot: path.join(ROOT, 'tools_node', 'adapters', 'atm-3klife'),
  shadowReportRoot: path.join(ROOT, 'artifacts', 'atm-3-0002'),
  resolveLocalPath(...segments) {
    return path.resolve(ROOT, ...segments);
  },
  resolveUpstreamPath(...segments) {
    return path.resolve(upstreamRepoRoot, ...segments);
  },
};

module.exports = config;