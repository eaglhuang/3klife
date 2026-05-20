import type {
  AdapterSupportLevel,
  SourceInventoryReport,
  SourceInventoryRequest,
} from '../../../plugin-sdk/src/language-adapter';
import { normalizeCapabilityLevel } from './language-adapter-fallback';
import type { LanguageAdapterResolutionReport } from './language-adapter-resolver';

export type SourceInventoryMode = 'adapter-delegated' | 'generic-fallback';

export interface SourceInventoryServiceRequest {
  languageId: string;
  repositoryRoot: string;
  adapterResolution: LanguageAdapterResolutionReport;
  includeGlobs?: readonly string[];
  excludeGlobs?: readonly string[];
  artifactPath?: string;
  adapterScanSourceInventory?: (
    request: SourceInventoryRequest
  ) => SourceInventoryReport | Promise<SourceInventoryReport>;
}

export interface SourceInventoryProvenance {
  mode: SourceInventoryMode;
  adapterId?: string;
  moduleName?: string;
  source?: 'bundled' | 'external';
  capabilityLevel: AdapterSupportLevel;
  reason: string;
}

export interface SourceInventoryServiceReport {
  ok: boolean;
  mode: SourceInventoryMode;
  artifactPath: string;
  inventory: SourceInventoryReport;
  provenance: SourceInventoryProvenance;
  messages: string[];
}

interface InventoryDelegationEligibility {
  ok: boolean;
  capabilityLevel: AdapterSupportLevel;
  reason: string;
}

const SOURCE_INVENTORY_CAPABILITY = 'sourceInventory';

function sanitizeLanguageId(languageId: string): string {
  const trimmed = languageId.trim().toLowerCase();
  return trimmed.replace(/[^a-z0-9_.-]/g, '-');
}

export function defaultSourceInventoryArtifactPath(languageId: string): string {
  const safeLanguageId = sanitizeLanguageId(languageId);
  return `artifacts/atm/candidates/${safeLanguageId}/source-inventory.json`;
}

function buildFallbackInventory(reason: string): SourceInventoryReport {
  return {
    files: [],
    warnings: [reason],
  };
}

function evaluateInventoryDelegationEligibility(
  request: SourceInventoryServiceRequest
): InventoryDelegationEligibility {
  const selected = request.adapterResolution.selected;
  if (!selected) {
    return {
      ok: false,
      capabilityLevel: 'none',
      reason: 'no adapter was resolved',
    };
  }

  if (!request.adapterScanSourceInventory) {
    return {
      ok: false,
      capabilityLevel: 'none',
      reason: 'adapter scanSourceInventory delegate is not provided',
    };
  }

  const capabilityLevel = normalizeCapabilityLevel(selected.capabilities?.[SOURCE_INVENTORY_CAPABILITY]);
  if (capabilityLevel === 'none') {
    return {
      ok: false,
      capabilityLevel,
      reason: 'resolved adapter reports source inventory as unsupported',
    };
  }

  return {
    ok: true,
    capabilityLevel,
    reason:
      capabilityLevel === 'partial'
        ? 'resolved adapter reports source inventory as partial capability'
        : 'resolved adapter reports source inventory as full capability',
  };
}

function buildProvenance(
  request: SourceInventoryServiceRequest,
  mode: SourceInventoryMode,
  eligibility: InventoryDelegationEligibility
): SourceInventoryProvenance {
  const selected = request.adapterResolution.selected;
  return {
    mode,
    adapterId: selected?.adapterId,
    moduleName: selected?.moduleName,
    source: selected?.source,
    capabilityLevel: eligibility.capabilityLevel,
    reason: eligibility.reason,
  };
}

export async function collectCandidateSourceInventory(
  request: SourceInventoryServiceRequest
): Promise<SourceInventoryServiceReport> {
  const artifactPath = request.artifactPath ?? defaultSourceInventoryArtifactPath(request.languageId);
  const eligibility = evaluateInventoryDelegationEligibility(request);
  const selected = request.adapterResolution.selected;
  const baseMessages = [...request.adapterResolution.messages];

  if (eligibility.ok && request.adapterScanSourceInventory && selected) {
    try {
      const inventory = await request.adapterScanSourceInventory({
        repositoryRoot: request.repositoryRoot,
        includeGlobs: request.includeGlobs ? [...request.includeGlobs] : undefined,
        excludeGlobs: request.excludeGlobs ? [...request.excludeGlobs] : undefined,
      });
      const messages = [
        ...baseMessages,
        `Adapter ${selected.adapterId} produced source inventory with ${inventory.files.length} files.`,
        `Inventory artifact path: ${artifactPath}`,
      ];
      if (eligibility.capabilityLevel === 'partial') {
        messages.push(
          'Source inventory capability is partial; downstream ranking signals should remain advisory-gated.'
        );
      }

      return {
        ok: true,
        mode: 'adapter-delegated',
        artifactPath,
        inventory,
        provenance: buildProvenance(request, 'adapter-delegated', eligibility),
        messages,
      };
    } catch (error) {
      const fallbackReason = `adapter source inventory delegation failed: ${
        error instanceof Error ? error.message : String(error)
      }`;
      const fallbackInventory = buildFallbackInventory(fallbackReason);
      return {
        ok: false,
        mode: 'generic-fallback',
        artifactPath,
        inventory: fallbackInventory,
        provenance: buildProvenance(request, 'generic-fallback', {
          ok: false,
          capabilityLevel: eligibility.capabilityLevel,
          reason: fallbackReason,
        }),
        messages: [
          ...baseMessages,
          `Falling back to generic source inventory because ${fallbackReason}.`,
          `Inventory artifact path: ${artifactPath}`,
        ],
      };
    }
  }

  const fallbackReason = `source inventory delegation unavailable: ${eligibility.reason}`;
  const fallbackInventory = buildFallbackInventory(fallbackReason);
  return {
    ok: false,
    mode: 'generic-fallback',
    artifactPath,
    inventory: fallbackInventory,
    provenance: buildProvenance(request, 'generic-fallback', eligibility),
    messages: [
      ...baseMessages,
      `Using generic source inventory fallback because ${eligibility.reason}.`,
      `Inventory artifact path: ${artifactPath}`,
    ],
  };
}

