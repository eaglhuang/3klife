'use strict';

function cloneEditorHookEntry(entry) {
  return {
    type: entry.type,
    command: entry.command,
    windows: entry.windows,
    timeout: entry.timeout,
  };
}

function renderEditorHookManifest(manifest) {
  const payload = { hooks: {} };
  for (const stage of manifest.hooks || []) {
    payload.hooks[stage.stage] = (stage.entries || []).map(cloneEditorHookEntry);
  }
  return `${JSON.stringify(payload, null, 2)}\n`;
}

function renderAlwaysStep(step) {
  return [
    step.run,
    'RESULT=$?',
    '',
    'if [ $RESULT -ne 0 ]; then',
    ...step.failMessages.map((message) => `  echo "${message}"`),
    '  exit $RESULT',
    'fi',
  ];
}

function renderMatchAssignment(step) {
  const grepFlag = step.grepFlag ? ` ${step.grepFlag}` : '';
  const pattern = step.patternLines[0];
  if (step.multiline) {
    return [
      `${step.variableName}=$(git diff --cached --name-only --diff-filter=${step.diffFilter} | grep${grepFlag} \\`,
      `  '${pattern}')`,
    ];
  }
  return [
    `${step.variableName}=$(git diff --cached --name-only --diff-filter=${step.diffFilter} | grep${grepFlag} '${pattern}')`,
  ];
}

function renderStagedMatchStep(step) {
  const lines = [];
  if (step.comment) {
    lines.push(`# ${step.comment}`);
  }
  lines.push(...renderMatchAssignment(step));
  lines.push('');
  lines.push(`if [ -n "$${step.variableName}" ]; then`);
  if (step.announce) {
    lines.push(`  echo "${step.announce}"`);
  }
  lines.push(`  ${step.run}`);
  lines.push('  RESULT=$?');
  lines.push('');
  lines.push('  if [ $RESULT -ne 0 ]; then');
  lines.push(...step.failMessages.map((message) => `    echo "${message}"`));
  lines.push('    exit $RESULT');
  lines.push('  fi');
  lines.push('fi');
  return lines;
}

function renderPreCommitHook(preCommit) {
  const lines = ['#!/bin/sh', ''];
  const steps = preCommit.steps || [];
  steps.forEach((step, index) => {
    if (step.kind === 'always') {
      lines.push(...renderAlwaysStep(step));
    } else if (step.kind === 'staged-match') {
      lines.push(...renderStagedMatchStep(step));
    } else {
      throw new Error(`unsupported pre-commit step kind: ${step.kind}`);
    }
    if (index !== steps.length - 1) {
      lines.push('');
    }
  });
  lines.push('', 'exit 0', '');
  return lines.join('\n');
}

function renderBranchLines(branches) {
  return branches.map((branch) => `      - ${branch}`);
}

function renderWorkflowJobEnv(envMap) {
  const entries = Object.entries(envMap || {}).filter(([, value]) => typeof value === 'string' && value.trim() !== '');
  if (entries.length === 0) {
    return [];
  }

  return [
    '    env:',
    ...entries.map(([key, value]) => `      ${key}: ${value}`),
    '',
  ];
}

function renderUpstreamCheckoutStep(upstreamCheckout) {
  if (!upstreamCheckout || typeof upstreamCheckout !== 'object') {
    return [];
  }

  const lines = [
    '      - name: Checkout ATM upstream',
    '        uses: actions/checkout@v6',
    '        with:',
    `          repository: ${upstreamCheckout.repository}`,
    `          path: ${upstreamCheckout.path}`,
  ];

  if (typeof upstreamCheckout.ref === 'string' && upstreamCheckout.ref.trim() !== '') {
    lines.push(`          ref: ${upstreamCheckout.ref}`);
  }

  return [...lines, ''];
}

function renderWorkflowChangedFilesScript(changedFiles) {
  return [
    '          set -euo pipefail',
    `          mkdir -p ${changedFiles.artifactDir}`,
    '',
    '          if [[ "${GITHUB_EVENT_NAME}" == "pull_request" ]]; then',
    '            base_sha="${{ github.event.pull_request.base.sha }}"',
    '            head_sha="${{ github.event.pull_request.head.sha }}"',
    '          else',
    '            base_sha="${{ github.event.before }}"',
    '            head_sha="${{ github.sha }}"',
    '          fi',
    '',
    '          if [[ -z "${base_sha}" || "${base_sha}" == "0000000000000000000000000000000000000000" ]]; then',
    '            base_sha="$(git show -s --format=%P "${head_sha}" 2>/dev/null | awk \'{print $1}\')"',
    '          fi',
    '',
    '          if [[ -z "${base_sha}" ]]; then',
    '            echo "Unable to resolve base SHA for changed-file detection." >&2',
    '            exit 1',
    '          fi',
    '',
    `          git diff --name-only "\${base_sha}" "\${head_sha}" | sed '/^[[:space:]]*$/d' > ${changedFiles.changedFilesPath}`,
    '',
    `          if [[ -s ${changedFiles.changedFilesPath} ]]; then`,
    `            awk '{ print "M  " $0 }' ${changedFiles.changedFilesPath} > ${changedFiles.worktreeStatusPath}`,
    '          else',
    `            : > ${changedFiles.worktreeStatusPath}`,
    '          fi',
    '',
    '          echo "base_sha=${base_sha}" >> "${GITHUB_OUTPUT}"',
    '          echo "head_sha=${head_sha}" >> "${GITHUB_OUTPUT}"',
    `          echo "changed_count=$(wc -l < ${changedFiles.changedFilesPath} | tr -d ' ')" >> "\${GITHUB_OUTPUT}"`,
  ];
}

function renderWorkflowCustomSteps(steps) {
  const rendered = [];
  for (const step of steps || []) {
    if (!step || typeof step !== 'object' || !step.name || !step.run) {
      throw new Error('workflow preStep requires name and run');
    }
    rendered.push('');
    rendered.push(`      - name: ${step.name}`);
    if (step.if) {
      rendered.push(`        if: \${{ ${step.if} }}`);
    }
    if (step.shell) {
      rendered.push(`        shell: ${step.shell}`);
    }
    if (String(step.run).includes('\n')) {
      rendered.push('        run: |');
      for (const line of String(step.run).split('\n')) {
        rendered.push(`          ${line}`);
      }
    } else {
      rendered.push(`        run: ${step.run}`);
    }
  }
  return rendered;
}

function renderWorkflow(workflow, gateEntrypoints) {
  const upstreamCheckout = workflow.upstreamCheckout && typeof workflow.upstreamCheckout === 'object'
    ? workflow.upstreamCheckout
    : null;
  const jobEnv = upstreamCheckout
    ? {
      ATM_UPSTREAM_REPO_ROOT: '${{ github.workspace }}/' + upstreamCheckout.path,
    }
    : null;
  const lines = [
    `name: ${workflow.name}`,
    '',
    'on:',
    '  pull_request:',
    '    branches:',
    ...renderBranchLines(workflow.branches.pullRequest),
    '  push:',
    '    branches:',
    ...renderBranchLines(workflow.branches.push),
    '',
    'permissions:',
    '  contents: read',
    '',
    'concurrency:',
    '  group: atm-governance-${{ github.ref }}',
    '  cancel-in-progress: true',
    '',
    'jobs:',
    '  atm-governance:',
    '    runs-on: ubuntu-latest',
    '',
    ...renderWorkflowJobEnv(jobEnv),
    '    steps:',
    '      - name: Checkout',
    '        uses: actions/checkout@v6',
    '        with:',
    '          fetch-depth: 0',
    '',
    '      - name: Setup Node',
    '        uses: actions/setup-node@v6',
    '        with:',
    `          node-version: ${workflow.nodeVersion}`,
    '          cache: npm',
    '',
    ...renderUpstreamCheckoutStep(upstreamCheckout),
    '      - name: Install dependencies',
    '        run: npm ci',
    '',
    '      - name: Collect changed files for ATM flow',
    '        id: changed',
    '        shell: bash',
    '        run: |',
    ...renderWorkflowChangedFilesScript(workflow.changedFiles),
    ...renderWorkflowCustomSteps(workflow.preSteps),
  ];

  for (const step of workflow.steps || []) {
    const command = gateEntrypoints[step.entrypointKey];
    if (!command) {
      throw new Error(`missing gate entrypoint: ${step.entrypointKey}`);
    }
    lines.push('');
    lines.push(`      - name: ${step.name}`);
    if (step.if) {
      lines.push(`        if: \${{ ${step.if} }}`);
    }
    lines.push(`        run: ${command}`);
  }

  lines.push('');
  return `${lines.join('\n')}\n`;
}

function renderGovernanceTargets(profile) {
  const rendered = [];

  for (const manifest of profile.editorHooks.manifests || []) {
    rendered.push({
      id: manifest.id,
      kind: 'editor-hook-manifest',
      targetPath: manifest.targetPath,
      content: renderEditorHookManifest(manifest),
    });
  }

  if (profile.gitHooks && profile.gitHooks.preCommit) {
    rendered.push({
      id: profile.gitHooks.preCommit.id || 'shared-pre-commit',
      kind: 'git-hook',
      targetPath: profile.gitHooks.preCommit.targetPath,
      content: renderPreCommitHook(profile.gitHooks.preCommit),
    });
  }

  for (const workflow of profile.ci.workflows || []) {
    rendered.push({
      id: workflow.id,
      kind: 'ci-workflow',
      targetPath: workflow.targetPath,
      content: renderWorkflow(workflow, profile.gateEntrypoints || {}),
    });
  }

  return rendered;
}

module.exports = {
  renderEditorHookManifest,
  renderGovernanceTargets,
  renderPreCommitHook,
  renderWorkflow,
};
