#!/usr/bin/env node
/**
 * Broker dogfood for parallel TASK-MAO-0041 + TASK-MAO-0042 shared files.
 * Sets up HEAD snapshots, runs broker plan-batch --apply, copies receipt to 3KLife.
 */
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root3k = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.resolve(root3k, '..', 'AI-Atomic-Framework');
const fixtureRoot = path.join(target, 'tmp', 'broker-parallel-0041-0042');
const requestsDir = path.join(fixtureRoot, 'requests');
const evidenceOut3k = path.join(root3k, 'docs', 'ai_atomic_framework', 'broker-collision-evidence', 'runs');
const atm = existsSync(path.join(target, 'atm.dev.mjs')) ? 'atm.dev.mjs' : 'atm.mjs';

const migration = {
  strategy: 'none',
  fromVersion: null,
  notes: 'parallel-0041-0042 dogfood'
};

function gitShow(relPath) {
  return execFileSync('git', ['show', `HEAD:${relPath}`], { cwd: target, encoding: 'utf8' });
}

function writeJson(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function makeRequest(overrides) {
  return {
    schemaId: 'atm.mutationRequest.v1',
    specVersion: '0.1.0',
    migration,
    ...overrides
  };
}

rmSync(fixtureRoot, { recursive: true, force: true });
mkdirSync(requestsDir, { recursive: true });
mkdirSync(evidenceOut3k, { recursive: true });

const sharedFiles = [
  'atomic_workbench/atomization-coverage/path-to-atom-map.json',
  'docs/governance/evidence-gates.md',
  'packages/cli/src/commands/taskflow/close-orchestration.ts',
  'packages/cli/src/commands/command-specs/taskflow.spec.ts'
];

for (const rel of sharedFiles) {
  const dest = path.join(fixtureRoot, rel);
  mkdirSync(path.dirname(dest), { recursive: true });
  writeFileSync(dest, gitShow(rel), 'utf8');
}

const headAtomMap = JSON.parse(gitShow('atomic_workbench/atomization-coverage/path-to-atom-map.json'));
const mappingBase = headAtomMap.mappings.length;

const requests = [
  makeRequest({
    requestId: 'REQ-0042-ATOMMAP-0',
    actorId: 'antigravity-gemini-3.5-flash',
    filePath: 'tmp/broker-parallel-0041-0042/atomic_workbench/atomization-coverage/path-to-atom-map.json',
    op: 'upsert',
    target: `/mappings/${mappingBase}`,
    value: {
      path_pattern: 'packages/cli/src/commands/validate.ts',
      atom_id: 'atm.validator-scope-taxonomy-map',
      capability: 'Validator scope taxonomy classifying validators into task-local, global-advisory, release-blocking, and diagnostic scopes.',
      coverage_status: 'active',
      source_task: 'TASK-MAO-0042'
    }
  }),
  makeRequest({
    requestId: 'REQ-0041-ATOMMAP-0',
    actorId: 'cursor-composer-2.5',
    filePath: 'tmp/broker-parallel-0041-0042/atomic_workbench/atomization-coverage/path-to-atom-map.json',
    op: 'upsert',
    target: `/mappings/${mappingBase + 1}`,
    value: {
      path_pattern: 'packages/cli/src/commands/evidence.ts',
      atom_id: 'atm.evidence-bundle-manifest-map',
      capability: 'Persist task-bound evidence bundle manifests with fresh versus stale validator passes after successful evidence run/add.',
      coverage_status: 'active',
      source_task: 'TASK-MAO-0041'
    }
  }),
  makeRequest({
    requestId: 'REQ-0041-ATOMMAP-1',
    actorId: 'cursor-composer-2.5',
    filePath: 'tmp/broker-parallel-0041-0042/atomic_workbench/atomization-coverage/path-to-atom-map.json',
    op: 'upsert',
    target: `/mappings/${mappingBase + 2}`,
    value: {
      path_pattern: 'tests/cli/evidence-bundle-manifest.test.ts',
      atom_id: 'atm.evidence-bundle-manifest-map',
      capability: 'Regression coverage for evidence bundle manifest freshness rules and directory deliverable expansion.',
      coverage_status: 'active',
      source_task: 'TASK-MAO-0041'
    }
  }),
  makeRequest({
    requestId: 'REQ-0041-EVIDENCE-GATES',
    actorId: 'cursor-composer-2.5',
    filePath: 'tmp/broker-parallel-0041-0042/docs/governance/evidence-gates.md',
    op: 'insertAfterHeading',
    target: '## Gate Rules',
    value: [
      '',
      '## Evidence Bundle Manifest',
      '',
      'Successful `evidence run` and fresh `evidence add` commands update',
      '`.atm/history/evidence/<taskId>.bundle-manifest.json` with task-bound validator',
      'passes and command-run proof.',
      ''
    ].join('\n')
  }),
  makeRequest({
    requestId: 'REQ-0042-EVIDENCE-GATES',
    actorId: 'antigravity-gemini-3.5-flash',
    filePath: 'tmp/broker-parallel-0041-0042/docs/governance/evidence-gates.md',
    op: 'insertAfterHeading',
    target: '## Gate Rules',
    value: [
      '',
      '## Validator Scope Taxonomy',
      '',
      'ATM classifies validator gates into task-local, release-blocking, global-advisory, and diagnostic scopes.',
      ''
    ].join('\n')
  }),
  makeRequest({
    requestId: 'REQ-0041-CLOSE-ORCH',
    actorId: 'cursor-composer-2.5',
    filePath: 'tmp/broker-parallel-0041-0042/packages/cli/src/commands/taskflow/close-orchestration.ts',
    op: 'append',
    target: 'eof',
    value: '\n// === TASK-MAO-0041 evidence-bundle-manifest START ===\n// 0041 hooks\n// === TASK-MAO-0041 evidence-bundle-manifest END ===\n'
  }),
  makeRequest({
    requestId: 'REQ-0042-CLOSE-ORCH',
    actorId: 'antigravity-gemini-3.5-flash',
    filePath: 'tmp/broker-parallel-0041-0042/packages/cli/src/commands/taskflow/close-orchestration.ts',
    op: 'append',
    target: 'eof',
    value: '\n// === TASK-MAO-0042 validator-scope-taxonomy START ===\nexport { getValidatorScope } from \'../validate.ts\';\n// === TASK-MAO-0042 validator-scope-taxonomy END ===\n'
  })
];

for (const [index, request] of requests.entries()) {
  writeJson(path.join(requestsDir, `${String(index + 1).padStart(2, '0')}-${request.requestId}.json`), request);
}

const atmEvidenceDir = path.join(target, '.atm', 'history', 'evidence', 'broker-runs');
mkdirSync(atmEvidenceDir, { recursive: true });

const result = JSON.parse(execFileSync('node', [
  atm,
  'broker',
  'plan-batch',
  '--cwd', target,
  '--requests-dir', path.relative(target, requestsDir).replace(/\\/g, '/'),
  '--apply',
  '--run-evidence-dir', atmEvidenceDir,
  '--json'
], { cwd: target, encoding: 'utf8' }));

const runId = result?.evidence?.runId ?? result?.evidence?.runEvidencePath?.split(/[\\/]/).pop()?.replace('.json', '') ?? null;
const runEvidencePath = result?.evidence?.runEvidencePath ?? null;
let copiedEvidencePath = null;
if (runEvidencePath && existsSync(runEvidencePath)) {
  copiedEvidencePath = path.join(evidenceOut3k, path.basename(runEvidencePath));
  cpSync(runEvidencePath, copiedEvidencePath);
}

const report = {
  experimentId: 'parallel-0041-0042-2026-06-17',
  scannedAt: new Date().toISOString(),
  ok: result?.ok === true,
  runId,
  runEvidencePath,
  copiedEvidencePath,
  plan: result?.evidence?.plan ?? null,
  mutationEvidence: result?.evidence?.mutationEvidence ?? null,
  casMismatches: result?.evidence?.casMismatches ?? [],
  interpretation: {
    atomMapJsonRecord: 'distinct /mappings/N pointers should batch as mergeable',
    evidenceGatesTextRange: 'same insertAfterHeading anchor should queue the second writer',
    closeOrchestrationFallback: '.ts uses fallback-file-lock; concurrent appends should not both apply'
  }
};

const reportPath = path.join(evidenceOut3k, `parallel-0041-0042-broker-dogfood-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
writeJson(reportPath, report);

console.log(JSON.stringify(report, null, 2));
