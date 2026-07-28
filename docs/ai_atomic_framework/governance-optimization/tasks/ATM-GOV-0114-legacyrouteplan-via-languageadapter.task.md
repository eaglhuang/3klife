---
doc_id: doc_other_0815
task_id: ATM-GOV-0114
title: LegacyRoutePlan via LanguageAdapter
milestone: M3
status: done
blocked_by: [ATM-GOV-0113]
depends_on: [ATM-GOV-0113]
owner: atm-core
related_plan: docs/ai_atomic_framework/governance-optimization/ATM-GOV-Governance-Program-Plan.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
hostKind: upstream-framework
alphaGate: validate:guidance
public_tracking: false
executionMode: planned-upstream-change
scopePaths:
  - packages/core/src/guidance/legacy-route-plan.ts
  - packages/core/src/guidance/route-engine.ts
deliverables:
  - packages/core/src/guidance/legacy-route-plan.ts
  - packages/core/src/guidance/route-engine.ts
validators:
  - node --experimental-strip-types scripts/validate-guidance.ts --mode validate
  - node atm.mjs start --goal "legacy route plan test" --legacy-flow --json
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
created_at: 2026-05-19T00:00:00+08:00
created_by_agent: codex-gpt-5
started_at: 2026-05-19T23:18:55+08:00
started_by_agent: codex-gpt-5.5
completed_at: 2026-05-19T23:55:38.2492514+08:00
completed_by_agent: codex-gpt-5.5
lastTransitionId: "2026-07-18T04-41-47-854Z-close-ea941c808fce"
lastTransitionAt: 2026-05-21T10:29:44.308Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.308Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:93d0f2852bf305f19b8ffaae102047f6709379ac3c37f590b0c5dd1eaea6df11
---

# ATM-GOV-0114 LegacyRoutePlan via LanguageAdapter

## Background

Legacy route planning currently depends on language-specific parsing paths.
LanguageAdapter should provide the route-plan extraction contract.

## Outputs

1. Adapter-driven route-plan extraction API.
2. Unified evidence shape for legacy hotspots and release blockers.
3. Guidance integration for `start --legacy-flow`.

## Acceptance Criteria

- [x] Legacy route planning works via adapter capability calls.
- [x] Route evidence includes language adapter attribution.
- [x] Missing capability uses deterministic fallback.

## Target Files

- `packages/core/src/guidance/legacy-route-plan.ts`
- `packages/core/src/guidance/route-engine.ts`

## Validation Commands

```bash
node --experimental-strip-types scripts/validate-guidance.ts --mode validate
node atm.mjs start --goal "legacy route plan test" --legacy-flow --json
```

## Notes

2026-05-19 | status: done | validation: `npm run validate:guidance` + `npm run typecheck` | change: confirmed LegacyRoutePlan generation, adapter attribution, and `start --legacy-flow` guidance routing in the isolated AI-Atomic-Framework worktree | blocker: none
2026-05-19 | status: open | validation: pending | change: formal card opened
