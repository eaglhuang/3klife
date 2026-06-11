---
doc_id: doc_other_asp_0002
task_id: TASK-ASP-0002
title: JS Adapter Candidate Discovery (Function + Class + Module)
milestone: ASP-M1
status: done
blocked_by: []
owner: atm-core
related_plan: docs/ai_atomic_framework/atomic-cost-reduction-plan.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:js-adapter
public_tracking: false
executionMode: planned-upstream-change
allowed_files:
  - packages/language-js/src/**
  - packages/language-js/test/**
  - packages/plugin-sdk/src/**
forbidden_files:
  - packages/core/src/broker/**
  - packages/language-python/**
  - assets/**
  - library/**
non_goals:
  - Do not introduce AST or LSP dependencies (no ts-morph, no typescript compiler API).
  - Do not implement the `planAtomize()` method in this task (defer to ASP-0004 or follow-up).
  - Do not modify the broker.
  - Do not lower confidence for legitimate ES module syntax.
created_at: 2026-06-10T00:00:00+08:00
created_by_agent: ClaudeCode_haiku-4-5
---

# TASK-ASP-0002 JS Adapter Candidate Discovery

## Background

JS adapter (`packages/language-js/`) currently scans imports and entrypoint exports but does not output function / class candidate lists. To enable broker-driven function-level parallelism, JS adapter must implement `discoverAtomCandidates()` from the new SDK contract (TASK-ASP-0001).

This task uses **only lightweight regex / line scanning**. AST or LSP integration is deferred to future work.

## Dependencies

- TASK-ASP-0001 (SDK contract must exist)

## Inputs

- Existing JS adapter: `packages/language-js/src/language-js-adapter.ts`
- New SDK schemas: `AtomCandidate`, `AtomCandidateDiscoveryRequest`
- Test fixtures of TS/JS source files (existing test corpus)

## Outputs

1. JS adapter implements `AtomizationPlanningAdapter.discoverAtomCandidates()`
2. Detection patterns:
   - `export function <name>(...)` → kind=`function`, confidence=`high`
   - `export default function <name>(...)` → kind=`function`, confidence=`high`
   - `export class <name>` → kind=`class`, confidence=`high`
   - `export const <name> = (...) =>` → kind=`function`, confidence=`medium`
   - `function <name>()` (non-exported, top-level) → kind=`function`, confidence=`low`
   - `module.exports.foo = ...` (CommonJS) → kind=`module`, confidence=`medium`
3. Output `AtomCandidate[]` with `detectionMethod: 'regex'` or `'scanner'`
4. Line range detection (best-effort: match opening bracket, balance counter for closing)
5. Suggest `suggestedAtomId` using pattern `ATM-JS-<short-hash-of-symbol>`
6. Unit tests with TS/JS fixtures

## Acceptance Criteria

- [x] `language-js-adapter.ts` exports an `AtomizationPlanningAdapter` implementation
- [x] `discoverAtomCandidates()` returns candidates for: exported functions, exported classes, arrow function consts, CommonJS exports
- [x] Confidence levels respect detection certainty (regex match → medium/high; deep heuristic → low)
- [x] No new external dependencies added to `package.json`
- [x] At least 5 fixture files tested with expected candidate counts
- [x] Existing `validateComputeAtom()` test suite still passes

## Validation

```bash
cd AI-Atomic-Framework
pnpm --filter @ai-atomic-framework/language-js build
pnpm --filter @ai-atomic-framework/language-js test
node atm.mjs candidates discover --include "packages/language-js/test/fixtures/**/*.ts" --json
```

## Non-goals

- Not implementing `planAtomize()` (separate task or ASP-0004 will cover bridge)
- Not adding type-aware analysis
- Not handling minified / bundled output

## Notes / Decision Log

- 變更: AAF 交付 `8a58d1d9`（scanner-based discoverAtomCandidates + 6 fixtures）；治理收口 `dc34dd4d`
- 驗證: `validate:language-js`、atomization-planning 單元測試通過（AAF ledger `TASK-ASP-0002` done）
- 阻塞: 無
