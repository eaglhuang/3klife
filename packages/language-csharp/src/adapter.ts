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

function normalizeCSharpSymbolId(rawSymbolId: string, filePath: string | undefined): NormalizedSymbolId {
  const normalizedSource = rawSymbolId.replace(/::/g, '.').replace(/\s+/g, '');
  const withFile = filePath ? `${filePath}#${normalizedSource}` : normalizedSource;
  return {
    normalized: withFile.toLowerCase(),
    strategy: 'csharp-lowercase-qualified-symbol',
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
      'Support level remains future/partial and dry-run only.',
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
    symbolNormalization: 'partial',
    legacyRoutePlanning: 'none',
    atomizeDryRun: 'partial',
    infectDryRun: 'partial',
    runtimeCommandDetection: 'partial',
    diagnosticsParsing: 'partial',
    equivalenceContract: 'partial',
    atomicMapDecomposition: 'partial',
    dependencyGraph: 'partial',
    callGraph: 'partial',
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
