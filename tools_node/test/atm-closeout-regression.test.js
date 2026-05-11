#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

const { DocumentAdapter } = require('../adapters/atm-3klife/document-adapter');
const closeout = require('../validate-atm-stability-closeout');

const ROOT = path.resolve(__dirname, '..', '..');
const TEMP_ROOT = path.join(ROOT, 'temp', 'atm-closeout-regression-test');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function resetTempRoot() {
  fs.rmSync(TEMP_ROOT, { recursive: true, force: true });
  fs.mkdirSync(TEMP_ROOT, { recursive: true });
}

function cleanupTempRoot() {
  fs.rmSync(TEMP_ROOT, { recursive: true, force: true });
}

function writeMockAssignModule(filePath) {
  const content = [
    "'use strict';",
    "const fs = require('node:fs');",
    'module.exports = {',
    '  async assignFile(targetPath) {',
    "    const stampPath = process.env.DOC_ADAPTER_FALLBACK_STAMP || '';",
    '    if (stampPath) {',
    "      fs.mkdirSync(require('node:path').dirname(stampPath), { recursive: true });",
    "      fs.writeFileSync(stampPath, String(targetPath || ''), 'utf8');",
    '    }',
    '    return { ok: true };',
    '  },',
    '};',
    '',
  ].join('\n');
  fs.writeFileSync(filePath, content, 'utf8');
}

async function testDocIdFallbackViaModuleApi() {
  resetTempRoot();

  const markdownPath = path.join(TEMP_ROOT, 'docs', 'agent-briefs', 'tasks', 'ATM', 'ATM-TEST-0001.md');
  const assignScriptPath = path.join(TEMP_ROOT, 'tools_node', 'mock-doc-id-registry.js');
  const fallbackStampPath = path.join(TEMP_ROOT, 'artifacts', 'fallback-invocation.txt');
  fs.mkdirSync(path.dirname(markdownPath), { recursive: true });
  fs.mkdirSync(path.dirname(assignScriptPath), { recursive: true });
  fs.writeFileSync(markdownPath, '# test\n', 'utf8');
  writeMockAssignModule(assignScriptPath);

  const adapter = new DocumentAdapter({
    projectRoot: TEMP_ROOT,
    assignScriptPath,
    profilePath: path.join(ROOT, 'tools_node', 'adapters', 'atm-3klife', 'doc-index-profile.json'),
  });

  const originalSpawnSync = cp.spawnSync;
  cp.spawnSync = () => ({
    status: 1,
    stdout: '',
    stderr: '',
    error: {
      code: 'EPERM',
      message: 'spawnSync node.exe EPERM',
    },
  });

  process.env.DOC_ADAPTER_FALLBACK_STAMP = fallbackStampPath;
  try {
    const result = await adapter.assignDocId(markdownPath);
    assert(result && result.ok === true, 'fallback assign should return ok=true');
    assert(result.fallback === 'module-api', 'fallback assign should mark fallback=module-api');
    assert(result.spawnErrorCode === 'EPERM', 'fallback assign should expose spawnErrorCode');
    assert(fs.existsSync(fallbackStampPath), 'fallback module should be invoked');
    const recordedPath = fs.readFileSync(fallbackStampPath, 'utf8').trim();
    assert(recordedPath === markdownPath, 'fallback module should receive absolute markdown path');
  } finally {
    cp.spawnSync = originalSpawnSync;
    delete process.env.DOC_ADAPTER_FALLBACK_STAMP;
    delete require.cache[require.resolve(assignScriptPath)];
    cleanupTempRoot();
  }
}

async function testDocIdFallbackDisabledThrows() {
  resetTempRoot();

  const markdownPath = path.join(TEMP_ROOT, 'docs', 'agent-briefs', 'tasks', 'ATM', 'ATM-TEST-0002.md');
  const assignScriptPath = path.join(TEMP_ROOT, 'tools_node', 'mock-doc-id-registry.js');
  fs.mkdirSync(path.dirname(markdownPath), { recursive: true });
  fs.mkdirSync(path.dirname(assignScriptPath), { recursive: true });
  fs.writeFileSync(markdownPath, '# test\n', 'utf8');
  writeMockAssignModule(assignScriptPath);

  const adapter = new DocumentAdapter({
    projectRoot: TEMP_ROOT,
    assignScriptPath,
    profilePath: path.join(ROOT, 'tools_node', 'adapters', 'atm-3klife', 'doc-index-profile.json'),
  });

  const originalSpawnSync = cp.spawnSync;
  cp.spawnSync = () => ({
    status: 1,
    stdout: '',
    stderr: '',
    error: {
      code: 'EPERM',
      message: 'spawnSync node.exe EPERM',
    },
  });

  let threw = false;
  try {
    await adapter.assignDocId(markdownPath, { disableModuleFallback: true });
  } catch (error) {
    threw = true;
    const message = String(error && error.message ? error.message : error);
    assert(/EPERM|spawnSync/i.test(message), 'disable fallback path should surface spawn error');
  } finally {
    cp.spawnSync = originalSpawnSync;
    delete require.cache[require.resolve(assignScriptPath)];
    cleanupTempRoot();
  }
  assert(threw, 'disable fallback should throw');
}

function testCloseoutAggregatorBindings() {
  assert(
    typeof closeout.runTaskStoreSingleTruthCheck === 'function',
    'closeout module should expose runTaskStoreSingleTruthCheck',
  );
  const singleTruthReport = closeout.runTaskStoreSingleTruthCheck();
  assert(
    singleTruthReport && singleTruthReport.validator === 'validate-atm-task-store-single-truth',
    'single-truth validator should be wired into closeout module',
  );

  const findings = closeout.buildFindings([
    {
      id: 'validate-atm-task-store-single-truth',
      passed: false,
      details: { blockerCount: 1 },
    },
  ]);
  assert(findings.length === 1, 'failed closeout check should emit one finding');
  assert(
    findings[0].ruleId === 'atm-stability-closeout.validate-atm-task-store-single-truth.failed',
    'closeout finding ruleId should track single-truth check',
  );
}

async function main() {
  await testDocIdFallbackViaModuleApi();
  await testDocIdFallbackDisabledThrows();
  testCloseoutAggregatorBindings();
  console.log('atm closeout regression tests passed');
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});

