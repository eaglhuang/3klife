---
doc_id: doc_other_0807
task_id: ATM-GOV-0106
title: Thin Guard Engine for Mutation and Git Checks
milestone: M1
status: done
blocked_by: [ATM-GOV-0102, ATM-GOV-0105]
owner: atm-core
related_plan: docs/ai_atomic_framework/gov-series-governance/ATM-GOV-Governance-Program-Plan.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:standard
public_tracking: false
executionMode: planned-upstream-change
created_at: 2026-05-19T00:00:00+08:00
created_by_agent: codex-gpt-5
started_at: 2026-05-19T23:18:55+08:00
started_by_agent: codex-gpt-5.5
completed_at: 2026-05-19T23:55:38.2492514+08:00
completed_by_agent: codex-gpt-5.5
lastTransitionId: 2026-05-21T10-29-44-301Z-migrate-legacy-ledger-3b336927480b
lastTransitionAt: 2026-05-21T10:29:44.301Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.301Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:e7256da83b76546c443cc91b96581cbdc084f45bad3d50668db351243f338ce4
---

# ATM-GOV-0106 Thin Guard Engine for Mutation and Git Checks

## Background

Editors differ in hook support, so guard logic must stay centralized and reusable.
Core guard should be thin, deterministic, and independent of editor runtime.

## Outputs

1. Guard execution profile for `mutation` and `git` checks.
2. Fail-open/fail-closed behavior with explicit policy boundaries.
3. Reusable CLI surface for integration plugins and CI.

## Acceptance Criteria

- [x] Guard API can validate claimed file scope.
- [x] Guard API can validate git-governance contract.
- [x] Hook and non-hook workflows use the same core guard behavior.

## Target Files

- `packages/cli/src/commands/guard.ts`
- `docs/governance/guard-engine-thin-profile.md`

## Validation Commands

```bash
node atm.mjs guard mutation --task ATM-GOV-0106 --actor <actor> --files <csv> --json
node atm.mjs guard git --task ATM-GOV-0106 --actor <actor> --json
```

## Notes

2026-05-19 | status: done | validation: `npm run validate:governance-commands` + `npm run typecheck` | change: validated thin mutation and git guards, fail-open behavior, and shared non-hook guard surface for integrations and CI in the isolated AI-Atomic-Framework worktree | blocker: none
2026-05-19 | status: in-progress | validation: pending | change: locked by codex-gpt-5.5 for M1 guard engine implementation pass in isolated AI-Atomic-Framework worktree | blocker: waiting on shared foundation updates
2026-05-19 | status: open | validation: pending | change: formal card opened
