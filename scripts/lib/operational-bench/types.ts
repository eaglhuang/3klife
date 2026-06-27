export const operationalBenchSpanNames = [
  'diffConstructionMs',
  'mutationRequestConstructionMs',
  'admissionDecisionMs',
  'composerPlanMs',
  'stewardDryRunMs',
  'stewardApplyMs',
  'validatorMs',
  'gitAdmitDryRunMs',
  'casMismatchRecoveryMs',
  'queueWaitMs',
  'totalScenarioMs'
] as const;

export type OperationalBenchSpanName = typeof operationalBenchSpanNames[number];

export type OperationalBenchTrack =
  | 'broker-admission'
  | 'git-boundary'
  | 'recovery-routing';

export type OperationalBenchProfileName = 'smoke' | 'paper' | 'extended';

export interface OperationalBenchProfile {
  readonly name: OperationalBenchProfileName;
  readonly warmup: number;
  readonly repeat: number;
  readonly concurrency: readonly number[];
}

export type OperationalBenchRoute =
  | 'direct-brokered'
  | 'deterministic-composer'
  | 'blocked-before-write'
  | 'neutral-steward'
  | 'rebase-replay'
  | 'refinement-needed'
  | 'terminal-fail-closed';

export type OperationalBenchBlockedCategory =
  | 'none'
  | 'queue'
  | 'serialization'
  | 'steward-review'
  | 'rebase-replay'
  | 'refinement'
  | 'terminal-fail-closed';

export interface OperationalBenchScenario {
  readonly id: string;
  readonly track: OperationalBenchTrack;
  readonly title: string;
  readonly route: OperationalBenchRoute;
  readonly blockedCategory: OperationalBenchBlockedCategory;
  readonly preservedIntent: boolean;
  readonly terminalFailClosed: boolean;
  readonly overSerialized: boolean;
  readonly fullRegenerationObserved: boolean | null;
  readonly notes: readonly string[];
}

export type SpanValueMap = Record<OperationalBenchSpanName, number | null>;

export interface OperationalBenchResultRow {
  readonly schemaId: 'atm.operationalBench.result.v1';
  readonly profile: OperationalBenchProfileName;
  readonly seed: number;
  readonly scenarioId: string;
  readonly track: OperationalBenchTrack;
  readonly concurrency: number;
  readonly iteration: number;
  readonly route: OperationalBenchRoute;
  readonly blockedCategory: OperationalBenchBlockedCategory;
  readonly spans: SpanValueMap;
  readonly recovery: {
    readonly preservedIntent: boolean;
    readonly terminalFailClosed: boolean;
    readonly overSerialized: boolean;
    readonly fullRegenerationObserved: boolean | null;
  };
}

export interface SpanStats {
  readonly count: number;
  readonly min: number;
  readonly max: number;
  readonly mean: number;
  readonly stddev: number;
  readonly p50: number;
  readonly p95: number;
  readonly p99: number;
}

export type SpanStatsMap = Record<OperationalBenchSpanName, SpanStats | null>;
