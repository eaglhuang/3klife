---
doc_id: doc_atm_gov_0148
task_id: ATM-GOV-0148
title: "Project global governance resources into unified Broker admission"
status: done
owner: atm-core
priority: P0
milestone: GOVOPT-Foundation-Gate
depends_on: [ATM-GOV-0128, ATM-GOV-0137, ATM-GOV-0142]
related_plan: docs/ai_atomic_framework/governance-optimization/
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/core/src/broker/global-resource-projection.ts"
  - "packages/core/src/broker/candidate-bridge.ts"
  - "packages/core/src/broker/types.ts"
  - "packages/core/src/broker/__tests__/global-resource-projection.test.ts"
  - "packages/core/src/broker/__tests__/candidate-bridge.test.ts"
deliverables:
  - "packages/core/src/broker/global-resource-projection.ts"
  - "packages/core/src/broker/candidate-bridge.ts"
  - "packages/core/src/broker/__tests__/global-resource-projection.test.ts"
validators:
  - "node --strip-types packages/core/src/broker/__tests__/global-resource-projection.test.ts"
  - "node --strip-types packages/core/src/broker/__tests__/candidate-bridge.test.ts"
  - "node --strip-types packages/core/src/broker/__tests__/conflict-matrix.test.ts"
  - "npm run typecheck"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the global-resource projection and tests if admission parity regresses."
atomizationImpact:
  ownerAtomOrMap: "atm.broker-unified-admission-map"
  mapUpdates: []
  extractionCandidates: []
outOfScope:
  - "TASK-RFT-0037, TASK-RFT-0039, and any RFT source or test surface."
  - "release/atm-onefile/** and release/atm-root-drop/** artifact sync."
  - "Creating new lock semantics outside the Broker admission projection."
  - "Changing generated projection stewardship implementation beyond projection metadata."
completed_at: "2026-07-15T14:50:20.316Z"
completed_by_agent: "codex-gpt-5-5-captain"
closedAt: "2026-07-15T14:50:20.316Z"
closedByActor: "codex-gpt-5-5-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-15T14-50-20-316Z-close-d12b972beb33"
lastTransitionAt: "2026-07-15T14:50:20.316Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "120280daf516fe034e082185c69d2ca90f6ff15e"
---

# ATM-GOV-0148 - Project global governance resources into unified Broker admission

## Why

ATM-BUG-2026-07-15-202 showed that a second Captain can be blocked by
unmodeled global resources even when source files do not overlap. The fix must
not create five new locks. Existing global coordination mechanisms must project
into the single Broker admission surface.

## Acceptance

- Add a deterministic projection that maps global governance paths into the
  existing Broker shared-surface keyspace:
  - runner-sync/build as a coalescing steward generator.
  - release mirrors as release artifacts owned by the steward lane.
  - git index and branch commit queue as registries.
  - generated Markdown projections as projection surfaces.
- Connect candidate-to-intent conversion to this projection so normal write
  intents inherit the same resource model.
- The live RFT case is represented by a fixture: an active RFT Team surface and
  a second backlog item shard write must remain parallel-safe, while a second
  generated backlog projection rebuild must freeze on the projection key.
- A runner-sync/build request must freeze against another runner-sync/build
  request and report the steward generator key, proving it is coalesced through
  one lane instead of split into per-file locks.
- No TASK-RFT-0037 or TASK-RFT-0039 files are modified.

## Required Evidence

- `node --strip-types packages/core/src/broker/__tests__/global-resource-projection.test.ts`
- `node --strip-types packages/core/src/broker/__tests__/candidate-bridge.test.ts`
- `node --strip-types packages/core/src/broker/__tests__/conflict-matrix.test.ts`
- `npm run typecheck`
