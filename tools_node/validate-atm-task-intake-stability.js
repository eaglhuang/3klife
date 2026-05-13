#!/usr/bin/env node
'use strict';

const path = require('path');
const { spawnSync } = require('child_process');
const { buildNodeEntrypointArgs, resolveUpstreamPaths } = require('./lib/upstream-env');

const projectRoot = path.resolve(__dirname, '..');
const taskRouterCli = path.join(projectRoot, 'tools_node', 'atomic-framework', 'task-router.js');
const taskIdGuardTest = path.join(projectRoot, 'tools_node', 'test', 'task-id-guard-flow.test.js');
const taskLockCrossShardTest = path.join(projectRoot, 'tools_node', 'test', 'task-lock-cross-shard.test.js');
const upstreamGuideCli = resolveUpstreamPaths({
  projectRoot,
}).upstreamCliEntrypoint;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function runNode(label, args, cwd = projectRoot) {
  const result = spawnSync(process.execPath, args, {
    cwd,
    encoding: 'utf8',
    shell: false,
    env: { ...process.env },
  });

  if (result.status !== 0) {
    throw new Error([
      `${label} exited ${result.status}`,
      String(result.stdout || '').trim(),
      String(result.stderr || '').trim(),
      result.error ? result.error.message : '',
    ].filter(Boolean).join('\n'));
  }

  return result;
}

function runNodeAllowFailure(args, cwd = projectRoot) {
  return spawnSync(process.execPath, args, {
    cwd,
    encoding: 'utf8',
    shell: false,
    env: { ...process.env },
  });
}

function parseJsonResult(label, result) {
  try {
    return JSON.parse(String(result.stdout || '').trim());
  } catch (error) {
    throw new Error(`${label} did not return valid JSON: ${error.message}\n${String(result.stdout || '').trim()}\n${String(result.stderr || '').trim()}`);
  }
}

function validateRouterSmoke() {
  const atomGeneration = parseJsonResult(
    'task-router ATM-4-0003',
    runNode('task-router ATM-4-0003', [
      taskRouterCli,
      '--task',
      'ATM-4-0003',
      '--format',
      'json',
    ])
  );
  assert(atomGeneration.ok === true, 'ATM-4-0003 route should succeed');
  assert(atomGeneration.routeKind === 'atom-generation', 'ATM-4-0003 should route to atom-generation');
  assert(atomGeneration.route && atomGeneration.route.primaryAtom && atomGeneration.route.primaryAtom.atomId === 'ATM-CORE-0004', 'ATM-4-0003 should anchor at ATM-CORE-0004');

  const intentRoute = parseJsonResult(
    'task-router intent create-atom',
    runNode('task-router intent create-atom', [
      taskRouterCli,
      '--intent',
      'create-atom',
      '--title',
      'NormalizeCssColor',
      '--description',
      'Canonicalize CSS color input for html-to-ucuf.',
      '--domain',
      'html-to-ucuf',
      '--format',
      'json',
    ])
  );
  assert(intentRoute.ok === true, 'intent create-atom route should succeed');
  assert(intentRoute.routeKind === 'atom-generation', 'intent create-atom should route to atom-generation');
  assert(intentRoute.route && intentRoute.route.primaryAtom && intentRoute.route.primaryAtom.atomId === 'ATM-CORE-0004', 'intent route should anchor at ATM-CORE-0004');

  const fixH2uRoute = parseJsonResult(
    'task-router intent fix-h2u',
    runNode('task-router intent fix-h2u', [
      taskRouterCli,
      '--intent',
      'fix-h2u',
      '--goal',
      '把 H2U 功能改好',
      '--format',
      'json',
    ])
  );
  assert(fixH2uRoute.ok === true, 'intent fix-h2u route should succeed');
  assert(fixH2uRoute.routeKind === 'legacy-fix', 'intent fix-h2u should route to legacy-fix');
  assert(Array.isArray(fixH2uRoute.route.nextCommands) && fixH2uRoute.route.nextCommands.some((line) => /validate-legacy-h2u-launch/.test(line)), 'fix-h2u route should include launch gate command');

  const taskIntake = parseJsonResult(
    'task-router ATM-2-0048',
    runNode('task-router ATM-2-0048', [
      taskRouterCli,
      '--task',
      'ATM-2-0048',
      '--format',
      'json',
    ])
  );
  assert(taskIntake.ok === true, 'ATM-2-0048 route should succeed');
  assert(taskIntake.taskStatus === 'done', 'ATM-2-0048 should remain done');
  assert(taskIntake.routeKind === 'atom-generation', 'ATM-2-0048 should still route through atom-generation');
  assert(Array.isArray(taskIntake.readFirst) && taskIntake.readFirst.includes('docs/agent-briefs/tasks/ATM/ATM-2-0048.md'), 'ATM-2-0048 route should read its task card first');

  console.log('[validate-atm-task-intake-stability] router smoke ok');
}

function validateUpstreamGuide() {
  const result = runNode('upstream guide create-atom', [
    ...buildNodeEntrypointArgs(upstreamGuideCli, [
    'guide',
    'create-atom',
    ]),
  ]);
  const stdout = String(result.stdout || '');
  assert(/ATM_GUIDE_READY/.test(stdout) || /Guide for create-atom is ready/i.test(stdout), 'upstream guide should advertise create-atom readiness');

  const fixH2u = runNodeAllowFailure([
    ...buildNodeEntrypointArgs(upstreamGuideCli, [
    'guide',
    'fix-h2u',
    ]),
  ]);
  const fixStdout = String(fixH2u.stdout || '');
  const fixStderr = String(fixH2u.stderr || '');
  assert(fixH2u.status !== 0, 'upstream guide should reject project-specific fix-h2u intent');
  assert(
    /Unknown guide intent/i.test(fixStdout) || /Unknown guide intent/i.test(fixStderr),
    'upstream guide should keep fix-h2u as host-specific intent'
  );
  console.log('[validate-atm-task-intake-stability] upstream guide ok');
}

function validateLocalTests() {
  runNode('task-id-guard-flow.test.js', [taskIdGuardTest]);
  runNode('task-lock-cross-shard.test.js', [taskLockCrossShardTest]);
  console.log('[validate-atm-task-intake-stability] lock regression tests ok');
}

function main() {
  validateRouterSmoke();
  validateUpstreamGuide();
  validateLocalTests();
  console.log('ATM task intake stability validator passed');
}

try {
  main();
} catch (error) {
  console.error(`[validate-atm-task-intake-stability] ${error.message}`);
  process.exit(1);
}
