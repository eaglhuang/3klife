import type { LanguageAdapterCapabilitySet } from '../../../plugin-sdk/src/language-adapter';

export type AdapterSource = 'bundled' | 'external';

export interface AdapterCatalogEntry {
  adapterId: string;
  moduleName: string;
  source: AdapterSource;
  languageIds: readonly string[];
  contractVersion?: 'v1' | 'v2';
  capabilities?: LanguageAdapterCapabilitySet;
  priority?: number;
}

export interface AdapterRegistrationResult {
  adapterId: string;
  replaced: boolean;
}

function normalizeLanguageId(languageId: string): string {
  return languageId.trim().toLowerCase();
}

function sourceRank(source: AdapterSource): number {
  return source === 'bundled' ? 0 : 1;
}

export function compareAdapterEntries(left: AdapterCatalogEntry, right: AdapterCatalogEntry): number {
  const sourceDiff = sourceRank(left.source) - sourceRank(right.source);
  if (sourceDiff !== 0) {
    return sourceDiff;
  }

  const priorityDiff = (right.priority ?? 0) - (left.priority ?? 0);
  if (priorityDiff !== 0) {
    return priorityDiff;
  }

  return left.adapterId.localeCompare(right.adapterId);
}

export class LanguageAdapterRegistry {
  private readonly byAdapterId = new Map<string, AdapterCatalogEntry>();

  register(entry: AdapterCatalogEntry): AdapterRegistrationResult {
    const normalized: AdapterCatalogEntry = {
      ...entry,
      languageIds: entry.languageIds.map((languageId) => normalizeLanguageId(languageId)),
    };
    const replaced = this.byAdapterId.has(normalized.adapterId);
    this.byAdapterId.set(normalized.adapterId, normalized);
    return {
      adapterId: normalized.adapterId,
      replaced,
    };
  }

  registerMany(entries: readonly AdapterCatalogEntry[]): AdapterRegistrationResult[] {
    return entries.map((entry) => this.register(entry));
  }

  list(): AdapterCatalogEntry[] {
    return Array.from(this.byAdapterId.values()).sort(compareAdapterEntries);
  }

  get(adapterId: string): AdapterCatalogEntry | undefined {
    return this.byAdapterId.get(adapterId);
  }

  findByLanguage(languageId: string): AdapterCatalogEntry[] {
    const normalizedLanguageId = normalizeLanguageId(languageId);
    return this.list().filter((entry) => entry.languageIds.includes(normalizedLanguageId));
  }
}

