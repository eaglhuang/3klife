---
doc_id: doc_other_0817
task_id: ATM-GOV-0116
title: Atomize and Infect Dry-Run Planning via LanguageAdapter
milestone: M3
status: done
blocked_by: [ATM-GOV-0114, ATM-GOV-0115]
depends_on: [ATM-GOV-0114, ATM-GOV-0115]
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
  - packages/cli/src/commands/upgrade.ts
  - packages/core/src/guidance/route-engine.ts
deliverables:
  - packages/cli/src/commands/upgrade.ts
  - packages/core/src/guidance/route-engine.ts
validators:
  - node atm.mjs upgrade --propose --behavior behavior.atomize --dry-run --json
  - node atm.mjs upgrade --propose --behavior behavior.infect --dry-run --json
  - npm run validate:guidance
  - npm run typecheck
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.language-adapter-dry-run-planning
  mapUpdates:
    - packages/cli/src/commands/upgrade.ts
    - packages/core/src/guidance/route-engine.ts
  extractionCandidates:
    - atom: atm.upgrade.atomize-infect-dry-run
      pattern: LanguageAdapter
      source: packages/cli/src/commands/upgrade.ts
      disposition: preserve
      inlineReason: legacy delivery reconcile
created_at: 2026-05-19T00:00:00+08:00
created_by_agent: codex-gpt-5
started_at: 2026-05-19T23:18:55+08:00
started_by_agent: codex-gpt-5.5
completed_at: 2026-05-19T23:55:38.2492514+08:00
completed_by_agent: codex-gpt-5.5
lastTransitionId: 2026-05-21T10-29-44-311Z-migrate-legacy-ledger-618ff34535b2
lastTransitionAt: 2026-05-21T10:29:44.311Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.311Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:3f02f21a0718cb54e1172482a92ac9f614577031459e9d8e25966b950aa73e87
---

# ATM-GOV-0116 Atomize and Infect Dry-Run Planning via LanguageAdapter

## Background

Dry-run planning for atomize/infect needs language-specific extraction while remaining non-mutating.
LanguageAdapter capabilities should define the safe planning contract.

## Outputs

1. Adapter-driven dry-run proposal generation for atomize/infect.
2. Evidence links to route plan, scope, and rollback expectations.
3. Explicit no-apply boundaries unless capability + evidence gates pass.

## Acceptance Criteria

- [x] Dry-run proposals contain language capability attribution.
- [x] Proposal generation does not mutate host source files.
- [x] Missing capabilities produce advisory-only fallback.

## Target Files

- `packages/cli/src/commands/upgrade.ts`
- `packages/core/src/guidance/route-engine.ts`

## Validation Commands

```bash
node atm.mjs upgrade --propose --behavior behavior.atomize --dry-run --json
node atm.mjs upgrade --propose --behavior behavior.infect --dry-run --json
```

## Notes

2026-05-19 | status: done | validation: `npm run validate:guidance` + `npm run typecheck` | change: confirmed atomize and infect dry-run planning remains adapter-attributed, non-mutating, and advisory-only when capability gaps are present in the isolated AI-Atomic-Framework worktree | blocker: none
2026-05-19 | status: open | validation: pending | change: formal card opened
