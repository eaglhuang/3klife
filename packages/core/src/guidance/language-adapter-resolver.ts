import {
  discoverLanguageAdapters,
  type AdapterDiscoveryInput,
  type RejectedAdapterRecord,
} from './language-adapter-discovery';
import {
  buildCapabilityFallbackReport,
  normalizeCapabilityLevel,
  type CapabilityFallbackReport,
  type LanguageCapabilityName,
} from './language-adapter-fallback';
import { LanguageAdapterRegistry, type AdapterCatalogEntry } from './language-adapter-registry';

export interface LanguageAdapterResolutionRequest {
  languageId: string;
  discoveryInput: AdapterDiscoveryInput;
  requiredCapabilities?: readonly LanguageCapabilityName[];
  preferAdapterId?: string;
  allowPartialCapability?: boolean;
}

export interface AdapterResolutionCandidate {
  adapterId: string;
  moduleName: string;
  source: 'bundled' | 'external';
  languageIds: readonly string[];
  score: number;
  fallback: CapabilityFallbackReport;
  reasons: string[];
}

export interface LanguageAdapterResolutionReport {
  ok: boolean;
  languageId: string;
  selected?: AdapterResolutionCandidate;
  alternatives: AdapterResolutionCandidate[];
  rejected: RejectedAdapterRecord[];
  messages: string[];
  notes: string[];
}

const CAPABILITY_SCORE = {
  full: 6,
  partial: 2,
  none: -8,
} as const;

function scoreSource(sourceOrder: readonly ('bundled' | 'external')[], source: 'bundled' | 'external'): number {
  const index = sourceOrder.indexOf(source);
  if (index < 0) {
    return 0;
  }
  return (sourceOrder.length - index) * 50;
}

function scoreCapabilities(
  candidate: AdapterCatalogEntry,
  requiredCapabilities: readonly LanguageCapabilityName[]
): number {
  let score = 0;
  for (const capability of requiredCapabilities) {
    const level = normalizeCapabilityLevel(candidate.capabilities?.[capability]);
    score += CAPABILITY_SCORE[level];
  }
  return score;
}

function toResolutionCandidate(
  request: LanguageAdapterResolutionRequest,
  sourceOrder: readonly ('bundled' | 'external')[],
  entry: AdapterCatalogEntry
): AdapterResolutionCandidate {
  const requiredCapabilities = request.requiredCapabilities ?? [];
  const fallback = buildCapabilityFallbackReport({
    adapterId: entry.adapterId,
    languageId: request.languageId,
    requiredCapabilities,
    capabilitySet: entry.capabilities,
    allowPartial: request.allowPartialCapability ?? true,
  });

  const reasons: string[] = [];
  let score = 0;

  const sourceScore = scoreSource(sourceOrder, entry.source);
  score += sourceScore;
  reasons.push(`source-score=${sourceScore} (${entry.source})`);

  const priorityScore = entry.priority ?? 0;
  score += priorityScore;
  reasons.push(`priority-score=${priorityScore}`);

  const capabilityScore = scoreCapabilities(entry, requiredCapabilities);
  score += capabilityScore;
  reasons.push(`capability-score=${capabilityScore}`);

  if (request.preferAdapterId && request.preferAdapterId === entry.adapterId) {
    score += 100;
    reasons.push('preferred-adapter bonus=100');
  }

  return {
    adapterId: entry.adapterId,
    moduleName: entry.moduleName,
    source: entry.source,
    languageIds: entry.languageIds,
    score,
    fallback,
    reasons,
  };
}

export function resolveLanguageAdapter(request: LanguageAdapterResolutionRequest): LanguageAdapterResolutionReport {
  const discovery = discoverLanguageAdapters(request.discoveryInput);
  const registry = new LanguageAdapterRegistry();
  registry.registerMany(discovery.candidates);

  const candidates = registry.findByLanguage(request.languageId);
  if (candidates.length === 0) {
    const message =
      discovery.candidates.length === 0
        ? `No adapters were discovered for ${request.languageId}.`
        : `No discovered adapter declares support for ${request.languageId}.`;
    return {
      ok: false,
      languageId: request.languageId,
      alternatives: [],
      rejected: discovery.rejected,
      messages: [message],
      notes: discovery.notes,
    };
  }

  const resolvedCandidates = candidates
    .map((candidate) => toResolutionCandidate(request, discovery.policy.sourceOrder, candidate))
    .sort((left, right) => right.score - left.score);

  const selected = resolvedCandidates[0];
  const alternatives = resolvedCandidates.slice(1);
  const messages = [
    `Selected adapter ${selected.adapterId} (${selected.moduleName}) for ${request.languageId}.`,
    ...selected.fallback.messages,
  ];

  if (!selected.fallback.ok) {
    messages.push('Resolver selected the best available adapter, but required capabilities are still missing.');
  }

  return {
    ok: selected.fallback.ok,
    languageId: request.languageId,
    selected,
    alternatives,
    rejected: discovery.rejected,
    messages,
    notes: discovery.notes,
  };
}

