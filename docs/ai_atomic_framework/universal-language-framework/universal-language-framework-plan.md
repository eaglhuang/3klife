<!-- doc_id: doc_other_0902 -->
# Universal Language Framework Plan

## 0. Purpose

This companion document explains how a new programming language joins ATM through `LanguageAdapter v2`. It is intentionally written as an adapter author guide, not as a translated roadmap.

The main example language is Go. Go is used here because it has clear module metadata, build/test commands, package boundaries, and static source structure. This guide does not declare Go as an official bundled adapter for this milestone; it demonstrates how a future adapter should be shaped.

## 1. Mental Model

ATM core should not parse every language by itself. Core asks a language adapter for language-specific facts, and the adapter returns machine-readable reports with evidence.

The adapter owns:

- project profile detection;
- source inventory;
- symbol normalization;
- runtime command detection;
- diagnostics parsing;
- legacy route planning;
- atomize / infect dry-run plans;
- atomic map decomposition when the adapter has enough graph evidence.

Core owns:

- contract validation;
- adapter resolution;
- guidance orchestration;
- police and evidence gates;
- CLI facade behavior;
- cross-language report consumption.

## 2. Minimal Package Shape

```text
packages/language-go/
  package.json
  src/
    index.ts
    language-go-adapter.ts
    go-inventory.ts
    go-dry-run.ts
    go-diagnostics.ts
  fixtures/
    simple-module/
    multi-command/
  README.md
scripts/
  validate-language-go.ts
```

The public `index.ts` should export the adapter factory and stable report types. Internal modules can be atomized by capability, but the CLI should only call the validator or adapter package, not duplicate adapter logic.

## 3. Adapter Identity And Exports

```ts
import type { LanguageAdapterV2 } from '@ai-atomic-framework/plugin-sdk';

export const goLanguageAdapterPackage = {
  packageName: '@ai-atomic-framework/language-go',
  packageRole: 'go-language-adapter',
  packageVersion: '0.0.0'
} as const;

export interface GoLanguageAdapter extends LanguageAdapterV2<
  GoProjectProfile,
  GoValidationRequest,
  GoValidationReport
> {
  readonly adapterName: '@ai-atomic-framework/language-go';
  readonly languageIds: readonly ['go'];
  readonly contractVersion: 'v2';
}

export {
  createGoLanguageAdapter,
  detectGoProjectProfile,
  scanGoSourceInventory,
  normalizeGoSymbolId,
  planGoAtomizeDryRun,
  planGoInfectDryRun,
  parseGoDiagnostics
} from './language-go-adapter.ts';
```

## 4. Capabilities

```ts
export const goLanguageCapabilities = {
  sourceInventory: true,
  symbolNormalization: true,
  legacyRoutePlanning: true,
  atomizeDryRun: true,
  infectDryRun: true,
  runtimeCommandDetection: true,
  diagnosticsParsing: true,
  equivalenceContract: false,
  atomicMapDecomposition: 'advisory',
  dependencyGraph: true,
  callGraph: 'advisory',
  artifactGraph: false
} as const;
```

Capability values should be honest. If an adapter cannot provide precise call graph evidence yet, it should report `advisory` instead of pretending to support a hard gate.

## 5. Complete TypeScript Example

```ts
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type {
  DiagnosticsParseRequest,
  DiagnosticsReport,
  DryRunPlanReport,
  LanguageAdapterV2,
  LegacyRoutePlanReport,
  RuntimeCommandReport,
  SourceInventoryReport
} from '@ai-atomic-framework/plugin-sdk';

export interface GoProjectProfile {
  readonly hasGoMod: boolean;
  readonly modulePath: string | null;
  readonly commands: {
    readonly test: string;
    readonly vet: string;
    readonly build: string;
  };
}

export interface GoValidationRequest {
  readonly atomId: string;
  readonly entrypoint: string;
  readonly sourceFiles: readonly GoSourceFile[];
}

export interface GoSourceFile {
  readonly filePath: string;
  readonly sourceText: string;
}

export interface GoValidationReport {
  readonly ok: boolean;
  readonly messages: readonly GoAdapterMessage[];
  readonly inventory: SourceInventoryReport;
}

export interface GoAdapterMessage {
  readonly level: 'info' | 'warning' | 'error';
  readonly code: string;
  readonly text: string;
  readonly filePath?: string;
  readonly line?: number;
}

export function createGoLanguageAdapter(): LanguageAdapterV2<
  GoProjectProfile,
  GoValidationRequest,
  GoValidationReport
> {
  return {
    adapterName: '@ai-atomic-framework/language-go',
    languageIds: ['go'],
    contractVersion: 'v2',
    capabilities: {
      sourceInventory: true,
      symbolNormalization: true,
      legacyRoutePlanning: true,
      atomizeDryRun: true,
      infectDryRun: true,
      runtimeCommandDetection: true,
      diagnosticsParsing: true,
      equivalenceContract: false,
      atomicMapDecomposition: 'advisory',
      dependencyGraph: true,
      callGraph: 'advisory',
      artifactGraph: false
    },

    detectProjectProfile(repositoryRoot) {
      return detectGoProjectProfile(repositoryRoot);
    },

    validateComputeAtom(request) {
      const inventory = scanGoSourceInventory({ sourceFiles: request.sourceFiles });
      const hasEntrypoint = request.sourceFiles.some((file) => normalizePath(file.filePath) === normalizePath(request.entrypoint));
      return {
        ok: hasEntrypoint,
        messages: hasEntrypoint
          ? [{ level: 'info', code: 'ATM_GO_VALIDATE_OK', text: 'Go compute atom passed adapter checks.' }]
          : [{ level: 'error', code: 'ATM_GO_ENTRYPOINT_MISSING', text: 'Entrypoint source file was not provided.', filePath: request.entrypoint }],
        inventory
      };
    },

    scanSourceInventory(request) {
      return scanGoSourceInventory(request);
    },

    normalizeSymbolId(request) {
      return normalizeGoSymbolId(request);
    },

    buildLegacyRoutePlan(request) {
      return buildGoLegacyRoutePlan(request);
    },

    planAtomizeDryRun(request) {
      return planGoAtomizeDryRun(request);
    },

    planInfectDryRun(request) {
      return planGoInfectDryRun(request);
    },

    detectRuntimeCommands(request) {
      return detectGoRuntimeCommands(request.repositoryRoot);
    },

    parseDiagnostics(request) {
      return parseGoDiagnostics(request);
    }
  };
}

export function detectGoProjectProfile(repositoryRoot: string): GoProjectProfile {
  const goModPath = path.join(repositoryRoot, 'go.mod');
  const hasGoMod = existsSync(goModPath);
  const modulePath = hasGoMod ? readGoModulePath(goModPath) : null;
  return {
    hasGoMod,
    modulePath,
    commands: {
      test: 'go test ./...',
      vet: 'go vet ./...',
      build: 'go build ./...'
    }
  };
}

export function scanGoSourceInventory(request: { readonly sourceFiles: readonly GoSourceFile[] }): SourceInventoryReport {
  const files = request.sourceFiles.filter((file) => file.filePath.endsWith('.go'));
  return {
    languageId: 'go',
    files: files.map((file) => ({
      filePath: file.filePath,
      symbols: scanGoSymbols(file),
      imports: scanGoImports(file)
    })),
    evidence: [{
      evidenceKind: 'source-inventory',
      summary: `Scanned ${files.length} Go source files.`,
      artifactPaths: files.map((file) => file.filePath)
    }]
  };
}

export function normalizeGoSymbolId(request: { readonly packagePath?: string; readonly symbolName: string }): string {
  const packagePath = request.packagePath ? request.packagePath.replace(/\\/g, '/') : 'main';
  return `go://${packagePath}#${request.symbolName}`;
}

export function buildGoLegacyRoutePlan(request: { readonly entrypoint: string; readonly goal?: string }): LegacyRoutePlanReport {
  return {
    routeKind: 'adapter-delegated',
    languageId: 'go',
    entrypoint: request.entrypoint,
    recommendedNextCommand: `atm candidates rank --include "**/*.go" --goal "${request.goal ?? 'Assess Go legacy entrypoint'}" --json`,
    messages: [{ level: 'info', code: 'ATM_GO_ROUTE_PLAN', text: 'Go route planning delegated to language-go adapter.' }]
  };
}

export function planGoAtomizeDryRun(request: { readonly atomId: string; readonly entrypoint: string }): DryRunPlanReport {
  return {
    executionMode: 'dry-run',
    planKind: 'atomize',
    atomId: request.atomId,
    mutates: [],
    steps: [
      { stepKind: 'extract-unit', description: `Extract Go unit from ${request.entrypoint}.`, filePath: request.entrypoint },
      { stepKind: 'wire-host-shim', description: 'Keep the original package entrypoint callable through a forwarding shim.', filePath: request.entrypoint },
      { stepKind: 'evidence-required', description: 'Require go test ./... and source inventory evidence before apply.' }
    ],
    evidenceRequired: ['go-test-report', 'go-source-inventory']
  };
}

export function planGoInfectDryRun(request: { readonly atomId: string; readonly hostEntrypoint: string }): DryRunPlanReport {
  return {
    executionMode: 'dry-run',
    planKind: 'infect',
    atomId: request.atomId,
    mutates: [],
    steps: [
      { stepKind: 'import-rewrite', description: 'Plan import rewrite from host package to atom package.', filePath: request.hostEntrypoint },
      { stepKind: 'rollback-plan', description: 'Record the previous import path and shim location for rollback.' }
    ],
    evidenceRequired: ['go-test-report', 'rollback-proof']
  };
}

export function detectGoRuntimeCommands(repositoryRoot: string): RuntimeCommandReport {
  const profile = detectGoProjectProfile(repositoryRoot);
  return {
    languageId: 'go',
    commands: [
      { commandKind: 'test', command: profile.commands.test, required: true },
      { commandKind: 'lint', command: profile.commands.vet, required: false },
      { commandKind: 'build', command: profile.commands.build, required: false }
    ]
  };
}

export function parseGoDiagnostics(request: DiagnosticsParseRequest): DiagnosticsReport {
  return {
    languageId: 'go',
    diagnostics: request.output.split(/\r?\n/).flatMap((line) => {
      const match = /^(.*\.go):(\d+):(\d+):\s*(.*)$/.exec(line);
      if (!match) return [];
      return [{
        filePath: match[1],
        line: Number(match[2]),
        column: Number(match[3]),
        severity: 'error',
        message: match[4],
        source: 'go'
      }];
    })
  };
}

function readGoModulePath(goModPath: string): string | null {
  const source = readFileSync(goModPath, 'utf8');
  const match = /^module\s+(.+)$/m.exec(source);
  return match ? match[1].trim() : null;
}

function scanGoSymbols(file: GoSourceFile) {
  return file.sourceText.split(/\r?\n/).flatMap((line, index) => {
    const match = /^func\s+(?:\([^)]+\)\s*)?([A-Za-z_]\w*)\s*\(/.exec(line);
    return match ? [{ symbolId: normalizeGoSymbolId({ symbolName: match[1] }), name: match[1], range: { startLine: index + 1, endLine: index + 1 } }] : [];
  });
}

function scanGoImports(file: GoSourceFile) {
  return file.sourceText.split(/\r?\n/).flatMap((line, index) => {
    const match = /^\s*import\s+"([^"]+)"/.exec(line);
    return match ? [{ specifier: match[1], line: index + 1 }] : [];
  });
}

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}
```

## 6. Atom And Map Development Example

A Go adapter should not be one large script. Split it into atoms by capability:

| Atom | Responsibility |
| --- | --- |
| `go.detectProjectProfile` | Read `go.mod` and command conventions without executing Go code. |
| `go.scanSourceInventory` | Extract files, packages, imports, symbols, and ranges. |
| `go.normalizeSymbolId` | Produce stable `go://package#symbol` ids. |
| `go.planAtomizeDryRun` | Produce extraction, shim, rollback, and evidence steps. |
| `go.parseDiagnostics` | Convert `go test` / `go vet` output into common diagnostics. |

The atomic map ties those atoms together:

```yaml
mapId: ATM-MAP-LANG-GO-REFERENCE
members:
  - atomId: go.detectProjectProfile
  - atomId: go.scanSourceInventory
  - atomId: go.normalizeSymbolId
  - atomId: go.planAtomizeDryRun
  - atomId: go.parseDiagnostics
edges:
  - from: go.detectProjectProfile
    to: go.scanSourceInventory
    reason: profile selects source roots
  - from: go.scanSourceInventory
    to: go.planAtomizeDryRun
    reason: dry-run planning needs symbols and entrypoints
  - from: go.parseDiagnostics
    to: go.planAtomizeDryRun
    reason: diagnostics can block unsafe extraction
```

## 7. Validator Thin Facade

```ts
import { createGoLanguageAdapter } from '../packages/language-go/src/index.ts';
import { loadFixtureSourceFiles, fail } from './validator-utils.ts';

const adapter = createGoLanguageAdapter();

if (adapter.adapterName !== '@ai-atomic-framework/language-go') {
  fail('language-go adapter identity mismatch.');
}

if (!adapter.capabilities?.sourceInventory || !adapter.capabilities?.atomizeDryRun) {
  fail('language-go must declare sourceInventory and atomizeDryRun capabilities.');
}

const sourceFiles = loadFixtureSourceFiles('fixtures/language-go/simple-module');
const inventory = await adapter.scanSourceInventory?.({ sourceFiles });
if (!inventory || inventory.files.length === 0) {
  fail('language-go inventory fixture must produce files.');
}

const plan = await adapter.planAtomizeDryRun?.({
  atomId: 'go.example.extract',
  entrypoint: 'cmd/example/main.go',
  sourceFiles
});

if (!plan || plan.executionMode !== 'dry-run' || plan.mutates.length !== 0) {
  fail('language-go atomize planning must be dry-run only.');
}
```

The validator is a facade. It should call adapter implementation and inspect reports. It should not reimplement Go scanning or dry-run planning inside `scripts/validate-language-go.ts`.

## 8. Acceptance Checklist For Any Future Adapter

- The adapter remains assignable to the SDK `LanguageAdapter v2` type.
- Capability declarations match real implemented methods and fixtures.
- Source inventory returns stable file, symbol, range, and import data.
- Dry-run plans report `mutates: []` and list evidence requirements.
- Runtime command detection never installs dependencies or executes host code.
- Diagnostics parsing is deterministic and fixture-backed.
- CLI commands call package logic as thin facades.
- Docs state supported, advisory, and unsupported capabilities plainly.

## 9. Tables Produced By The Plan

The Chinese master plan owns the canonical `ATM-LANG-TABLE-*` registry and classifies tables into `Core Required` and `Optional Extension`.  
Core Required tables are always maintained (`0002`, `0003`, `0008`, `0009`). Optional Extension tables are produced only when the related scope is enabled.

| Table ID | Level | English Companion Role | Activation Rule |
| --- | --- | --- | --- |
| ATM-LANG-TABLE-0008 | Core Required | Shows how a future adapter decomposes capability atoms into an atomic map. | Always maintained. |
| ATM-LANG-TABLE-0006 | Optional Extension | Provides the adapter capability matrix language used by future adapter guides. | Enabled when adapter capability comparison is in scope. |
| ATM-LANG-TABLE-0007 | Optional Extension | Explains dry-run evidence requirements for atomize / infect proposals. | Enabled when dry-run governance reporting is in scope. |
| ATM-LANG-TABLE-0010 | Optional Extension | Separates official support, advisory examples, and future feasibility notes. | Enabled when future-language roadmap content is in scope. |

Any validator/script-produced table added to this companion must first be registered in the Chinese master plan section `5.1`.
