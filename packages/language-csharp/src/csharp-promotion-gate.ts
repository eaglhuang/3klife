import type { LanguageAdapterCapabilitySet } from '../../../plugin-sdk/src/language-adapter';
import type { CSharpBenchmarkReport } from './csharp-benchmark';
import type { CSharpReadinessGateReport } from './csharp-readiness';

export interface CSharpPromotionGateThresholds {
  minFullCapabilities: number;
  minReadinessScore: number;
  requireReadinessStage: CSharpReadinessGateReport['stage'];
  requireBenchmarkStage: CSharpBenchmarkReport['stage'];
  pilotMinReadinessScore: number;
  requireGovernanceChecksPassed: boolean;
}

export interface CSharpPromotionGateCheck {
  checkId:
    | 'full-capabilities'
    | 'readiness-stage'
    | 'readiness-score'
    | 'benchmark-stage'
    | 'readiness-governance';
  passed: boolean;
  actual: string | number;
  expected: string;
}

export interface CSharpPromotionGateReport {
  stage: 'blocked' | 'advisory-ready' | 'pilot-ready';
  checks: CSharpPromotionGateCheck[];
  blockingReasons: string[];
  summary: {
    fullCapabilityCount: number;
    readinessStage: CSharpReadinessGateReport['stage'];
    readinessScore: number;
    benchmarkStage: CSharpBenchmarkReport['stage'];
    governanceChecksPassed: boolean;
  };
}

const DEFAULT_THRESHOLDS: CSharpPromotionGateThresholds = {
  minFullCapabilities: 12,
  minReadinessScore: 0.85,
  requireReadinessStage: 'ready-for-advisory',
  requireBenchmarkStage: 'pass',
  pilotMinReadinessScore: 1,
  requireGovernanceChecksPassed: true,
};

function countFullCapabilities(capabilities: LanguageAdapterCapabilitySet | undefined): number {
  if (!capabilities) {
    return 0;
  }
  return Object.values(capabilities).filter((level) => level === 'full').length;
}

function compareBenchmarkStage(
  stage: CSharpBenchmarkReport['stage'],
  requiredStage: CSharpBenchmarkReport['stage']
): boolean {
  const rank: Record<CSharpBenchmarkReport['stage'], number> = {
    fail: 0,
    warn: 1,
    pass: 2,
  };
  return rank[stage] >= rank[requiredStage];
}

function readinessGovernanceChecksPassed(readiness: CSharpReadinessGateReport): boolean {
  const governanceChecks = readiness.checks.filter(
    (check) => check.checkId === 'sdk-pinning' || check.checkId === 'nuget-source-mapping'
  );
  if (governanceChecks.length === 0) {
    return false;
  }
  return governanceChecks.every((check) => check.passed);
}

export function evaluateCSharpPromotionGate(
  readiness: CSharpReadinessGateReport,
  benchmark: CSharpBenchmarkReport,
  capabilities: LanguageAdapterCapabilitySet | undefined,
  thresholds: Partial<CSharpPromotionGateThresholds> = {}
): CSharpPromotionGateReport {
  const resolvedThresholds: CSharpPromotionGateThresholds = {
    ...DEFAULT_THRESHOLDS,
    ...thresholds,
  };
  const fullCapabilityCount = countFullCapabilities(capabilities);
  const governancePassed = readinessGovernanceChecksPassed(readiness);
  const checks: CSharpPromotionGateCheck[] = [
    {
      checkId: 'full-capabilities',
      passed: fullCapabilityCount >= resolvedThresholds.minFullCapabilities,
      actual: fullCapabilityCount,
      expected: `>= ${resolvedThresholds.minFullCapabilities}`,
    },
    {
      checkId: 'readiness-stage',
      passed: readiness.stage === resolvedThresholds.requireReadinessStage,
      actual: readiness.stage,
      expected: resolvedThresholds.requireReadinessStage,
    },
    {
      checkId: 'readiness-score',
      passed: readiness.score >= resolvedThresholds.minReadinessScore,
      actual: readiness.score,
      expected: `>= ${resolvedThresholds.minReadinessScore}`,
    },
    {
      checkId: 'benchmark-stage',
      passed: compareBenchmarkStage(benchmark.stage, resolvedThresholds.requireBenchmarkStage),
      actual: benchmark.stage,
      expected: `>= ${resolvedThresholds.requireBenchmarkStage}`,
    },
    {
      checkId: 'readiness-governance',
      passed: resolvedThresholds.requireGovernanceChecksPassed ? governancePassed : true,
      actual: governancePassed ? 'pass' : 'fail',
      expected: resolvedThresholds.requireGovernanceChecksPassed ? 'pass' : 'optional',
    },
  ];

  const blockingReasons = checks
    .filter((check) => !check.passed)
    .map((check) => `${check.checkId}: actual=${check.actual} expected=${check.expected}`);

  const stage: CSharpPromotionGateReport['stage'] =
    blockingReasons.length > 0
      ? 'blocked'
      : readiness.score >= resolvedThresholds.pilotMinReadinessScore && benchmark.stage === 'pass'
        ? 'pilot-ready'
        : 'advisory-ready';

  return {
    stage,
    checks,
    blockingReasons,
    summary: {
      fullCapabilityCount,
      readinessStage: readiness.stage,
      readinessScore: readiness.score,
      benchmarkStage: benchmark.stage,
      governanceChecksPassed: governancePassed,
    },
  };
}
