import type {
  AdapterSupportLevel,
  LanguageAdapterCapabilitySet,
} from '../../../plugin-sdk/src/language-adapter';

export type LanguageCapabilityName = keyof LanguageAdapterCapabilitySet;

export interface CapabilityFallbackRequest {
  adapterId: string;
  languageId: string;
  requiredCapabilities: readonly LanguageCapabilityName[];
  capabilitySet?: LanguageAdapterCapabilitySet;
  allowPartial?: boolean;
}

export interface CapabilityFallbackReport {
  adapterId: string;
  languageId: string;
  requiredCapabilities: readonly LanguageCapabilityName[];
  supported: LanguageCapabilityName[];
  advisory: LanguageCapabilityName[];
  unsupported: LanguageCapabilityName[];
  messages: string[];
  ok: boolean;
}

const CAPABILITY_LABELS: Record<LanguageCapabilityName, string> = {
  sourceInventory: 'source inventory',
  symbolNormalization: 'symbol normalization',
  legacyRoutePlanning: 'legacy route planning',
  atomizeDryRun: 'atomize dry-run',
  infectDryRun: 'infect dry-run',
  runtimeCommandDetection: 'runtime command detection',
  diagnosticsParsing: 'diagnostics parsing',
  equivalenceContract: 'equivalence contract',
  atomicMapDecomposition: 'atomic map decomposition',
  dependencyGraph: 'dependency graph',
  callGraph: 'call graph',
  artifactGraph: 'artifact graph',
};

export function normalizeCapabilityLevel(level: AdapterSupportLevel | undefined): AdapterSupportLevel {
  if (level === 'full' || level === 'partial') {
    return level;
  }
  return 'none';
}

function formatCapabilityNames(capabilities: readonly LanguageCapabilityName[]): string {
  return capabilities.map((capability) => CAPABILITY_LABELS[capability] ?? capability).join(', ');
}

export function buildCapabilityFallbackReport(request: CapabilityFallbackRequest): CapabilityFallbackReport {
  const allowPartial = request.allowPartial ?? true;
  const supported: LanguageCapabilityName[] = [];
  const advisory: LanguageCapabilityName[] = [];
  const unsupported: LanguageCapabilityName[] = [];

  for (const capability of request.requiredCapabilities) {
    const level = normalizeCapabilityLevel(request.capabilitySet?.[capability]);
    if (level === 'full') {
      supported.push(capability);
      continue;
    }
    if (level === 'partial') {
      if (allowPartial) {
        advisory.push(capability);
      } else {
        unsupported.push(capability);
      }
      continue;
    }
    unsupported.push(capability);
  }

  const messages: string[] = [];
  if (request.requiredCapabilities.length === 0) {
    messages.push(
      `Adapter ${request.adapterId} was resolved for ${request.languageId} without required capability constraints.`
    );
  } else if (unsupported.length === 0 && advisory.length === 0) {
    messages.push(
      `Adapter ${request.adapterId} fully supports requested capabilities for ${request.languageId}.`
    );
  } else {
    if (advisory.length > 0) {
      messages.push(
        `Adapter ${request.adapterId} can proceed with advisory support for ${formatCapabilityNames(
          advisory
        )}; evidence + review gate is required.`
      );
    }
    if (unsupported.length > 0) {
      messages.push(
        `Adapter ${request.adapterId} cannot fully support ${request.languageId}; missing ${formatCapabilityNames(
          unsupported
        )}.`
      );
    }
  }

  return {
    adapterId: request.adapterId,
    languageId: request.languageId,
    requiredCapabilities: request.requiredCapabilities,
    supported,
    advisory,
    unsupported,
    messages,
    ok: unsupported.length === 0,
  };
}

