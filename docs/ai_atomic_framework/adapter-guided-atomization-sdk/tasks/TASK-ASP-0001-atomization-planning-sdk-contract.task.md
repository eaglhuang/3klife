---
doc_id: doc_other_asp_0001
task_id: TASK-ASP-0001
title: AtomizationPlanningAdapter SDK Contract
milestone: ASP-M1
status: open
blocked_by: []
owner: atm-core
related_plan: docs/ai_atomic_framework/atomic-cost-reduction-plan.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:plugin-sdk
public_tracking: false
executionMode: planned-upstream-change
allowed_files:
  - packages/plugin-sdk/src/atomization-planning.ts
  - packages/plugin-sdk/src/index.ts
  - packages/plugin-sdk/test/atomization-planning.test.ts
  - docs/ADAPTER_GUIDE.md
forbidden_files:
  - packages/core/src/broker/**
  - packages/language-js/**
  - packages/language-python/**
  - assets/**
  - library/**
non_goals:
  - Do not modify existing LanguageAdapter interface (additive only).
  - Do not require AST parsing in the contract definition.
  - Do not implement candidate discovery for any specific language here.
  - Do not change broker decision logic.
created_at: 2026-06-10T00:00:00+08:00
created_by_agent: ClaudeCode_haiku-4-5
---

# TASK-ASP-0001 AtomizationPlanningAdapter SDK Contract

## Background

ATM core broker already supports CID conflict detection, shared surface coordination, and same-file CID-disjoint routing (see `packages/core/src/broker/decision.ts`). What is missing is an **optional SDK contract** for language adapters to:

1. Discover atom candidates from source files (function / class / module / route / command level)
2. Propose dry-run atomization plans for a selected candidate

The current `LanguageAdapter` interface only has `detectProjectProfile()` and `validateComputeAtom()`. Atomization-related logic exists only inside Python adapter as `planPythonAtomize()`, which is private and not reusable.

This task formalizes the contract as **optional** so existing adapters remain valid without implementing it.

## Inputs

- Existing `packages/plugin-sdk/src/language-adapter.ts` (44 LOC)
- Python adapter's private `planPythonAtomize()` as design reference
- Broker `WriteIntent` schema from `packages/core/src/broker/types.ts`

## Outputs

1. New file: `packages/plugin-sdk/src/atomization-planning.ts`
2. Export schemas:
   - `AtomCandidate` (kind, symbol, filePath, lineStart/lineEnd, confidence, detectionMethod, optional suggestedAtomId, suggestedSourcePaths, notes)
   - `AtomCandidateDiscoveryRequest` (sourceFiles, optional filters)
   - `AtomizationPlanRequest` (atomId, target candidate, sourceFiles, dryRun: true)
   - `AtomizationPlan` (atomId, dryRun: true, target, patchFiles, steps, evidenceRequired, rollbackNotes, messages)
   - `AtomizationPlanStep` (stepKind, description, optional patchHint)
3. Optional adapter interface: `AtomizationPlanningAdapter` with `discoverAtomCandidates()` and `planAtomize()`
4. Document the contract in `docs/ADAPTER_GUIDE.md`
5. Unit tests covering schema validation

## Schema Sketch

```typescript
export interface AtomCandidate {
  readonly candidateId: string;
  readonly kind: 'function' | 'class' | 'module' | 'route' | 'command' | 'schema' | 'unknown';
  readonly symbol: string;
  readonly filePath: string;
  readonly lineStart: number | null;
  readonly lineEnd: number | null;
  readonly confidence: 'high' | 'medium' | 'low';
  readonly detectionMethod: 'regex' | 'scanner' | 'compiler-api' | 'ast' | 'lsp' | 'llm-assisted';
  readonly suggestedAtomId?: string;
  readonly suggestedSourcePaths?: readonly string[];
  readonly notes?: readonly string[];
}

export interface AtomizationPlanningAdapter {
  discoverAtomCandidates(request: AtomCandidateDiscoveryRequest): Promise<readonly AtomCandidate[]> | readonly AtomCandidate[];
  planAtomize(request: AtomizationPlanRequest): Promise<AtomizationPlan> | AtomizationPlan;
}
```

## Acceptance Criteria

- [ ] `packages/plugin-sdk/src/atomization-planning.ts` exists and is exported from `index.ts`
- [ ] All five schemas are exported as types
- [ ] `AtomizationPlanningAdapter` is exported as optional interface
- [ ] Existing `LanguageAdapter` consumers are NOT broken (compile + tests pass)
- [ ] At least one unit test validates the schema shape
- [ ] `docs/ADAPTER_GUIDE.md` has a new section explaining when to implement this contract
- [ ] Document explicitly states: detection method may be regex / scanner / compiler-api / ast / lsp — none is mandatory

## Validation

```bash
cd AI-Atomic-Framework
pnpm install
pnpm --filter @ai-atomic-framework/plugin-sdk build
pnpm --filter @ai-atomic-framework/plugin-sdk test
node atm.mjs validate-sdk --json
```

## Non-goals

- Not implementing candidate discovery for JS / Python in this task (separate tasks ASP-0002, ASP-0003)
- Not modifying broker decision logic
- Not requiring all language adapters to implement the new interface

## Notes / Decision Log

- 變更: 待開工
- 驗證: 待補
- 阻塞: 無
