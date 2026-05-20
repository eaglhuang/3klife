import type {
  AtomicMapDecompositionRequest,
  EquivalenceContractRequest,
  LanguageAdapterReport,
  LanguageAdapterV2,
  NormalizedSymbolId,
  RuntimeCommandRequest,
  SourceInventoryRequest,
} from '../../../plugin-sdk/src/language-adapter';
import { detectCSharpProjectProfile } from './csharp-profile';
import { scanCSharpSourceInventory } from './csharp-inventory';
import { parseCSharpDiagnostics } from './csharp-diagnostics';
import { planCSharpAtomizeDryRun, planCSharpInfectDryRun } from './csharp-dry-run';
import { detectCSharpRuntimeCommands } from './csharp-runtime';
import { buildCSharpAtomicMapDecomposition } from './csharp-map';
import { computeCSharpEquivalenceContract } from './csharp-equivalence';
import { buildCSharpLegacyRoutePlan } from './csharp-legacy-route';

function canonicalizeCSharpSymbol(rawSymbolId: string): string {
  return rawSymbolId
    .replace(/\\/g, '/')
    .replace(/::/g, '.')
    .replace(/\s+/g, '')
    .replace(/`[0-9]+/g, '')
    .replace(/global::/g, '')
    .replace(/[^a-z0-9_\.\:\#\@\(\)\[\]\/\?]/gi, '')
    .toLowerCase();
}

function normalizeCSharpSymbolId(rawSymbolId: string, filePath: string | undefined): NormalizedSymbolId {
  const normalizedSource = canonicalizeCSharpSymbol(rawSymbolId);
  const withFile = filePath ? `${filePath}#${normalizedSource}` : normalizedSource;
  return {
    normalized: canonicalizeCSharpSymbol(withFile),
    strategy: 'csharp-canonical-qualified-symbol',
  };
}

function validateCSharpComputeAtom(repositoryRoot: string): LanguageAdapterReport {
  const profile = detectCSharpProjectProfile(repositoryRoot);
  if (profile.confidence < 0.65) {
    return {
      ok: false,
      adapterId: 'csharp-future',
      contractVersion: 'v2',
      messages: [
        'C# project evidence is weak. Expected .sln/.csproj/.cs sources for feasibility mode.',
      ],
    };
  }
  return {
    ok: true,
    adapterId: 'csharp-future',
    contractVersion: 'v2',
    messages: [
      `C# profile accepted with confidence=${profile.confidence.toFixed(2)}.`,
      'Support level remains future feasibility mode with mixed capability maturity.',
    ],
  };
}

async function scanSourceInventory(request: SourceInventoryRequest) {
  return scanCSharpSourceInventory(request);
}

async function detectRuntimeCommands(request: RuntimeCommandRequest) {
  return detectCSharpRuntimeCommands(request);
}

async function buildAtomicMapDecomposition(request: AtomicMapDecompositionRequest) {
  return buildCSharpAtomicMapDecomposition(request);
}

function computeEquivalenceContract(request: EquivalenceContractRequest) {
  return computeCSharpEquivalenceContract(request);
}

export function createCSharpLanguageAdapter(): LanguageAdapterV2 {
  return csharpLanguageAdapterV2;
}

export const csharpLanguageAdapterV2: LanguageAdapterV2 = {
  adapterId: 'csharp-future',
  languageId: 'csharp',
  contractVersion: 'v2',
  capabilities: {
    sourceInventory: 'partial',
    symbolNormalization: 'full',
    legacyRoutePlanning: 'full',
    atomizeDryRun: 'partial',
    infectDryRun: 'partial',
    runtimeCommandDetection: 'partial',
    diagnosticsParsing: 'partial',
    equivalenceContract: 'partial',
    atomicMapDecomposition: 'full',
    dependencyGraph: 'partial',
    callGraph: 'full',
    artifactGraph: 'partial',
  },
  detectProjectProfile(repositoryRoot: string) {
    return detectCSharpProjectProfile(repositoryRoot);
  },
  validateComputeAtom(request) {
    return validateCSharpComputeAtom(request.repositoryRoot);
  },
  scanSourceInventory(request) {
    return scanSourceInventory(request);
  },
  normalizeSymbolId(request) {
    return normalizeCSharpSymbolId(request.rawSymbolId, request.filePath);
  },
  buildLegacyRoutePlan(request) {
    return buildCSharpLegacyRoutePlan(request);
  },
  parseDiagnostics(request) {
    return parseCSharpDiagnostics(request);
  },
  detectRuntimeCommands(request) {
    return detectRuntimeCommands(request);
  },
  planAtomizeDryRun(request) {
    return planCSharpAtomizeDryRun(request);
  },
  planInfectDryRun(request) {
    return planCSharpInfectDryRun(request);
  },
  buildAtomicMapDecomposition(request) {
    return buildAtomicMapDecomposition(request);
  },
  computeEquivalenceContract(request) {
    return computeEquivalenceContract(request);
  },
};
