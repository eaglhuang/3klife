import type { AtomicMapDecompositionReport } from '../../../plugin-sdk/src/language-adapter';
import type { CSharpCsprojRiskReport } from './csharp-csproj-risk';
import type { CSharpProjectEvidence } from './csharp-profile';
import type { CSharpSymbolReferenceIndex } from './csharp-symbol-index';

export interface CSharpReadinessThresholds {
  minInventoryFiles: number;
  minResolvedReferences: number;
  maxUnresolvedRatio: number;
  maxAmbiguousRatio: number;
  maxErrorRiskFindings: number;
  requireMapEvidenceGateAccepted: boolean;
  requireSdkPinning: boolean;
  requireNugetSourceMapping: boolean;
}

export interface CSharpReadinessCheck {
  checkId:
    | 'inventory-files'
    | 'resolved-references'
    | 'unresolved-ratio'
    | 'ambiguous-ratio'
    | 'csproj-error-risk'
    | 'map-evidence-gate'
    | 'sdk-pinning'
    | 'nuget-source-mapping';
  passed: boolean;
  actual: number | boolean;
  expected: string;
  detail: string;
}

export interface CSharpReadinessGateReport {
  stage: 'advisory-blocked' | 'ready-for-advisory';
  score: number;
  checks: CSharpReadinessCheck[];
  blockingReasons: string[];
  summary: {
    inventoryFileCount: number;
    referenceCount: number;
    resolvedCount: number;
    ambiguousCount: number;
    unresolvedCount: number;
    unresolvedRatio: number;
    ambiguousRatio: number;
    csprojErrorRiskCount: number;
    mapEvidenceAccepted?: boolean;
    sdkPinned?: boolean;
    nugetSourceMapped?: boolean;
  };
}

export interface CSharpReadinessGateInput {
  inventoryFileCount: number;
  symbolReferenceIndex: CSharpSymbolReferenceIndex;
  csprojRisk: CSharpCsprojRiskReport;
  projectEvidence?: Pick<CSharpProjectEvidence, 'globalJsonProfiles' | 'nugetConfigProfiles'>;
  mapReport?: AtomicMapDecompositionReport;
  thresholds?: Partial<CSharpReadinessThresholds>;
}

const DEFAULT_THRESHOLDS: CSharpReadinessThresholds = {
  minInventoryFiles: 10,
  minResolvedReferences: 5,
  maxUnresolvedRatio: 0.55,
  maxAmbiguousRatio: 0.45,
  maxErrorRiskFindings: 0,
  requireMapEvidenceGateAccepted: true,
  requireSdkPinning: true,
  requireNugetSourceMapping: true,
};

function roundRatio(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function makeCheck(
  check: Omit<CSharpReadinessCheck, 'detail'> & { detail?: string }
): CSharpReadinessCheck {
  return {
    ...check,
    detail: check.detail ?? '',
  };
}

function hasPinnedSdk(projectEvidence: CSharpReadinessGateInput['projectEvidence']): boolean {
  return (
    projectEvidence?.globalJsonProfiles?.some((profile) => Boolean(profile.sdkVersion)) ?? false
  );
}

function hasNugetSourceMapping(projectEvidence: CSharpReadinessGateInput['projectEvidence']): boolean {
  return (
    projectEvidence?.nugetConfigProfiles?.some((profile) => profile.packageSourceMappingEnabled) ??
    false
  );
}

export function evaluateCSharpReadinessGate(
  input: CSharpReadinessGateInput
): CSharpReadinessGateReport {
  const thresholds: CSharpReadinessThresholds = {
    ...DEFAULT_THRESHOLDS,
    ...(input.thresholds ?? {}),
  };

  const referenceCount = input.symbolReferenceIndex.references.length;
  const resolvedCount = input.symbolReferenceIndex.resolvedCount;
  const ambiguousCount = input.symbolReferenceIndex.ambiguousCount;
  const unresolvedCount = input.symbolReferenceIndex.unresolvedCount;
  const unresolvedRatio = referenceCount > 0 ? unresolvedCount / referenceCount : 1;
  const ambiguousRatio = referenceCount > 0 ? ambiguousCount / referenceCount : 1;
  const csprojErrorRiskCount = input.csprojRisk.summary.errorCount;
  const mapAccepted = input.mapReport?.evidenceGate?.accepted;
  const sdkPinned = hasPinnedSdk(input.projectEvidence);
  const nugetSourceMapped = hasNugetSourceMapping(input.projectEvidence);

  const checks: CSharpReadinessCheck[] = [
    makeCheck({
      checkId: 'inventory-files',
      passed: input.inventoryFileCount >= thresholds.minInventoryFiles,
      actual: input.inventoryFileCount,
      expected: `>= ${thresholds.minInventoryFiles}`,
      detail: 'Source inventory must cover enough files for advisory confidence.',
    }),
    makeCheck({
      checkId: 'resolved-references',
      passed: resolvedCount >= thresholds.minResolvedReferences,
      actual: resolvedCount,
      expected: `>= ${thresholds.minResolvedReferences}`,
      detail: 'Cross-file symbol resolution should be meaningfully populated.',
    }),
    makeCheck({
      checkId: 'unresolved-ratio',
      passed: unresolvedRatio <= thresholds.maxUnresolvedRatio,
      actual: roundRatio(unresolvedRatio),
      expected: `<= ${thresholds.maxUnresolvedRatio}`,
      detail: 'Too many unresolved references means symbol model is still weak.',
    }),
    makeCheck({
      checkId: 'ambiguous-ratio',
      passed: ambiguousRatio <= thresholds.maxAmbiguousRatio,
      actual: roundRatio(ambiguousRatio),
      expected: `<= ${thresholds.maxAmbiguousRatio}`,
      detail: 'Ambiguous matches should stay below advisory threshold.',
    }),
    makeCheck({
      checkId: 'csproj-error-risk',
      passed: csprojErrorRiskCount <= thresholds.maxErrorRiskFindings,
      actual: csprojErrorRiskCount,
      expected: `<= ${thresholds.maxErrorRiskFindings}`,
      detail: 'Advisory promotion requires zero blocking csproj risk findings.',
    }),
    makeCheck({
      checkId: 'map-evidence-gate',
      passed: thresholds.requireMapEvidenceGateAccepted ? mapAccepted === true : true,
      actual: mapAccepted ?? false,
      expected: thresholds.requireMapEvidenceGateAccepted ? 'true' : 'optional',
      detail: 'Atomic map evidence gate must pass for promotion readiness.',
    }),
    makeCheck({
      checkId: 'sdk-pinning',
      passed: thresholds.requireSdkPinning ? sdkPinned : true,
      actual: sdkPinned,
      expected: thresholds.requireSdkPinning ? 'true' : 'optional',
      detail: 'global.json sdk.version pinning is required for reproducible advisory planning.',
    }),
    makeCheck({
      checkId: 'nuget-source-mapping',
      passed: thresholds.requireNugetSourceMapping ? nugetSourceMapped : true,
      actual: nugetSourceMapped,
      expected: thresholds.requireNugetSourceMapping ? 'true' : 'optional',
      detail: 'NuGet.Config packageSourceMapping should be enabled for source governance.',
    }),
  ];

  const blockingReasons = checks
    .filter((check) => !check.passed)
    .map((check) => `${check.checkId}: actual=${String(check.actual)}, expected=${check.expected}`);

  const score = checks.length === 0 ? 0 : checks.filter((check) => check.passed).length / checks.length;

  return {
    stage: blockingReasons.length === 0 ? 'ready-for-advisory' : 'advisory-blocked',
    score: roundRatio(score),
    checks,
    blockingReasons,
    summary: {
      inventoryFileCount: input.inventoryFileCount,
      referenceCount,
      resolvedCount,
      ambiguousCount,
      unresolvedCount,
      unresolvedRatio: roundRatio(unresolvedRatio),
      ambiguousRatio: roundRatio(ambiguousRatio),
      csprojErrorRiskCount,
      mapEvidenceAccepted: mapAccepted,
      sdkPinned,
      nugetSourceMapped,
    },
  };
}
