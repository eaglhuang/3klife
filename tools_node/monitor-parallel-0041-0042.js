#!/usr/bin/env node
/**
 * Monitor parallel dogfood TASK-MAO-0041 + TASK-MAO-0042.
 * Usage: node tools_node/monitor-parallel-0041-0042.js
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.resolve(root, '..', 'AI-Atomic-Framework');
const coord = path.join(root, 'docs/ai_atomic_framework/broker-collision-evidence/parallel-0041-0042-coordination.md');

function runJson(cmd, args, cwd) {
  try {
    const out = execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return JSON.parse(out);
  } catch (e) {
    const err = e;
    const stdout = err?.stdout?.toString?.() ?? '';
    if (stdout.trim().startsWith('{')) {
      try {
        return JSON.parse(stdout);
      } catch {
        return { ok: false, parseError: true, raw: stdout.slice(0, 500) };
      }
    }
    return { ok: false, error: String(err?.message ?? err) };
  }
}

function gitLines(cwd, args) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean);
  } catch {
    return [];
  }
}

const atm = existsSync(path.join(target, 'atm.dev.mjs')) ? 'atm.dev.mjs' : 'atm.mjs';
const parallel = runJson('node', [atm, 'tasks', 'parallel', '--task', 'TASK-MAO-0041', '--with', 'TASK-MAO-0042', '--json'], target);
const s41 = runJson('node', [atm, 'tasks', 'status', '--task', 'TASK-MAO-0041', '--json'], target);
const s42 = runJson('node', [atm, 'tasks', 'status', '--task', 'TASK-MAO-0042', '--json'], target);
const dirty = gitLines(target, ['status', '--short']);
const staged = gitLines(target, ['diff', '--cached', '--name-only']);

const marker41 = existsSync(path.join(target, 'packages/cli/src/commands/taskflow/close-orchestration.ts'))
  ? readFileSync(path.join(target, 'packages/cli/src/commands/taskflow/close-orchestration.ts'), 'utf8').includes('TASK-MAO-0041')
  : false;
const marker42 = existsSync(path.join(target, 'packages/cli/src/commands/taskflow/close-orchestration.ts'))
  ? readFileSync(path.join(target, 'packages/cli/src/commands/taskflow/close-orchestration.ts'), 'utf8').includes('TASK-MAO-0042')
  : false;

const report = {
  scannedAt: new Date().toISOString(),
  coordinationDoc: coord,
  parallelVerdict: parallel?.evidence?.finding?.verdict ?? parallel?.messages?.[0]?.code ?? null,
  overlappingFiles: parallel?.evidence?.finding?.overlappingFiles ?? [],
  task0041: {
    ok: s41?.ok,
    status: s41?.evidence?.task?.status ?? s41?.evidence?.status ?? null,
    claimActor: s41?.evidence?.task?.claim?.actorId ?? null,
    markerInCloseOrchestration: marker41
  },
  task0042: {
    ok: s42?.ok,
    status: s42?.evidence?.task?.status ?? s42?.evidence?.status ?? null,
    claimActor: s42?.evidence?.task?.claim?.actorId ?? null,
    markerInCloseOrchestration: marker42
  },
  git: {
    dirtyCount: dirty.length,
    dirtySample: dirty.slice(0, 25),
    stagedCount: staged.length,
    stagedSample: staged.slice(0, 25)
  }
};

console.log(JSON.stringify(report, null, 2));
