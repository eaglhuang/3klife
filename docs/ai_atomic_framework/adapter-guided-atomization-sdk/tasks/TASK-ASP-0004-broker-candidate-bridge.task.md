---
doc_id: doc_other_asp_0004
task_id: TASK-ASP-0004
title: Broker Candidate-to-WriteIntent Bridge
milestone: ASP-M1
status: done
blocked_by: []
owner: atm-core
related_plan: docs/ai_atomic_framework/atomic-cost-reduction-plan.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:broker
public_tracking: false
executionMode: planned-upstream-change
allowed_files:
  - packages/core/src/broker/candidate-bridge.ts
  - packages/core/src/broker/index.ts
  - packages/core/src/broker/__tests__/candidate-bridge.test.ts
  - docs/BROKER_GUIDE.md
forbidden_files:
  - packages/core/src/broker/decision.ts
  - packages/core/src/broker/proposal.ts
  - packages/core/src/broker/steward.ts
  - packages/plugin-sdk/src/language-adapter.ts
  - packages/language-js/**
  - packages/language-python/**
  - assets/**
  - library/**
non_goals:
  - Do not modify `decision.ts` conflict logic.
  - Do not modify `WriteIntent` schema (additive helpers only).
  - Do not invoke any LLM at conversion time.
  - Do not require knowledge of language-specific semantics.
created_at: 2026-06-10T00:00:00+08:00
created_by_agent: ClaudeCode_haiku-4-5
completed_at: "2026-06-11T11:02:34+08:00"
completed_by_agent: "historical-backfill"
closedAt: "2026-06-11T11:02:34+08:00"
closedByActor: "historical-backfill"
closedByCommand: "historical planning closeback backfill for TASK-CID-0125"
lastTransitionId: "2026-06-11T11-02-34+08-00-close-79e41a45b8ed"
lastTransitionAt: "2026-06-11T11:02:34+08:00"
ledgerContractVersion: "task-ledger/v1"
delivery_commit: "f40917f9ebe6961f8cb56ed13a0c16d9389e43ff"
---

# TASK-ASP-0004 Broker Candidate-to-WriteIntent Bridge

## Background

After ASP-0001/0002/0003, language adapters emit `AtomCandidate`. To feed broker's existing `calculateBrokerDecision()`, we need a convenience function that converts `AtomCandidate` + atomization context into a `WriteIntent`.

Currently callers must construct `WriteIntent` manually with `atomRefs`, `targetFiles`, `sharedSurfaces` — which is verbose and error-prone. This task provides a thin bridge function.

## Dependencies

- TASK-ASP-0001 (SDK contract for AtomCandidate)

## Inputs

- Existing broker `types.ts` and `decision.ts`
- New `AtomCandidate` schema from plugin-sdk

## Outputs

1. New file: `packages/core/src/broker/candidate-bridge.ts`
2. Function: `candidatesToWriteIntent(candidates, ctx): WriteIntent`
   - Input: `AtomCandidate[]`, context (taskId, actorId, baseCommit, optional sharedSurfaces)
   - Output: well-formed `WriteIntent` with deterministic atomId generation
3. `atomCid` generation: SHA-256 of canonical candidate contract `(kind || symbol || sortedSourcePaths || detectionMethod)`
4. `targetFiles` derived from candidate `filePath` + `suggestedSourcePaths`
5. `requestedLane: 'auto'` by default (broker decides)
6. Unit tests covering multiple candidates → single WriteIntent
7. Document in `docs/BROKER_GUIDE.md`

## Function Sketch

```typescript
export interface CandidateBridgeContext {
  readonly taskId: string;
  readonly actorId: string;
  readonly baseCommit: string;
  readonly sharedSurfaces?: Partial<SharedSurfacesRecord>;
}

export function candidatesToWriteIntent(
  candidates: readonly AtomCandidate[],
  ctx: CandidateBridgeContext
): WriteIntent {
  // 1. Derive atomRefs from candidates (atomId, atomCid, operation: 'create')
  // 2. Collect targetFiles from candidate.filePath + suggestedSourcePaths
  // 3. Apply default sharedSurfaces (empty arrays) unless overridden
  // 4. Return WriteIntent v1 schema
}
```

## Acceptance Criteria

- [x] `candidate-bridge.ts` is exported from `packages/core/src/broker/index.ts`
- [x] `candidatesToWriteIntent()` generates valid `WriteIntent` per schema
- [x] Deterministic atomCid: same candidate produces same atomCid across runs
- [x] Tests verify intersection with existing `calculateBrokerDecision()`: e.g., two candidates with same filePath produce `needs-physical-split` verdict
- [x] Bridge does not modify candidate input (read-only)
- [x] At least 3 test scenarios: parallel-safe, CID conflict, file overlap
- [x] No new external dependencies

## Validation

```bash
cd AI-Atomic-Framework
pnpm --filter @ai-atomic-framework/core build
pnpm --filter @ai-atomic-framework/core test
# Integration smoke
node atm.mjs broker simulate --candidates-from packages/language-js/test/fixtures --json
```

## Non-goals

- Not changing broker conflict logic (decision.ts stays)
- Not adding new verdict types
- Not addressing patch generation

## Notes / Decision Log

- 變更: AAF 交付 `14359be3`（candidate-bridge + BROKER_GUIDE）；治理收口 `ddb63675`
- 驗證: candidate-bridge 單元測試、typecheck 通過（AAF ledger `TASK-ASP-0004` done）
- 阻塞: 無
