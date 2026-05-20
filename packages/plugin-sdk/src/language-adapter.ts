/**
 * ATM language adapter contracts (v1 + additive v2 surface).
 * This module is intentionally framework-neutral and host-neutral.
 */

export type MaybePromise<T> = T | Promise<T>;

export type AdapterSupportLevel = 'none' | 'partial' | 'full';

export interface LanguageAdapterCapabilitySet {
  sourceInventory?: AdapterSupportLevel;
  symbolNormalization?: AdapterSupportLevel;
  legacyRoutePlanning?: AdapterSupportLevel;
  atomizeDryRun?: AdapterSupportLevel;
  infectDryRun?: AdapterSupportLevel;
  runtimeCommandDetection?: AdapterSupportLevel;
  diagnosticsParsing?: AdapterSupportLevel;
  equivalenceContract?: AdapterSupportLevel;
  atomicMapDecomposition?: AdapterSupportLevel;
  dependencyGraph?: AdapterSupportLevel;
  callGraph?: AdapterSupportLevel;
  artifactGraph?: AdapterSupportLevel;
}

export interface LanguageProjectProfile {
  languageId: string;
  profileId: string;
  confidence: number;
  evidence?: string[];
}

export interface LanguageAdapterValidationRequest {
  repositoryRoot: string;
  changedFiles?: string[];
  strict?: boolean;
}

export interface LanguageAdapterReport {
  ok: boolean;
  adapterId: string;
  contractVersion?: 'v1' | 'v2';
  messages: string[];
}

export interface SourceRange {
  filePath: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

export interface SymbolRef {
  symbolId: string;
  displayName: string;
  kind: string;
  range: SourceRange;
  references?: SourceRange[];
}

export interface SourceInventoryRequest {
  repositoryRoot: string;
  includeGlobs?: string[];
  excludeGlobs?: string[];
}

export interface SourceFileEntry {
  filePath: string;
  languageId: string;
  symbols?: SymbolRef[];
}

export interface EdgeRef {
  from: string;
  to: string;
  relation: string;
  evidence?: string;
}

export interface SourceInventoryReport {
  files: SourceFileEntry[];
  dependencyEdges?: EdgeRef[];
  callEdges?: EdgeRef[];
  artifactEdges?: EdgeRef[];
  warnings?: string[];
}

export interface NormalizeSymbolIdRequest {
  rawSymbolId: string;
  filePath?: string;
  languageId?: string;
}

export interface NormalizedSymbolId {
  normalized: string;
  strategy: string;
}

export interface LegacyRoutePlanRequest {
  intent: string;
  repositoryRoot: string;
}

export interface LegacyRoutePlanStep {
  phase: string;
  description: string;
}

export interface LegacyRoutePlanReport {
  routeId: string;
  steps: LegacyRoutePlanStep[];
  warnings?: string[];
}

export interface RuntimeCommandRequest {
  repositoryRoot: string;
  includeRisky?: boolean;
}

export interface RuntimeCommandEntry {
  commandId: string;
  command: string;
  category: string;
  mutates: boolean;
  confidence?: number;
}

export interface RuntimeCommandReport {
  commands: RuntimeCommandEntry[];
  warnings?: string[];
}

export interface DiagnosticsParseRequest {
  rawDiagnostics: string;
  source?: string;
}

export interface DiagnosticEntry {
  severity: 'info' | 'warning' | 'error';
  code?: string;
  message: string;
  location?: SourceRange;
}

export interface DiagnosticsReport {
  diagnostics: DiagnosticEntry[];
}

export interface EquivalenceContractRequest {
  fixtureId: string;
  expectedBehavior: string;
}

export interface EquivalenceContractReport {
  fixtureId: string;
  accepted: boolean;
  rationale: string;
  evidencePaths?: string[];
}

export interface DryRunPlanRequest {
  repositoryRoot: string;
  operation: 'atomize' | 'infect';
  atomId?: string;
  goal?: string;
  entrypoint?: string;
  includeGlobs?: string[];
  excludeGlobs?: string[];
}

export interface DryRunPlanStep {
  stage: string;
  description: string;
  filePath?: string;
  subcontract?: 'import-rewrite' | 'shim' | 'rollback' | 'evidence-gate';
}

export interface DryRunImportRewritePlan {
  rewriteId: string;
  filePath: string;
  fromImport: string;
  toImport: string;
  rationale?: string;
}

export interface DryRunHostShimPlan {
  shimId: string;
  filePath: string;
  strategy: string;
  preservesEntrypoint: boolean;
  notes?: string;
}

export interface DryRunRollbackPlan {
  rollbackId: string;
  steps: string[];
  restoreTargets: string[];
  proofHint?: string;
}

export interface DryRunProposalArtifact {
  artifactId: string;
  kind: string;
  path: string;
  required: boolean;
}

export interface DryRunReviewGate {
  gateId: string;
  gateType: 'human-review' | 'police-review' | 'dual-review';
  required: boolean;
  reason?: string;
}

export interface DryRunEvidenceEnvelope {
  planKind: 'atomize' | 'infect';
  requiredEvidence: string[];
  proposalArtifacts: DryRunProposalArtifact[];
  reviewGate: DryRunReviewGate;
  importRewrite?: DryRunImportRewritePlan;
  shim?: DryRunHostShimPlan;
  rollback: DryRunRollbackPlan;
  mutates: string[];
}

export interface DryRunPlanReport {
  operation: 'atomize' | 'infect';
  executionMode: 'dry-run';
  steps: DryRunPlanStep[];
  evidence: DryRunEvidenceEnvelope;
  warnings?: string[];
}

export function isDryRunProposalSafe(report: DryRunPlanReport): boolean {
  return report.executionMode === 'dry-run' && report.evidence.mutates.length === 0;
}

export interface AtomicMapDecompositionRequest {
  mapId: string;
  repositoryRoot: string;
  sourceInventory?: SourceInventoryReport;
  dependencyEdges?: EdgeRef[];
  callEdges?: EdgeRef[];
  artifactEdges?: EdgeRef[];
  minMembers?: number;
  minEdges?: number;
  minEntrypoints?: number;
}

export interface AtomicMapMember {
  atomId: string;
  title: string;
}

export interface AtomicMapEdge {
  from: string;
  to: string;
  relation: string;
  graphKind?: 'dependency' | 'call' | 'artifact';
}

export interface AtomicMapEntrypoint {
  entrypointId: string;
  reason?: string;
  evidence?: string;
}

export interface AtomicMapDecompositionGraphSummary {
  dependencyEdgeCount: number;
  callEdgeCount: number;
  artifactEdgeCount: number;
  totalEdgeCount: number;
}

export interface AtomicMapDecompositionEvidenceGate {
  accepted: boolean;
  requiredEvidence: string[];
  missing: string[];
  messages: string[];
}

export interface AtomicMapDecompositionReport {
  mapId: string;
  members: AtomicMapMember[];
  edges: AtomicMapEdge[];
  entrypoints: AtomicMapEntrypoint[];
  graphSummary?: AtomicMapDecompositionGraphSummary;
  evidenceGate?: AtomicMapDecompositionEvidenceGate;
  warnings?: string[];
}

export function isAtomicMapDecompositionGateAccepted(
  report: AtomicMapDecompositionReport
): boolean {
  return report.evidenceGate?.accepted ?? false;
}

/**
 * v1 baseline contract.
 * Keep this additive to avoid breaking existing adapters.
 */
export interface LanguageAdapter<
  Profile = LanguageProjectProfile,
  ValidateRequest = LanguageAdapterValidationRequest,
  ValidateReport = LanguageAdapterReport
> {
  readonly adapterId: string;
  readonly languageId: string;
  detectProjectProfile(repositoryRoot: string): MaybePromise<Profile>;
  validateComputeAtom(request: ValidateRequest): MaybePromise<ValidateReport>;
}

/**
 * v2 additive contract surface.
 */
export interface LanguageAdapterV2<
  Profile = LanguageProjectProfile,
  ValidateRequest = LanguageAdapterValidationRequest,
  ValidateReport = LanguageAdapterReport
> extends LanguageAdapter<Profile, ValidateRequest, ValidateReport> {
  readonly contractVersion?: 'v2';
  readonly capabilities?: LanguageAdapterCapabilitySet;

  scanSourceInventory?(request: SourceInventoryRequest): MaybePromise<SourceInventoryReport>;
  normalizeSymbolId?(request: NormalizeSymbolIdRequest): MaybePromise<NormalizedSymbolId>;
  buildLegacyRoutePlan?(request: LegacyRoutePlanRequest): MaybePromise<LegacyRoutePlanReport>;
  planAtomizeDryRun?(request: DryRunPlanRequest): MaybePromise<DryRunPlanReport>;
  planInfectDryRun?(request: DryRunPlanRequest): MaybePromise<DryRunPlanReport>;
  detectRuntimeCommands?(request: RuntimeCommandRequest): MaybePromise<RuntimeCommandReport>;
  parseDiagnostics?(request: DiagnosticsParseRequest): MaybePromise<DiagnosticsReport>;
  computeEquivalenceContract?(request: EquivalenceContractRequest): MaybePromise<EquivalenceContractReport>;
  buildAtomicMapDecomposition?(request: AtomicMapDecompositionRequest): MaybePromise<AtomicMapDecompositionReport>;
}
