import type { AdapterCatalogEntry, AdapterSource } from './language-adapter-registry';

export interface AdapterDiscoveryPolicy {
  allowBundled?: boolean;
  allowExternal?: boolean;
  externalAllowList?: readonly string[];
  sourceOrder?: readonly AdapterSource[];
}

export interface NormalizedAdapterDiscoveryPolicy {
  allowBundled: boolean;
  allowExternal: boolean;
  externalAllowList: readonly string[];
  sourceOrder: readonly AdapterSource[];
}

export interface AdapterDiscoveryInput {
  bundledAdapters?: readonly AdapterCatalogEntry[];
  externalAdapters?: readonly AdapterCatalogEntry[];
  policy?: AdapterDiscoveryPolicy;
}

export interface RejectedAdapterRecord {
  adapterId: string;
  moduleName: string;
  source: AdapterSource;
  reason: string;
}

export interface AdapterDiscoveryResult {
  candidates: AdapterCatalogEntry[];
  rejected: RejectedAdapterRecord[];
  notes: string[];
  policy: NormalizedAdapterDiscoveryPolicy;
}

function normalizeSourceOrder(sourceOrder: readonly AdapterSource[] | undefined): readonly AdapterSource[] {
  const defaultOrder: AdapterSource[] = ['bundled', 'external'];
  if (!sourceOrder || sourceOrder.length === 0) {
    return defaultOrder;
  }
  const deduped = Array.from(new Set(sourceOrder)).filter(
    (value): value is AdapterSource => value === 'bundled' || value === 'external'
  );
  if (deduped.length === 0) {
    return defaultOrder;
  }
  if (!deduped.includes('bundled')) {
    deduped.push('bundled');
  }
  if (!deduped.includes('external')) {
    deduped.push('external');
  }
  return deduped;
}

export function normalizeAdapterDiscoveryPolicy(policy: AdapterDiscoveryPolicy | undefined): NormalizedAdapterDiscoveryPolicy {
  return {
    allowBundled: policy?.allowBundled ?? true,
    allowExternal: policy?.allowExternal ?? true,
    externalAllowList: policy?.externalAllowList ?? [],
    sourceOrder: normalizeSourceOrder(policy?.sourceOrder),
  };
}

function sourceOrderIndex(sourceOrder: readonly AdapterSource[], source: AdapterSource): number {
  const index = sourceOrder.indexOf(source);
  return index >= 0 ? index : sourceOrder.length;
}

function shouldReplaceCandidate(
  sourceOrder: readonly AdapterSource[],
  current: AdapterCatalogEntry,
  incoming: AdapterCatalogEntry
): boolean {
  const currentSourceIndex = sourceOrderIndex(sourceOrder, current.source);
  const incomingSourceIndex = sourceOrderIndex(sourceOrder, incoming.source);
  if (incomingSourceIndex !== currentSourceIndex) {
    return incomingSourceIndex < currentSourceIndex;
  }
  return (incoming.priority ?? 0) > (current.priority ?? 0);
}

function isExternalAllowed(policy: NormalizedAdapterDiscoveryPolicy, adapter: AdapterCatalogEntry): boolean {
  if (adapter.source !== 'external') {
    return true;
  }
  if (policy.externalAllowList.length === 0) {
    return true;
  }
  return (
    policy.externalAllowList.includes(adapter.moduleName) || policy.externalAllowList.includes(adapter.adapterId)
  );
}

export function discoverLanguageAdapters(input: AdapterDiscoveryInput): AdapterDiscoveryResult {
  const policy = normalizeAdapterDiscoveryPolicy(input.policy);
  const bundledAdapters = input.bundledAdapters ?? [];
  const externalAdapters = input.externalAdapters ?? [];
  const rejected: RejectedAdapterRecord[] = [];
  const notes: string[] = [];
  const candidatesById = new Map<string, AdapterCatalogEntry>();

  const allCandidates: AdapterCatalogEntry[] = [...bundledAdapters, ...externalAdapters];
  notes.push(
    `Received ${bundledAdapters.length} bundled and ${externalAdapters.length} external adapter candidates.`
  );

  for (const adapter of allCandidates) {
    if (adapter.source === 'bundled' && !policy.allowBundled) {
      rejected.push({
        adapterId: adapter.adapterId,
        moduleName: adapter.moduleName,
        source: adapter.source,
        reason: 'bundled adapters are disabled by policy',
      });
      continue;
    }
    if (adapter.source === 'external' && !policy.allowExternal) {
      rejected.push({
        adapterId: adapter.adapterId,
        moduleName: adapter.moduleName,
        source: adapter.source,
        reason: 'external adapters are disabled by policy',
      });
      continue;
    }
    if (!isExternalAllowed(policy, adapter)) {
      rejected.push({
        adapterId: adapter.adapterId,
        moduleName: adapter.moduleName,
        source: adapter.source,
        reason: 'external adapter not in allow list',
      });
      continue;
    }

    const existing = candidatesById.get(adapter.adapterId);
    if (!existing) {
      candidatesById.set(adapter.adapterId, adapter);
      continue;
    }

    if (shouldReplaceCandidate(policy.sourceOrder, existing, adapter)) {
      candidatesById.set(adapter.adapterId, adapter);
      notes.push(`Replaced duplicate adapter ${adapter.adapterId} with preferred candidate ${adapter.moduleName}.`);
    } else {
      notes.push(`Ignored duplicate adapter candidate ${adapter.moduleName} for ${adapter.adapterId}.`);
    }
  }

  const candidates = Array.from(candidatesById.values()).sort((left, right) => {
    const sourceDiff = sourceOrderIndex(policy.sourceOrder, left.source) - sourceOrderIndex(policy.sourceOrder, right.source);
    if (sourceDiff !== 0) {
      return sourceDiff;
    }
    const priorityDiff = (right.priority ?? 0) - (left.priority ?? 0);
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    return left.adapterId.localeCompare(right.adapterId);
  });

  notes.push(`Discovery resolved ${candidates.length} unique adapters and rejected ${rejected.length}.`);

  return {
    candidates,
    rejected,
    notes,
    policy,
  };
}

