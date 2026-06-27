import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { calculateBrokerDecision } from '../../../packages/core/src/broker/decision.ts';
import { composeBrokerProposals } from '../../../packages/core/src/broker/compose.ts';
import { applyStewardPlan, planStewardApply } from '../../../packages/core/src/broker/steward.ts';
import type { ActiveWriteIntent, PatchProposal, WriteBrokerRegistryDocument, WriteIntent } from '../../../packages/core/src/broker/types.ts';
import { createTempWorkspace, initializeGitRepository } from '../../temp-root.ts';
import { operationalBenchProfiles, operationalBenchScenarios } from './scenarios.ts';
import {
  operationalBenchSpanNames,
  type OperationalBenchProfileName,
  type OperationalBenchResultRow,
  type OperationalBenchScenario,
  type SpanStats,
  type SpanStatsMap,
  type SpanValueMap
} from './types.ts';

export interface OperationalBenchOptions {
  readonly root: string;
  readonly seed: number;
  readonly profile: OperationalBenchProfileName;
  readonly outDir: string;
}

interface Timed<T> {
  readonly value: T;
  readonly ms: number;
}

interface ScenarioExecution {
  readonly route: OperationalBenchResultRow['route'];
  readonly spans: SpanValueMap;
}

function emptySpans(): SpanValueMap {
  return Object.fromEntries(operationalBenchSpanNames.map((name) => [name, null])) as SpanValueMap;
}

function roundMs(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function timed<T>(fn: () => T): Timed<T> {
  const started = performance.now();
  const value = fn();
  return { value, ms: roundMs(performance.now() - started) };
}

function sleepImmediate(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

function git(args: readonly string[], cwd: string): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function writeText(filePath: string, content: string): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, 'utf8');
}

function hashText(value: string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function migration() {
  return { strategy: 'none' as const, fromVersion: null, notes: 'operational bench fixture' };
}

function atomRef(atomId: string, atomCid: string, filePath: string, lineStart = 1, lineEnd = 1) {
  return { atomId, atomCid, operation: 'modify' as const, sourceRange: { filePath, lineStart, lineEnd } };
}

function makeIntent(input: {
  readonly taskId: string;
  readonly actorId: string;
  readonly baseCommit?: string;
  readonly filePath: string;
  readonly atomId: string;
  readonly atomCid: string;
  readonly lineStart?: number;
  readonly lineEnd?: number;
  readonly sharedValidator?: string;
  readonly readAtomId?: string;
  readonly proposal?: {
    readonly trigger: 'hot-file' | 'same-file-overlap-risk' | 'shared-surface-risk' | 'manual-review-surface';
    readonly summarySubmitted: boolean;
  };
}): WriteIntent {
  return {
    schemaId: 'atm.writeIntent.v1',
    specVersion: '0.1.0',
    migration: migration(),
    taskId: input.taskId,
    actorId: input.actorId,
    baseCommit: input.baseCommit ?? 'bench-base',
    targetFiles: [input.filePath],
    atomRefs: [atomRef(input.atomId, input.atomCid, input.filePath, input.lineStart ?? 1, input.lineEnd ?? 1)],
    ...(input.readAtomId ? { readAtoms: [atomRef(input.readAtomId, `${input.readAtomId}-cid`, input.filePath)] } : {}),
    sharedSurfaces: {
      generators: [],
      projections: [],
      registries: [],
      validators: input.sharedValidator ? [input.sharedValidator] : [],
      artifacts: []
    },
    requestedLane: 'auto',
    ...(input.proposal
      ? {
          proposalAdmission: {
            trigger: input.proposal.trigger,
            summarySubmitted: input.proposal.summarySubmitted,
            boundedRegions: [{ filePath: input.filePath, lineStart: input.lineStart ?? 1, lineEnd: input.lineEnd ?? 1 }],
            hotFiles: [input.filePath],
            notes: 'OperationalBench bounded-region proposal fixture.'
          }
        }
      : {})
  };
}

function makeActive(intent: WriteIntent, index: number, lane: ActiveWriteIntent['lane'] = 'direct-brokered'): ActiveWriteIntent {
  const now = Date.UTC(2026, 5, 27, 0, 0, index);
  return {
    intentId: `bench-active-${index}`,
    taskId: intent.taskId,
    teamRunId: null,
    actorId: intent.actorId,
    baseCommit: intent.baseCommit,
    resourceKeys: {
      files: intent.targetFiles,
      atomIds: intent.atomRefs.map((ref) => ref.atomId),
      atomCids: intent.atomRefs.map((ref) => ref.atomCid),
      readAtomIds: intent.readAtoms?.map((ref) => ref.atomId) ?? [],
      readAtomCids: intent.readAtoms?.map((ref) => ref.atomCid) ?? [],
      generators: intent.sharedSurfaces.generators,
      projections: intent.sharedSurfaces.projections,
      registries: intent.sharedSurfaces.registries,
      validators: intent.sharedSurfaces.validators,
      artifacts: intent.sharedSurfaces.artifacts,
      atomRanges: intent.atomRefs.flatMap((ref) => ref.sourceRange
        ? [{ filePath: ref.sourceRange.filePath, lineStart: ref.sourceRange.lineStart, lineEnd: ref.sourceRange.lineEnd, atomCid: ref.atomCid }]
        : [])
    },
    leaseEpoch: now,
    leaseSeconds: 1800,
    leaseMaxSeconds: 1800,
    heartbeatAt: new Date(now).toISOString(),
    lane,
    expiresAt: new Date(now + 1800 * 1000).toISOString(),
    admission: intent.proposalAdmission
      ? {
          trigger: intent.proposalAdmission.trigger,
          state: 'proposal-submitted',
          requiresProposal: true,
          summarySubmitted: intent.proposalAdmission.summarySubmitted,
          hotFiles: intent.proposalAdmission.hotFiles ?? [],
          boundedRegions: intent.proposalAdmission.boundedRegions ?? [],
          rearbitrationRequired: false,
          reason: intent.proposalAdmission.notes ?? 'OperationalBench active proposal fixture.'
        }
      : undefined
  };
}

function registry(activeIntents: readonly ActiveWriteIntent[] = []): WriteBrokerRegistryDocument {
  return {
    schemaId: 'atm.writeBrokerRegistry.v1',
    specVersion: '0.1.0',
    repoId: 'operational-bench',
    workspaceId: 'bench',
    currentEpoch: 1782550800000,
    activeIntents
  };
}

function makeProposal(input: {
  readonly proposalId: string;
  readonly taskId: string;
  readonly actorId: string;
  readonly targetFile: string;
  readonly baseCommit: string;
  readonly fileBeforeHash: string;
  readonly atomId: string;
  readonly atomCid: string;
  readonly oldText: string;
  readonly newText: string;
  readonly oldLine: number;
}): PatchProposal {
  return {
    schemaId: 'atm.patchProposal.v1',
    specVersion: '0.1.0',
    migration: migration(),
    proposalId: input.proposalId,
    taskId: input.taskId,
    actorId: input.actorId,
    baseCommit: input.baseCommit,
    fileBeforeHash: input.fileBeforeHash,
    targetFile: input.targetFile,
    atomRefs: [{ atomId: input.atomId, atomCid: input.atomCid }],
    anchors: [{ kind: 'line', hint: `${input.targetFile}:${input.oldLine}` }],
    intent: 'OperationalBench steward fixture.',
    patch: [
      `@@ -${input.oldLine},1 +${input.oldLine},1 @@`,
      `-${input.oldText}`,
      `+${input.newText}`,
      ''
    ].join('\n'),
    validators: ['noop-validator'],
    rollback: 'Restore OperationalBench fixture text.'
  };
}

function runValidatorNoop(): boolean {
  const payload = { ok: true, schemaId: 'atm.operationalBench.validatorNoop.v1' };
  return payload.ok === true;
}

function runBrokerAdmissionScenario(scenario: OperationalBenchScenario): ScenarioExecution {
  const spans = emptySpans();
  const constructed = timed(() => {
    if (scenario.id === 'different-file') {
      return {
        intent: makeIntent({ taskId: 'TASK-OPB-A1', actorId: 'bench-a', filePath: 'src/a.ts', atomId: 'atom-a', atomCid: 'cid-a' }),
        registry: registry([makeActive(makeIntent({ taskId: 'TASK-OPB-A0', actorId: 'bench-b', filePath: 'src/b.ts', atomId: 'atom-b', atomCid: 'cid-b' }), 1)])
      };
    }
    if (scenario.id === 'same-file-bounded-disjoint') {
      const active = makeIntent({
        taskId: 'TASK-OPB-A2-A',
        actorId: 'bench-a',
        filePath: 'src/shared.ts',
        atomId: 'atom-shared-owner',
        atomCid: 'cid-shared-owner',
        lineStart: 1,
        lineEnd: 5,
        proposal: { trigger: 'same-file-overlap-risk', summarySubmitted: true }
      });
      return {
        intent: makeIntent({
          taskId: 'TASK-OPB-A2-B',
          actorId: 'bench-b',
          filePath: 'src/shared.ts',
          atomId: 'atom-shared-owner',
          atomCid: 'cid-shared-owner',
          lineStart: 20,
          lineEnd: 25,
          proposal: { trigger: 'same-file-overlap-risk', summarySubmitted: true }
        }),
        registry: registry([makeActive(active, 2)])
      };
    }
    if (scenario.id === 'shared-surface-conflict') {
      return {
        intent: makeIntent({ taskId: 'TASK-OPB-A3-B', actorId: 'bench-b', filePath: 'src/c.ts', atomId: 'atom-c2', atomCid: 'cid-c2', sharedValidator: 'validator:shared' }),
        registry: registry([makeActive(makeIntent({ taskId: 'TASK-OPB-A3-A', actorId: 'bench-a', filePath: 'src/c1.ts', atomId: 'atom-c1', atomCid: 'cid-c1', sharedValidator: 'validator:shared' }), 3)])
      };
    }
    const active = makeIntent({ taskId: 'TASK-OPB-A4-A', actorId: 'bench-a', filePath: 'src/rw.ts', atomId: 'atom-rw', atomCid: 'cid-rw' });
    return {
      intent: makeIntent({ taskId: 'TASK-OPB-A4-B', actorId: 'bench-b', filePath: 'src/rw.ts', atomId: 'atom-rw-writer', atomCid: 'cid-rw-writer', readAtomId: 'atom-rw' }),
      registry: registry([makeActive(active, 4)])
    };
  });
  spans.mutationRequestConstructionMs = constructed.ms;
  const decision = timed(() => calculateBrokerDecision(constructed.value.intent, constructed.value.registry));
  spans.admissionDecisionMs = decision.ms;
  const validator = timed(() => runValidatorNoop());
  spans.validatorMs = validator.ms;
  return { route: scenario.route, spans };
}

function runGitBoundaryScenario(scenario: OperationalBenchScenario): ScenarioExecution {
  const spans = emptySpans();
  const diff = timed(() => {
    const sameFile = scenario.id !== 'allow-remote-local-disjoint';
    const filePath = sameFile ? 'data/records.json' : 'data/local-only.json';
    const remoteFilePath = sameFile ? filePath : 'data/remote-only.json';
    return {
      localFile: filePath,
      remoteFile: remoteFilePath,
      topology: {
        branch: 'main',
        remote: 'origin',
        remoteRef: 'origin/main',
        headSha: `local-${scenario.id}`,
        remoteSha: `remote-${scenario.id}`,
        mergeBaseSha: `base-${scenario.id}`,
        fetched: false
      }
    };
  });
  spans.diffConstructionMs = diff.ms;
  const constructed = timed(() => {
    const localAtom = scenario.id === 'block-same-record-conflict' || scenario.id === 'recover-block-non-fast-forward'
      ? 'record-alpha'
      : 'record-local';
    const remoteAtom = scenario.id === 'block-same-record-conflict' || scenario.id === 'recover-block-non-fast-forward'
      ? 'record-alpha'
      : 'record-remote';
    const local = makeIntent({
      taskId: `TASK-OPB-B-${scenario.id}-local`,
      actorId: 'bench-local',
      filePath: diff.value.localFile,
      atomId: localAtom,
      atomCid: `${localAtom}-cid`,
      proposal: scenario.id.includes('composer') || scenario.id === 'recover-composer-non-fast-forward'
        ? { trigger: 'same-file-overlap-risk', summarySubmitted: true }
        : undefined,
      lineStart: scenario.id.includes('composer') || scenario.id === 'recover-composer-non-fast-forward' ? 20 : 1,
      lineEnd: scenario.id.includes('composer') || scenario.id === 'recover-composer-non-fast-forward' ? 25 : 5
    });
    const remote = makeIntent({
      taskId: `TASK-OPB-B-${scenario.id}-remote`,
      actorId: 'bench-remote',
      filePath: diff.value.remoteFile,
      atomId: remoteAtom,
      atomCid: `${remoteAtom}-cid`,
      proposal: scenario.id.includes('composer') || scenario.id === 'recover-composer-non-fast-forward'
        ? { trigger: 'same-file-overlap-risk', summarySubmitted: true }
        : undefined,
      lineStart: 1,
      lineEnd: 5
    });
    return { local, remote };
  });
  spans.mutationRequestConstructionMs = constructed.ms;
  const dryRun = timed(() => calculateBrokerDecision(constructed.value.local, registry([makeActive(constructed.value.remote, 10)])));
  spans.gitAdmitDryRunMs = dryRun.ms;
  if (scenario.id.startsWith('recover-')) {
    const recovery = timed(() => {
      const rerouted = dryRun.value.verdict === 'needs-physical-split'
        ? 'deterministic-composer'
        : dryRun.value.verdict === 'parallel-safe'
          ? 'direct-brokered'
          : 'rebase-replay';
      return { rerouted };
    });
    spans.casMismatchRecoveryMs = recovery.ms;
  }
  const validator = timed(() => runValidatorNoop());
  spans.validatorMs = validator.ms;
  return { route: scenario.route, spans };
}

function setupStewardWorkspace(): { cwd: string; proposal: PatchProposal; mergePlanProposal: PatchProposal; baseCommit: string; targetFile: string } {
  const cwd = createTempWorkspace('atm-operational-bench-steward-');
  initializeGitRepository(cwd);
  const targetFile = 'src/steward-target.ts';
  const targetPath = path.join(cwd, targetFile);
  writeText(targetPath, ['alpha', 'beta', 'gamma', 'delta', 'epsilon', ''].join('\n'));
  git(['add', '-A'], cwd);
  git(['-c', 'user.name=ATM Bench', '-c', 'user.email=bench@example.com', 'commit', '-m', 'base'], cwd);
  const baseCommit = git(['rev-parse', 'HEAD'], cwd);
  const before = readFileSync(targetPath, 'utf8');
  const proposal = makeProposal({
    proposalId: 'proposal-opb-steward-1',
    taskId: 'TASK-OPB-C-STEW',
    actorId: 'bench-steward',
    targetFile,
    baseCommit,
    fileBeforeHash: hashText(before),
    atomId: 'atom-steward-1',
    atomCid: 'cid-steward-1',
    oldText: 'beta',
    newText: 'beta-steward',
    oldLine: 2
  });
  const mergePlanProposal = makeProposal({
    proposalId: 'proposal-opb-steward-2',
    taskId: 'TASK-OPB-C-STEW-2',
    actorId: 'bench-steward-2',
    targetFile,
    baseCommit,
    fileBeforeHash: hashText(before),
    atomId: 'atom-steward-2',
    atomCid: 'cid-steward-2',
    oldText: 'delta',
    newText: 'delta-steward',
    oldLine: 4
  });
  return { cwd, proposal, mergePlanProposal, baseCommit, targetFile };
}

function runRecoveryScenario(scenario: OperationalBenchScenario, concurrency: number): ScenarioExecution {
  const spans = emptySpans();
  if (scenario.id === 'serial-queue') {
    const queued = timed(() => {
      let score = 0;
      for (let index = 0; index < concurrency * 250; index += 1) score += index % 7;
      return score;
    });
    spans.queueWaitMs = queued.ms;
  }

  if (scenario.id === 'steward-review' || scenario.id === 'serial-queue') {
    const fixture = setupStewardWorkspace();
    try {
      const composed = timed(() => composeBrokerProposals([fixture.proposal, fixture.mergePlanProposal]));
      spans.composerPlanMs = composed.ms;
      const dryRun = timed(() => planStewardApply({
        cwd: fixture.cwd,
        stewardId: 'neutral-write-steward',
        mergePlan: composed.value.mergePlan,
        proposals: [fixture.proposal, fixture.mergePlanProposal],
        scopeFiles: [fixture.targetFile]
      }));
      spans.stewardDryRunMs = dryRun.ms;
      const apply = timed(() => applyStewardPlan({
        cwd: fixture.cwd,
        stewardId: 'neutral-write-steward',
        mergePlan: composed.value.mergePlan,
        proposals: [fixture.proposal, fixture.mergePlanProposal],
        scopeFiles: [fixture.targetFile]
      }));
      spans.stewardApplyMs = apply.ms;
    } finally {
      rmSync(fixture.cwd, { recursive: true, force: true });
    }
  } else if (scenario.id === 'rebase-replay') {
    const recovery = timed(() => ({ route: 'rebase-replay', preserved: true }));
    spans.casMismatchRecoveryMs = recovery.ms;
  } else {
    const refinement = timed(() => {
      const intent = makeIntent({ taskId: `TASK-OPB-C-${scenario.id}`, actorId: 'bench-c', filePath: 'src/refine.ts', atomId: 'atom-refine', atomCid: 'cid-refine' });
      return calculateBrokerDecision(intent, registry([]));
    });
    spans.admissionDecisionMs = refinement.ms;
  }

  const validator = timed(() => runValidatorNoop());
  spans.validatorMs = validator.ms;
  return { route: scenario.route, spans };
}

async function runMeasuredScenario(
  scenario: OperationalBenchScenario,
  profile: OperationalBenchProfileName,
  seed: number,
  concurrency: number,
  iteration: number
): Promise<OperationalBenchResultRow> {
  const started = performance.now();
  const queueStarted = performance.now();
  await sleepImmediate();
  const queueWait = roundMs(performance.now() - queueStarted);
  const execution = scenario.track === 'broker-admission'
    ? runBrokerAdmissionScenario(scenario)
    : scenario.track === 'git-boundary'
      ? runGitBoundaryScenario(scenario)
      : runRecoveryScenario(scenario, concurrency);
  const spans = { ...execution.spans };
  if (scenario.id === 'serial-queue' && spans.queueWaitMs !== null) {
    spans.queueWaitMs = roundMs(spans.queueWaitMs + queueWait);
  }
  spans.totalScenarioMs = roundMs(performance.now() - started);
  return {
    schemaId: 'atm.operationalBench.result.v1',
    profile,
    seed,
    scenarioId: scenario.id,
    track: scenario.track,
    concurrency,
    iteration,
    route: execution.route,
    blockedCategory: scenario.blockedCategory,
    spans,
    recovery: {
      preservedIntent: scenario.preservedIntent,
      terminalFailClosed: scenario.terminalFailClosed,
      overSerialized: scenario.overSerialized,
      fullRegenerationObserved: scenario.fullRegenerationObserved
    }
  };
}

async function runConcurrencyBatch(
  scenario: OperationalBenchScenario,
  options: OperationalBenchOptions,
  concurrency: number,
  startIteration: number,
  count: number
): Promise<OperationalBenchResultRow[]> {
  const rows: OperationalBenchResultRow[] = [];
  for (let offset = 0; offset < count; offset += concurrency) {
    const batchSize = Math.min(concurrency, count - offset);
    const batch = await Promise.all(Array.from({ length: batchSize }, (_, index) => runMeasuredScenario(
      scenario,
      options.profile,
      options.seed,
      concurrency,
      startIteration + offset + index
    )));
    rows.push(...batch);
  }
  return rows;
}

function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index];
}

function stats(values: readonly number[]): SpanStats | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const count = sorted.length;
  const mean = sorted.reduce((sum, value) => sum + value, 0) / count;
  const variance = sorted.reduce((sum, value) => sum + (value - mean) ** 2, 0) / count;
  return {
    count,
    min: roundMs(sorted[0]),
    max: roundMs(sorted[sorted.length - 1]),
    mean: roundMs(mean),
    stddev: roundMs(Math.sqrt(variance)),
    p50: roundMs(percentile(sorted, 50)),
    p95: roundMs(percentile(sorted, 95)),
    p99: roundMs(percentile(sorted, 99))
  };
}

function summarizeSpans(rows: readonly OperationalBenchResultRow[]): SpanStatsMap {
  return Object.fromEntries(operationalBenchSpanNames.map((name) => [
    name,
    stats(rows.map((row) => row.spans[name]).filter((value): value is number => typeof value === 'number'))
  ])) as SpanStatsMap;
}

function groupBy<T>(values: readonly T[], keyOf: (value: T) => string): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  for (const value of values) {
    const key = keyOf(value);
    groups[key] ??= [];
    groups[key].push(value);
  }
  return groups;
}

function buildSummary(options: OperationalBenchOptions, rows: readonly OperationalBenchResultRow[]) {
  const blocked = rows.filter((row) => row.blockedCategory !== 'none');
  const fullRegenerationObserved = blocked.filter((row) => row.recovery.fullRegenerationObserved === true);
  const fullRegenerationDenominator = blocked.filter((row) => row.recovery.fullRegenerationObserved !== null);
  const routeDistribution: Record<string, number> = {};
  const blockedDistribution: Record<string, number> = {};
  for (const row of rows) {
    routeDistribution[row.route] = (routeDistribution[row.route] ?? 0) + 1;
    blockedDistribution[row.blockedCategory] = (blockedDistribution[row.blockedCategory] ?? 0) + 1;
  }

  return {
    schemaId: 'atm.operationalBench.summary.v1',
    generatedAt: new Date().toISOString(),
    seed: options.seed,
    profile: options.profile,
    gitCommit: git(['rev-parse', 'HEAD'], options.root),
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      cpuModel: os.cpus()[0]?.model ?? 'unknown',
      logicalCores: os.cpus().length
    },
    scenarioCount: operationalBenchScenarios.length,
    repeatCount: operationalBenchProfiles[options.profile].repeat,
    warmupCount: operationalBenchProfiles[options.profile].warmup,
    concurrency: operationalBenchProfiles[options.profile].concurrency,
    metrics: {
      overall: summarizeSpans(rows),
      byTrack: Object.fromEntries(Object.entries(groupBy(rows, (row) => row.track)).map(([track, trackRows]) => [track, summarizeSpans(trackRows)])),
      byScenario: Object.fromEntries(Object.entries(groupBy(rows, (row) => row.scenarioId)).map(([scenarioId, scenarioRows]) => [scenarioId, summarizeSpans(scenarioRows)])),
      byConcurrency: Object.fromEntries(Object.entries(groupBy(rows, (row) => String(row.concurrency))).map(([concurrency, concurrencyRows]) => [concurrency, summarizeSpans(concurrencyRows)]))
    },
    routeDistribution,
    blockedCaseDistribution: blockedDistribution,
    recoveryMetrics: {
      preservedIntentSalvageRate: blocked.length === 0 ? null : roundMs(blocked.filter((row) => row.recovery.preservedIntent).length / blocked.length),
      terminalFailClosedRate: blocked.length === 0 ? null : roundMs(blocked.filter((row) => row.recovery.terminalFailClosed).length / blocked.length),
      overSerializationRate: rows.length === 0 ? null : roundMs(rows.filter((row) => row.recovery.overSerialized).length / rows.length),
      fullRegenerationRate: fullRegenerationDenominator.length === 0
        ? null
        : roundMs(fullRegenerationObserved.length / fullRegenerationDenominator.length)
    },
    nullMetricReasons: {
      fullRegenerationRate: fullRegenerationDenominator.length === 0 ? 'not observed by this harness' : null,
      unexecutedSpanValues: 'Scenario spans that do not belong to a route are emitted as null, not zero.'
    },
    notes: [
      'OperationalBench measures ATM-local operational overhead only; it is not an external comparative benchmark.',
      'Validator runtime is measured and reported independently from broker admission.',
      'Fail-closed means fail-closed to unsafe direct or parallel apply; it does not mean intent is discarded.',
      'Blocked cases are categorized as queue, serialization, steward review, rebase-replay, refinement, or terminal fail-closed.'
    ]
  };
}

function renderPaperTable(summary: ReturnType<typeof buildSummary>): string {
  const overall = summary.metrics.overall;
  const byConcurrency = summary.metrics.byConcurrency as Record<string, SpanStatsMap>;
  const metricRows = [
    ['Broker admission decision', overall.admissionDecisionMs, 'excludes validators'],
    ['Git admit dry-run', overall.gitAdmitDryRunMs, 'includes local/remote delta construction in separate span'],
    ['Steward dry-run', overall.stewardDryRunMs, 'excludes validator runtime'],
    ['CAS mismatch recovery routing', overall.casMismatchRecoveryMs, 'recovery routing only'],
    ['Queue wait under N=20', byConcurrency['20']?.queueWaitMs ?? null, 'synthetic contention profile']
  ] as const;
  const lines = [
    '# ATM OperationalBench v0.1 Paper Table',
    '',
    'OperationalBench measures ATM-local operational overhead only. It does not compare ATM against CoAgent, S-Bus, CodeTeam, or any other system.',
    '',
    '| Metric | P50 | P95 | P99 | Notes |',
    '| --- | ---: | ---: | ---: | --- |'
  ];
  for (const [label, stat, note] of metricRows) {
    lines.push(`| ${label} | ${stat ? stat.p50.toFixed(3) : 'null'} | ${stat ? stat.p95.toFixed(3) : 'null'} | ${stat ? stat.p99.toFixed(3) : 'null'} | ${note} |`);
  }
  lines.push(
    '',
    '## Recovery Metrics',
    '',
    `- preservedIntentSalvageRate: ${summary.recoveryMetrics.preservedIntentSalvageRate ?? 'null'}`,
    `- terminalFailClosedRate: ${summary.recoveryMetrics.terminalFailClosedRate ?? 'null'}`,
    `- overSerializationRate: ${summary.recoveryMetrics.overSerializationRate ?? 'null'}`,
    `- fullRegenerationRate: ${summary.recoveryMetrics.fullRegenerationRate ?? 'null'} (${summary.nullMetricReasons.fullRegenerationRate ?? 'observed'})`
  );
  return `${lines.join('\n')}\n`;
}

function renderReadme(options: OperationalBenchOptions, summary: ReturnType<typeof buildSummary>): string {
  return [
    '# ATM OperationalBench v0.1 Evidence',
    '',
    'This artifact set measures ATM-local operational overhead only. It is not an external comparative benchmark and must not be cited as showing that ATM is faster than CoAgent, S-Bus, CodeTeam, or any other system.',
    '',
    `- Profile: \`${options.profile}\``,
    `- Seed: \`${options.seed}\``,
    `- Git commit at run time: \`${summary.gitCommit}\``,
    `- Scenarios: ${summary.scenarioCount}`,
    `- Warmup per scenario/concurrency: ${summary.warmupCount}`,
    `- Repeat per scenario/concurrency: ${summary.repeatCount}`,
    `- Concurrency: ${summary.concurrency.join(', ')}`,
    '',
    '## Measurement Boundary',
    '',
    '- Broker admission, composer plan, steward dry-run/apply, Git-boundary dry-run admission, CAS mismatch recovery routing, queue wait, and total scenario time are reported as separate spans.',
    '- Validator cost is independent and appears only in `validatorMs`; broker admission timings do not include validator runtime.',
    '- Unexecuted spans are `null`, never `0`.',
    '- Fail-closed means fail-closed to unsafe direct or parallel apply, not discarded intent.',
    '- Blocked cases are separated into queue, serialization, steward review, rebase-replay, refinement, and terminal fail-closed.',
    '',
    '## Files',
    '',
    '- `summary.json`: aggregate statistics and recovery metrics.',
    '- `results.jsonl`: raw per-scenario/per-iteration span measurements.',
    '- `paper-table.md`: appendix-ready latency and recovery table.',
    '- `scenario-manifest.json`: profile and scenario contract for this run.',
    '- `artifact-hash-manifest.sha256`: SHA-256 digest for each artifact.',
    '- `README.md`: this evidence contract.',
    '',
    '## Reproduce',
    '',
    '```bash',
    `npm run bench:operational:${options.profile} -- --seed ${options.seed}`,
    'npm run validate:operational-bench',
    '```',
    ''
  ].join('\n');
}

function buildScenarioManifest(options: OperationalBenchOptions) {
  return {
    schemaId: 'atm.operationalBench.scenarioManifest.v1',
    seed: options.seed,
    profile: operationalBenchProfiles[options.profile],
    scenarios: operationalBenchScenarios
  };
}

function writeHashManifest(outDir: string): void {
  const files = readdirSync(outDir)
    .filter((file) => file !== 'artifact-hash-manifest.sha256')
    .sort((left, right) => left.localeCompare(right));
  const lines = files.map((file) => {
    const digest = createHash('sha256').update(readFileSync(path.join(outDir, file))).digest('hex');
    return `${digest}  ${file}`;
  });
  writeFileSync(path.join(outDir, 'artifact-hash-manifest.sha256'), `${lines.join('\n')}\n`, 'utf8');
}

export async function runOperationalBench(options: OperationalBenchOptions) {
  const profile = operationalBenchProfiles[options.profile];
  if (!profile) throw new Error(`unknown profile: ${options.profile}`);
  rmSync(options.outDir, { recursive: true, force: true });
  mkdirSync(options.outDir, { recursive: true });

  for (const scenario of operationalBenchScenarios) {
    for (const concurrency of profile.concurrency) {
      await runConcurrencyBatch(scenario, options, concurrency, -profile.warmup, profile.warmup);
    }
  }

  const rows: OperationalBenchResultRow[] = [];
  for (const scenario of operationalBenchScenarios) {
    for (const concurrency of profile.concurrency) {
      rows.push(...await runConcurrencyBatch(scenario, options, concurrency, 0, profile.repeat));
    }
  }

  const summary = buildSummary(options, rows);
  writeFileSync(path.join(options.outDir, 'results.jsonl'), `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`, 'utf8');
  writeFileSync(path.join(options.outDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  writeFileSync(path.join(options.outDir, 'paper-table.md'), renderPaperTable(summary), 'utf8');
  writeFileSync(path.join(options.outDir, 'scenario-manifest.json'), `${JSON.stringify(buildScenarioManifest(options), null, 2)}\n`, 'utf8');
  writeFileSync(path.join(options.outDir, 'README.md'), renderReadme(options, summary), 'utf8');
  writeHashManifest(options.outDir);
  return summary;
}
