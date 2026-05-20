<!-- doc_id: doc_other_0902 -->
# Universal Language Framework Plan

## 0. Purpose

This companion is an English adapter author guide for `LanguageAdapter v2`. It is not a translation of the Chinese roadmap.

The goal is simple: ATM core stays language-neutral, and each language adapter returns deterministic, evidence-backed facts for its own ecosystem.

Go is the main teaching example in this document. It is an advisory example only. This milestone does not declare Go as an official bundled adapter package.

## 1. Support Status Vocabulary

Use these labels when documenting a language:

| Status | Meaning | Example |
| --- | --- | --- |
| Official | A package exists in the repo, has validators, and can be resolved by policy. | Python after the Python adapter tasks are complete. |
| Advisory | The guide shows code and contracts, but no official package is delivered yet. | The Go examples in this document. |
| Future | Feasibility or risk notes only. Do not imply runtime support. | Java, C#, PHP, or future Go package work. |

Do not confuse those document statuses with SDK capability levels. SDK capabilities use `'full'`, `'partial'`, or `'none'`.

## 2. Mental Model

ATM core should not parse every language by itself. Core asks a language adapter for language-specific reports, then validates and routes those reports.

The adapter owns:

- project profile detection;
- source inventory;
- symbol normalization;
- dependency, call, and artifact evidence when available;
- runtime command detection;
- diagnostics parsing;
- legacy route planning;
- atomize and infect dry-run plans;
- atomic map decomposition when graph evidence is strong enough.

Core owns:

- SDK contracts and schemas;
- adapter discovery and resolution;
- guidance orchestration;
- police and evidence gates;
- CLI facade behavior;
- cross-language report consumption.

## 3. Minimal Package Shape

```text
packages/language-go/
  src/
    index.ts
    go-adapter.ts
    go-inventory.ts
    go-dry-run.ts
    go-diagnostics.ts
  fixtures/
    simple-module/
    diagnostics/
scripts/
  validate-language-go.ts
```

The package owns implementation. The validator and CLI are thin facades.

## 4. Adapter Identity And Exports

```ts
import type { LanguageAdapterV2 } from '@ai-atomic-framework/plugin-sdk';

export const GO_ADAPTER_ID = 'go-bundled';
export const GO_LANGUAGE_ID = 'go';

export function createGoLanguageAdapter(): LanguageAdapterV2 {
  return goLanguageAdapterV2;
}

export const goLanguageAdapterV2: LanguageAdapterV2 = {
  adapterId: GO_ADAPTER_ID,
  languageId: GO_LANGUAGE_ID,
  contractVersion: 'v2',
  capabilities: goCapabilities,
  detectProjectProfile,
  validateComputeAtom,
  scanSourceInventory,
  normalizeSymbolId,
  buildLegacyRoutePlan,
  planAtomizeDryRun,
  planInfectDryRun,
  detectRuntimeCommands,
  parseDiagnostics,
  computeEquivalenceContract,
  buildAtomicMapDecomposition,
};
```

The stable public export should be `createGoLanguageAdapter()` plus any report types that future validators need.

## 5. Capability Declaration

```ts
import type { LanguageAdapterCapabilitySet } from '@ai-atomic-framework/plugin-sdk';

export const goCapabilities: LanguageAdapterCapabilitySet = {
  sourceInventory: 'full',
  symbolNormalization: 'full',
  legacyRoutePlanning: 'partial',
  atomizeDryRun: 'full',
  infectDryRun: 'full',
  runtimeCommandDetection: 'full',
  diagnosticsParsing: 'full',
  equivalenceContract: 'partial',
  atomicMapDecomposition: 'partial',
  dependencyGraph: 'full',
  callGraph: 'partial',
  artifactGraph: 'partial',
};
```

Capability values must be honest:

- use `'full'` only when fixtures and validators cover the behavior;
- use `'partial'` when the report is useful but advisory-gated;
- use `'none'` when the adapter does not implement the method.

## 6. Complete TypeScript Go Adapter Example

This example follows the current SDK shapes. It is intentionally compact, but every method returns the current contract types.

```ts
import fs from 'node:fs';
import path from 'node:path';
import type {
  AtomicMapDecompositionReport,
  AtomicMapDecompositionRequest,
  DiagnosticsParseRequest,
  DiagnosticsReport,
  DryRunPlanReport,
  DryRunPlanRequest,
  EquivalenceContractRequest,
  EquivalenceContractReport,
  LanguageAdapterReport,
  LanguageAdapterV2,
  LanguageProjectProfile,
  LegacyRoutePlanReport,
  LegacyRoutePlanRequest,
  NormalizedSymbolId,
  NormalizeSymbolIdRequest,
  RuntimeCommandReport,
  RuntimeCommandRequest,
  SourceInventoryReport,
  SourceInventoryRequest,
  SourceRange,
  SymbolRef,
} from '@ai-atomic-framework/plugin-sdk';

export const GO_ADAPTER_ID = 'go-bundled';

export const goLanguageAdapterV2: LanguageAdapterV2 = {
  adapterId: GO_ADAPTER_ID,
  languageId: 'go',
  contractVersion: 'v2',
  capabilities: {
    sourceInventory: 'full',
    symbolNormalization: 'full',
    legacyRoutePlanning: 'partial',
    atomizeDryRun: 'full',
    infectDryRun: 'full',
    runtimeCommandDetection: 'full',
    diagnosticsParsing: 'full',
    equivalenceContract: 'partial',
    atomicMapDecomposition: 'partial',
    dependencyGraph: 'full',
    callGraph: 'partial',
    artifactGraph: 'partial',
  },
  detectProjectProfile,
  validateComputeAtom,
  scanSourceInventory,
  normalizeSymbolId,
  buildLegacyRoutePlan,
  planAtomizeDryRun,
  planInfectDryRun,
  detectRuntimeCommands,
  parseDiagnostics,
  computeEquivalenceContract,
  buildAtomicMapDecomposition,
};

export function createGoLanguageAdapter(): LanguageAdapterV2 {
  return goLanguageAdapterV2;
}

function detectProjectProfile(repositoryRoot: string): LanguageProjectProfile {
  const goModPath = path.join(repositoryRoot, 'go.mod');
  const hasGoMod = fs.existsSync(goModPath);
  return {
    languageId: 'go',
    profileId: hasGoMod ? 'go-module' : 'go-source',
    confidence: hasGoMod ? 0.95 : hasGoFiles(repositoryRoot) ? 0.7 : 0.1,
    evidence: hasGoMod ? ['go.mod'] : ['*.go'],
  };
}

function validateComputeAtom(request: { repositoryRoot: string }): LanguageAdapterReport {
  const profile = detectProjectProfile(request.repositoryRoot);
  return {
    ok: profile.confidence >= 0.7,
    adapterId: GO_ADAPTER_ID,
    contractVersion: 'v2',
    messages:
      profile.confidence >= 0.7
        ? ['Go project evidence accepted.']
        : ['Go project evidence is weak.'],
  };
}

function scanSourceInventory(request: SourceInventoryRequest): SourceInventoryReport {
  const files = collectGoFiles(request.repositoryRoot, request.includeGlobs, request.excludeGlobs);
  return {
    files: files.map((filePath) => ({
      filePath,
      languageId: 'go',
      symbols: scanGoSymbols(request.repositoryRoot, filePath),
    })),
    dependencyEdges: files.flatMap((filePath) => scanGoImports(request.repositoryRoot, filePath)),
    callEdges: files.flatMap((filePath) => scanGoCalls(request.repositoryRoot, filePath)),
    artifactEdges: [],
    warnings: [],
  };
}

function normalizeSymbolId(request: NormalizeSymbolIdRequest): NormalizedSymbolId {
  const filePath = request.filePath ? request.filePath.replace(/\\/g, '/') : 'unknown.go';
  return {
    normalized: `go://${filePath}#${request.rawSymbolId}`,
    strategy: 'go-file-symbol',
  };
}

function buildLegacyRoutePlan(request: LegacyRoutePlanRequest): LegacyRoutePlanReport {
  return {
    routeId: `go-route-${slug(request.intent)}`,
    steps: [
      { phase: 'inventory', description: 'Scan Go source inventory.' },
      { phase: 'rank', description: 'Rank packages and entrypoints with adapter evidence.' },
      { phase: 'dry-run', description: 'Build atomize or infect dry-run plan.' },
    ],
    warnings: [],
  };
}

function planAtomizeDryRun(request: DryRunPlanRequest): DryRunPlanReport {
  const entrypoint = request.entrypoint ?? 'cmd/app/main.go';
  return {
    operation: 'atomize',
    executionMode: 'dry-run',
    steps: [
      { stage: 'inventory', description: 'Collect Go source inventory.' },
      { stage: 'import-rewrite', description: 'Plan import rewrite into atom package.', filePath: entrypoint, subcontract: 'import-rewrite' },
      { stage: 'shim', description: 'Plan entrypoint-preserving shim.', filePath: entrypoint, subcontract: 'shim' },
      { stage: 'rollback', description: 'Record restore targets and rollback proof.', subcontract: 'rollback' },
    ],
    evidence: {
      planKind: 'atomize',
      requiredEvidence: ['go-source-inventory', 'go-test-report', 'go-rollback-plan'],
      proposalArtifacts: [
        { artifactId: 'go-atomize-plan', kind: 'dry-run-plan-report', path: 'artifacts/atm/go/atomize-plan.json', required: true },
      ],
      reviewGate: {
        gateId: 'go-atomize-dual-review',
        gateType: 'dual-review',
        required: true,
        reason: 'Go atomize dry-run must be reviewed before apply.',
      },
      importRewrite: {
        rewriteId: 'go-atomize-import-rewrite',
        filePath: entrypoint,
        fromImport: 'example.com/legacy/pkg',
        toImport: 'example.com/atoms/pkg',
      },
      shim: {
        shimId: 'go-atomize-entrypoint-shim',
        filePath: entrypoint,
        strategy: 'forwarding-wrapper',
        preservesEntrypoint: true,
      },
      rollback: {
        rollbackId: 'go-atomize-rollback',
        steps: ['restore imports', 'remove shim', 'rerun go test ./...'],
        restoreTargets: [entrypoint],
      },
      mutates: [],
    },
    warnings: ['Dry-run only. No Go files are modified.'],
  };
}

function planInfectDryRun(request: DryRunPlanRequest): DryRunPlanReport {
  const entrypoint = request.entrypoint ?? 'cmd/app/main.go';
  return {
    operation: 'infect',
    executionMode: 'dry-run',
    steps: [
      { stage: 'inventory', description: 'Collect Go source inventory.' },
      { stage: 'import-rewrite', description: 'Plan host import rewrite.', filePath: entrypoint, subcontract: 'import-rewrite' },
      { stage: 'shim', description: 'Plan host shim proxy.', filePath: entrypoint, subcontract: 'shim' },
      { stage: 'rollback', description: 'Record rollback proof.', subcontract: 'rollback' },
    ],
    evidence: {
      planKind: 'infect',
      requiredEvidence: ['go-source-inventory', 'go-infect-plan', 'rollback-proof'],
      proposalArtifacts: [
        { artifactId: 'go-infect-plan', kind: 'dry-run-plan-report', path: 'artifacts/atm/go/infect-plan.json', required: true },
      ],
      reviewGate: {
        gateId: 'go-infect-dual-review',
        gateType: 'dual-review',
        required: true,
      },
      importRewrite: {
        rewriteId: 'go-infect-import-rewrite',
        filePath: entrypoint,
        fromImport: 'example.com/host/pkg',
        toImport: 'example.com/host/pkg/atmshim',
      },
      shim: {
        shimId: 'go-infect-host-shim',
        filePath: entrypoint,
        strategy: 'host-shim-proxy',
        preservesEntrypoint: true,
      },
      rollback: {
        rollbackId: 'go-infect-rollback',
        steps: ['restore import path', 'remove shim proxy', 'rerun go test ./...'],
        restoreTargets: [entrypoint],
      },
      mutates: [],
    },
    warnings: ['Dry-run only. No Go files are modified.'],
  };
}

function detectRuntimeCommands(request: RuntimeCommandRequest): RuntimeCommandReport {
  const commands = [
    { commandId: 'go-test-all', command: 'go test ./...', category: 'test', mutates: false, confidence: 0.95 },
    { commandId: 'go-vet-all', command: 'go vet ./...', category: 'diagnostics', mutates: false, confidence: 0.9 },
    { commandId: 'go-build-all', command: 'go build ./...', category: 'build', mutates: false, confidence: 0.8 },
  ];
  return {
    commands: request.includeRisky ? commands : commands.filter((command) => !command.mutates),
    warnings: [],
  };
}

function parseDiagnostics(request: DiagnosticsParseRequest): DiagnosticsReport {
  return {
    diagnostics: request.rawDiagnostics.split(/\r?\n/).flatMap((line) => {
      const match = /^(.*\.go):(\d+):(\d+):\s*(.*)$/.exec(line.trim());
      if (!match) return [];
      return [{
        severity: 'error',
        message: match[4],
        location: {
          filePath: match[1],
          startLine: Number(match[2]),
          startColumn: Number(match[3]),
          endLine: Number(match[2]),
          endColumn: Number(match[3]),
        },
      }];
    }),
  };
}

function computeEquivalenceContract(request: EquivalenceContractRequest): EquivalenceContractReport {
  const accepted = ['inventory', 'dry-run', 'diagnostics'].every((token) =>
    request.expectedBehavior.toLowerCase().includes(token)
  );
  return {
    fixtureId: request.fixtureId,
    accepted,
    rationale: accepted
      ? 'Go equivalence fixture covers inventory, dry-run, and diagnostics.'
      : 'Go equivalence fixture is missing required behavior evidence.',
    evidencePaths: [`fixtures/language-go/${request.fixtureId}.json`],
  };
}

function buildAtomicMapDecomposition(request: AtomicMapDecompositionRequest): AtomicMapDecompositionReport {
  const inventory = request.sourceInventory ?? scanSourceInventory({ repositoryRoot: request.repositoryRoot });
  const members = inventory.files.map((file) => ({ atomId: `go.file:${file.filePath}`, title: file.filePath }));
  const edges = [
    ...(request.dependencyEdges ?? inventory.dependencyEdges ?? []).map((edge) => ({ ...edge, graphKind: 'dependency' as const })),
    ...(request.callEdges ?? inventory.callEdges ?? []).map((edge) => ({ ...edge, graphKind: 'call' as const })),
    ...(request.artifactEdges ?? inventory.artifactEdges ?? []).map((edge) => ({ ...edge, graphKind: 'artifact' as const })),
  ];
  return {
    mapId: request.mapId,
    members,
    edges,
    entrypoints: inventory.files
      .filter((file) => /(^|\/)main\.go$/.test(file.filePath))
      .map((file) => ({ entrypointId: `go.file:${file.filePath}`, reason: 'main.go entrypoint', evidence: file.filePath })),
    graphSummary: {
      dependencyEdgeCount: edges.filter((edge) => edge.graphKind === 'dependency').length,
      callEdgeCount: edges.filter((edge) => edge.graphKind === 'call').length,
      artifactEdgeCount: edges.filter((edge) => edge.graphKind === 'artifact').length,
      totalEdgeCount: edges.length,
    },
    evidenceGate: {
      accepted: members.length > 0,
      requiredEvidence: ['go-source-inventory', 'go-graph-report'],
      missing: members.length > 0 ? [] : ['members<1'],
      messages: members.length > 0 ? ['Go map evidence accepted.'] : ['Go map evidence missing members.'],
    },
  };
}

function collectGoFiles(repositoryRoot: string, includeGlobs?: string[], excludeGlobs?: string[]): string[] {
  void includeGlobs;
  void excludeGlobs;
  const root = path.resolve(repositoryRoot);
  const result: string[] = [];
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || !fs.existsSync(current)) continue;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name === '.git' || entry.name === 'vendor') continue;
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolutePath);
      } else if (entry.name.endsWith('.go')) {
        result.push(path.relative(root, absolutePath).replace(/\\/g, '/'));
      }
    }
  }
  return result.sort();
}

function scanGoSymbols(repositoryRoot: string, filePath: string): SymbolRef[] {
  const source = fs.readFileSync(path.join(repositoryRoot, filePath), 'utf8');
  return source.split(/\r?\n/).flatMap((line, index) => {
    const match = /^func\s+(?:\([^)]+\)\s*)?([A-Za-z_]\w*)\s*\(/.exec(line.trim());
    if (!match) return [];
    const range: SourceRange = {
      filePath,
      startLine: index + 1,
      startColumn: Math.max(0, line.indexOf(match[1])),
      endLine: index + 1,
      endColumn: line.length,
    };
    return [{ symbolId: `go://${filePath}#${match[1]}`, displayName: match[1], kind: 'function', range }];
  });
}

function scanGoImports(repositoryRoot: string, filePath: string) {
  const source = fs.readFileSync(path.join(repositoryRoot, filePath), 'utf8');
  return source.split(/\r?\n/).flatMap((line, index) => {
    const match = /^\s*import\s+"([^"]+)"/.exec(line);
    if (!match) return [];
    return [{ from: filePath, to: `module:${match[1]}`, relation: 'imports', evidence: `${filePath}:${index + 1}` }];
  });
}

function scanGoCalls(repositoryRoot: string, filePath: string) {
  const source = fs.readFileSync(path.join(repositoryRoot, filePath), 'utf8');
  return source.split(/\r?\n/).flatMap((line, index) => {
    const match = /\b([A-Za-z_]\w*)\s*\(/.exec(line);
    if (!match || match[1] === 'func') return [];
    return [{ from: filePath, to: `symbol:${match[1]}`, relation: 'calls', evidence: `${filePath}:${index + 1}` }];
  });
}

function hasGoFiles(repositoryRoot: string): boolean {
  return collectGoFiles(repositoryRoot).length > 0;
}

function slug(text: string): string {
  return text.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'default';
}
```

## 7. Atom And Map Development Example

A language adapter should not become one large script. Split it into capability atoms:

| Atom | Responsibility | Primary Evidence |
| --- | --- | --- |
| `go.detectProjectProfile` | Detect `go.mod` and Go source roots without executing Go. | profile evidence |
| `go.scanSourceInventory` | Return files, symbols, ranges, and graph edges. | source inventory |
| `go.normalizeSymbolId` | Produce stable `go://file#symbol` ids. | symbol normalization |
| `go.planAtomizeDryRun` | Build dry-run extraction, shim, rollback, and evidence plan. | dry-run report |
| `go.planInfectDryRun` | Build host injection dry-run plan without mutation. | dry-run report |
| `go.parseDiagnostics` | Convert Go diagnostic text into SDK diagnostics. | diagnostics report |

The map table must include members, edges, and entrypoints:

```yaml
mapId: ATM-MAP-LANG-GO-REFERENCE
members:
  - atomId: go.detectProjectProfile
    title: Detect Go project profile
  - atomId: go.scanSourceInventory
    title: Scan Go source inventory
  - atomId: go.planAtomizeDryRun
    title: Plan Go atomize dry-run
  - atomId: go.parseDiagnostics
    title: Parse Go diagnostics
edges:
  - from: go.detectProjectProfile
    to: go.scanSourceInventory
    relation: profile-selects-source-roots
    graphKind: dependency
  - from: go.scanSourceInventory
    to: go.planAtomizeDryRun
    relation: inventory-provides-symbols-and-entrypoints
    graphKind: call
  - from: go.parseDiagnostics
    to: go.planAtomizeDryRun
    relation: diagnostics-can-block-unsafe-extraction
    graphKind: artifact
entrypoints:
  - entrypointId: go.detectProjectProfile
    reason: adapter starts by proving project identity
    evidence: go.mod or *.go files
```

This is the human-readable form of `ATM-LANG-TABLE-0008`. Any script-produced graph table must be registered in the Chinese master plan before it appears in artifacts.

## 8. Validator Thin Facade

The validator calls adapter code and checks reports. It must not reimplement Go scanning, Go dry-run planning, or diagnostics parsing.

```ts
import assert from 'node:assert/strict';
import { createGoLanguageAdapter } from '../packages/language-go/src/index';

async function main(): Promise<void> {
  const adapter = createGoLanguageAdapter();
  const repositoryRoot = 'fixtures/language-go/simple-module';

  assert.equal(adapter.adapterId, 'go-bundled');
  assert.equal(adapter.languageId, 'go');
  assert.equal(adapter.contractVersion, 'v2');
  assert.equal(adapter.capabilities?.sourceInventory, 'full');
  assert.equal(adapter.capabilities?.atomizeDryRun, 'full');

  const inventory = await adapter.scanSourceInventory?.({ repositoryRoot });
  assert.ok(inventory);
  assert.ok(inventory.files.length > 0);

  const atomizePlan = await adapter.planAtomizeDryRun?.({
    repositoryRoot,
    operation: 'atomize',
    atomId: 'go.example.extract',
    entrypoint: 'cmd/example/main.go',
  });
  assert.equal(atomizePlan?.executionMode, 'dry-run');
  assert.deepEqual(atomizePlan?.evidence.mutates, []);
  assert.ok(atomizePlan?.evidence.rollback.restoreTargets.length);

  const diagnostics = await adapter.parseDiagnostics?.({
    rawDiagnostics: 'cmd/example/main.go:12:5: undefined: run',
    source: 'go test',
  });
  assert.equal(diagnostics?.diagnostics[0]?.severity, 'error');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

Validator ownership rules:

- one validator script may orchestrate the package;
- adapter package owns all language parsing logic;
- fixtures should cover success and failure;
- failure messages should name the missing method, capability, or evidence.

## 9. Acceptance Checklist For Future Adapters

- The adapter is assignable to `LanguageAdapterV2`.
- `adapterId`, `languageId`, and `contractVersion` are stable.
- Capability declarations match real methods and fixture coverage.
- `scanSourceInventory()` returns file, symbol, range, and graph evidence when available.
- `planAtomizeDryRun()` and `planInfectDryRun()` always return `executionMode: 'dry-run'`.
- Dry-run reports keep `evidence.mutates: []` until an apply task exists.
- Runtime command detection does not install dependencies or execute host code.
- Diagnostics parsing is fixture-backed and deterministic.
- `buildAtomicMapDecomposition()` lists members, edges, entrypoints, and evidence gate state.
- CLI and validators are thin facades over adapter package logic.
- Docs clearly separate official, advisory, and future support.

## 10. Tables Produced By The Plan

The Chinese master plan owns the canonical `ATM-LANG-TABLE-*` registry and classifies tables into `Core Required` and `Optional Extension`.

| Table ID | Level | English Companion Role | Activation Rule |
| --- | --- | --- | --- |
| ATM-LANG-TABLE-0006 | Optional Extension | Adapter capability matrix language for future adapters. | Enabled when adapter capability comparison is in scope. |
| ATM-LANG-TABLE-0007 | Optional Extension | Dry-run evidence, rollback, and mutation-free proposal rules. | Enabled when dry-run governance reporting is in scope. |
| ATM-LANG-TABLE-0008 | Core Required | Atomic map members, edges, and entrypoints examples. | Always maintained. |
| ATM-LANG-TABLE-0009 | Core Required | Validator ownership and failure-mode examples. | Always maintained. |
| ATM-LANG-TABLE-0010 | Optional Extension | Official, advisory, and future adapter positioning. | Enabled when future-language roadmap content is in scope. |

Any validator/script-produced table added to this companion must first be registered in the Chinese master plan section `5.1`.

