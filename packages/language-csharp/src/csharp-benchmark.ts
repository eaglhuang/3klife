export interface CSharpBenchmarkSample {
  label: string;
  inventoryMs: number;
  symbolIndexMs: number;
  mapMs: number;
  totalMs: number;
  inventoryFileCount: number;
  resolvedReferenceCount: number;
  mapMemberCount: number;
}

export interface CSharpBenchmarkThresholds {
  maxInventoryMs: number;
  maxSymbolIndexMs: number;
  maxMapMs: number;
  maxTotalMs: number;
  minFilesPerSecond: number;
}

export interface CSharpBenchmarkCheck {
  checkId:
    | 'inventory-ms'
    | 'symbol-index-ms'
    | 'map-ms'
    | 'total-ms'
    | 'files-per-second';
  passed: boolean;
  actual: number;
  expected: string;
}

export interface CSharpBenchmarkReport {
  label: string;
  stage: 'pass' | 'warn' | 'fail';
  checks: CSharpBenchmarkCheck[];
  warnings: string[];
  summary: {
    inventoryMs: number;
    symbolIndexMs: number;
    mapMs: number;
    totalMs: number;
    filesPerSecond: number;
    inventoryFileCount: number;
    resolvedReferenceCount: number;
    mapMemberCount: number;
  };
}

const DEFAULT_THRESHOLDS: CSharpBenchmarkThresholds = {
  maxInventoryMs: 400,
  maxSymbolIndexMs: 200,
  maxMapMs: 300,
  maxTotalMs: 1000,
  minFilesPerSecond: 20,
};

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function evaluateCSharpBenchmark(
  sample: CSharpBenchmarkSample,
  thresholds: Partial<CSharpBenchmarkThresholds> = {}
): CSharpBenchmarkReport {
  const resolvedThresholds: CSharpBenchmarkThresholds = {
    ...DEFAULT_THRESHOLDS,
    ...thresholds,
  };
  const filesPerSecond =
    sample.totalMs > 0 ? (sample.inventoryFileCount * 1000) / sample.totalMs : sample.inventoryFileCount * 1000;

  const checks: CSharpBenchmarkCheck[] = [
    {
      checkId: 'inventory-ms',
      passed: sample.inventoryMs <= resolvedThresholds.maxInventoryMs,
      actual: sample.inventoryMs,
      expected: `<= ${resolvedThresholds.maxInventoryMs}`,
    },
    {
      checkId: 'symbol-index-ms',
      passed: sample.symbolIndexMs <= resolvedThresholds.maxSymbolIndexMs,
      actual: sample.symbolIndexMs,
      expected: `<= ${resolvedThresholds.maxSymbolIndexMs}`,
    },
    {
      checkId: 'map-ms',
      passed: sample.mapMs <= resolvedThresholds.maxMapMs,
      actual: sample.mapMs,
      expected: `<= ${resolvedThresholds.maxMapMs}`,
    },
    {
      checkId: 'total-ms',
      passed: sample.totalMs <= resolvedThresholds.maxTotalMs,
      actual: sample.totalMs,
      expected: `<= ${resolvedThresholds.maxTotalMs}`,
    },
    {
      checkId: 'files-per-second',
      passed: filesPerSecond >= resolvedThresholds.minFilesPerSecond,
      actual: round(filesPerSecond),
      expected: `>= ${resolvedThresholds.minFilesPerSecond}`,
    },
  ];

  const failedChecks = checks.filter((check) => !check.passed);
  const stage: CSharpBenchmarkReport['stage'] =
    failedChecks.length === 0 ? 'pass' : failedChecks.length <= 1 ? 'warn' : 'fail';
  const warnings = failedChecks.map(
    (check) => `${check.checkId}: actual=${check.actual} expected=${check.expected}`
  );

  return {
    label: sample.label,
    stage,
    checks,
    warnings,
    summary: {
      inventoryMs: sample.inventoryMs,
      symbolIndexMs: sample.symbolIndexMs,
      mapMs: sample.mapMs,
      totalMs: sample.totalMs,
      filesPerSecond: round(filesPerSecond),
      inventoryFileCount: sample.inventoryFileCount,
      resolvedReferenceCount: sample.resolvedReferenceCount,
      mapMemberCount: sample.mapMemberCount,
    },
  };
}

