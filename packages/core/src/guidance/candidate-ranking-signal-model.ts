import type {
  AdapterSupportLevel,
  LanguageAdapterCapabilitySet,
  SourceInventoryReport,
} from '../../../plugin-sdk/src/language-adapter';
import { normalizeCapabilityLevel } from './language-adapter-fallback';
import type { AdapterResolutionCandidate } from './language-adapter-resolver';
import type { SourceInventoryMode } from './source-inventory-service';

export type CandidateSignalId =
  | 'source-files'
  | 'symbol-normalization'
  | 'dependency-graph'
  | 'call-graph'
  | 'artifact-graph';

export type CandidateSignalCapability =
  | 'sourceInventory'
  | 'symbolNormalization'
  | 'dependencyGraph'
  | 'callGraph'
  | 'artifactGraph';

export interface CandidateRankingSignalProvenance {
  adapterId?: string;
  moduleName?: string;
  source?: 'bundled' | 'external';
  inventoryMode: SourceInventoryMode;
  inventoryArtifactPath: string;
}

export interface CandidateRankingSignal {
  signalId: CandidateSignalId;
  capability: CandidateSignalCapability;
  supportLevel: AdapterSupportLevel;
  advisory: boolean;
  points: number;
  maxPoints: number;
  observedValue: number;
  explanation: string;
  provenance: CandidateRankingSignalProvenance;
}

export interface CandidateRankingScore {
  total: number;
  max: number;
}

export interface CandidateRankingScoreInputs {
  fileCount: number;
  symbolCount: number;
  dependencyEdgeCount: number;
  callEdgeCount: number;
  artifactEdgeCount: number;
}

export interface CandidateRankingSignalModelInput {
  languageId: string;
  inventory: SourceInventoryReport;
  inventoryMode: SourceInventoryMode;
  inventoryArtifactPath: string;
  selectedAdapter?: AdapterResolutionCandidate;
}

export interface CandidateRankingSignalModelReport {
  ok: boolean;
  languageId: string;
  score: CandidateRankingScore;
  scoreInputs: CandidateRankingScoreInputs;
  signals: CandidateRankingSignal[];
  advisorySignalIds: CandidateSignalId[];
  unsupportedSignalIds: CandidateSignalId[];
  messages: string[];
  inventoryArtifactPath: string;
}

interface SignalSpec {
  signalId: CandidateSignalId;
  capability: CandidateSignalCapability;
  maxPoints: number;
  getObservedValue: (inputs: CandidateRankingScoreInputs) => number;
}

const SIGNAL_SPECS: readonly SignalSpec[] = [
  {
    signalId: 'source-files',
    capability: 'sourceInventory',
    maxPoints: 35,
    getObservedValue: (inputs) => inputs.fileCount,
  },
  {
    signalId: 'symbol-normalization',
    capability: 'symbolNormalization',
    maxPoints: 25,
    getObservedValue: (inputs) => inputs.symbolCount,
  },
  {
    signalId: 'dependency-graph',
    capability: 'dependencyGraph',
    maxPoints: 15,
    getObservedValue: (inputs) => inputs.dependencyEdgeCount,
  },
  {
    signalId: 'call-graph',
    capability: 'callGraph',
    maxPoints: 15,
    getObservedValue: (inputs) => inputs.callEdgeCount,
  },
  {
    signalId: 'artifact-graph',
    capability: 'artifactGraph',
    maxPoints: 10,
    getObservedValue: (inputs) => inputs.artifactEdgeCount,
  },
];

function collectScoreInputs(inventory: SourceInventoryReport): CandidateRankingScoreInputs {
  const symbolCount = inventory.files.reduce((acc, file) => acc + (file.symbols?.length ?? 0), 0);
  return {
    fileCount: inventory.files.length,
    symbolCount,
    dependencyEdgeCount: inventory.dependencyEdges?.length ?? 0,
    callEdgeCount: inventory.callEdges?.length ?? 0,
    artifactEdgeCount: inventory.artifactEdges?.length ?? 0,
  };
}

function computeSignalPoints(
  supportLevel: AdapterSupportLevel,
  observedValue: number,
  maxPoints: number
): number {
  if (supportLevel === 'none') {
    return 0;
  }
  if (supportLevel === 'partial') {
    return observedValue > 0 ? Math.floor(maxPoints * 0.6) : Math.floor(maxPoints * 0.3);
  }
  return observedValue > 0 ? maxPoints : Math.floor(maxPoints * 0.5);
}

function capabilityLevel(
  capabilities: LanguageAdapterCapabilitySet | undefined,
  capability: CandidateSignalCapability
): AdapterSupportLevel {
  return normalizeCapabilityLevel(capabilities?.[capability]);
}

function buildSignalExplanation(
  signalId: CandidateSignalId,
  capability: CandidateSignalCapability,
  supportLevel: AdapterSupportLevel,
  observedValue: number,
  points: number,
  maxPoints: number
): string {
  if (supportLevel === 'none') {
    return `${signalId}: capability ${capability}=none, observed=${observedValue}, score=${points}/${maxPoints} (advisory).`;
  }
  if (supportLevel === 'partial') {
    return `${signalId}: capability ${capability}=partial, observed=${observedValue}, score=${points}/${maxPoints} (advisory).`;
  }
  return `${signalId}: capability ${capability}=full, observed=${observedValue}, score=${points}/${maxPoints}.`;
}

function buildProvenance(
  input: CandidateRankingSignalModelInput
): CandidateRankingSignalProvenance {
  return {
    adapterId: input.selectedAdapter?.adapterId,
    moduleName: input.selectedAdapter?.moduleName,
    source: input.selectedAdapter?.source,
    inventoryMode: input.inventoryMode,
    inventoryArtifactPath: input.inventoryArtifactPath,
  };
}

export function buildCandidateRankingSignalModel(
  input: CandidateRankingSignalModelInput
): CandidateRankingSignalModelReport {
  const scoreInputs = collectScoreInputs(input.inventory);
  const capabilities = input.selectedAdapter?.capabilities;
  const provenance = buildProvenance(input);

  const signals: CandidateRankingSignal[] = [];
  const advisorySignalIds: CandidateSignalId[] = [];
  const unsupportedSignalIds: CandidateSignalId[] = [];
  const messages: string[] = [];
  let total = 0;
  let max = 0;

  for (const spec of SIGNAL_SPECS) {
    const supportLevel = capabilityLevel(capabilities, spec.capability);
    const observedValue = spec.getObservedValue(scoreInputs);
    const points = computeSignalPoints(supportLevel, observedValue, spec.maxPoints);
    const advisory = supportLevel !== 'full';
    const explanation = buildSignalExplanation(
      spec.signalId,
      spec.capability,
      supportLevel,
      observedValue,
      points,
      spec.maxPoints
    );

    if (advisory) {
      advisorySignalIds.push(spec.signalId);
    }
    if (supportLevel === 'none') {
      unsupportedSignalIds.push(spec.signalId);
    }

    signals.push({
      signalId: spec.signalId,
      capability: spec.capability,
      supportLevel,
      advisory,
      points,
      maxPoints: spec.maxPoints,
      observedValue,
      explanation,
      provenance,
    });
    total += points;
    max += spec.maxPoints;
    messages.push(explanation);
  }

  messages.push(`Candidate ranking total score=${total}/${max}.`);
  messages.push(`Inventory artifact path: ${input.inventoryArtifactPath}`);
  if (unsupportedSignalIds.length > 0) {
    messages.push(`Unsupported signal IDs (advisory): ${unsupportedSignalIds.join(', ')}.`);
  }

  return {
    ok: Boolean(input.selectedAdapter),
    languageId: input.languageId,
    score: {
      total,
      max,
    },
    scoreInputs,
    signals,
    advisorySignalIds,
    unsupportedSignalIds,
    messages,
    inventoryArtifactPath: input.inventoryArtifactPath,
  };
}

