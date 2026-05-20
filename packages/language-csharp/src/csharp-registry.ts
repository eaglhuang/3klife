import type { LanguageAdapterV2 } from '../../../plugin-sdk/src/language-adapter';
import type { AdapterCatalogEntry, AdapterSource } from '../../../core/src/guidance/language-adapter-registry';
import { csharpLanguageAdapterV2 } from './adapter';

const DEFAULT_LANGUAGE_IDS = ['csharp', 'c#', 'cs'] as const;

export interface CSharpRegistryEntryOptions {
  adapter?: LanguageAdapterV2;
  moduleName?: string;
  source?: AdapterSource;
  priority?: number;
  languageIds?: readonly string[];
}

export function createCSharpAdapterCatalogEntry(
  options: CSharpRegistryEntryOptions = {}
): AdapterCatalogEntry {
  const adapter = options.adapter ?? csharpLanguageAdapterV2;
  const languageIds = Array.from(
    new Set([adapter.languageId, ...(options.languageIds ?? DEFAULT_LANGUAGE_IDS)])
  );

  return {
    adapterId: adapter.adapterId,
    moduleName: options.moduleName ?? '@ai-atomic-framework/language-csharp',
    source: options.source ?? 'bundled',
    languageIds,
    contractVersion: adapter.contractVersion === 'v2' ? 'v2' : undefined,
    capabilities: adapter.capabilities,
    priority: options.priority ?? 2,
  };
}
