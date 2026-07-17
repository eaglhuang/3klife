---
doc_id: doc_other_0810
task_id: ATM-GOV-0109
title: Claim Collision Proofing and Conflict Evidence Flow
milestone: M2
status: done
blocked_by: [ATM-GOV-0102, ATM-GOV-0108]
owner: atm-core
related_plan: docs/ai_atomic_framework/governance-optimization/ATM-GOV-Governance-Program-Plan.md
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
lastTransitionId: 2026-05-21T10-29-44-304Z-migrate-legacy-ledger-c2a4ce20de35
lastTransitionAt: 2026-05-21T10:29:44.304Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.304Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:17a07b566cb4971277b49d9ff0720b219a4859d7cf18920493725a4598ce740d
---

# ATM-GOV-0109 Claim Collision Proofing and Conflict Evidence Flow

## Background

Parallel actors may race to claim the same task or overlapping scopes.
Conflict handling must be deterministic and auditable.

## Outputs

1. Collision-safe claim checks and conflict reporting.
2. Takeover/override evidence requirements for disputed ownership.
3. Guidance for retry/backoff and operator escalation.

## Acceptance Criteria

- [x] Concurrent claim races produce a single winner.
- [x] Losing attempts get clear conflict evidence.
- [x] Takeover requires reason plus evidence.

## Target Files

- `packages/cli/src/commands/tasks.ts`
- `docs/governance/task-claim-lease-model.md`

## Validation Commands

```bash
node atm.mjs tasks claim --task ATM-GOV-0109 --actor <actor-a> --files <csv> --json
node atm.mjs tasks claim --task ATM-GOV-0109 --actor <actor-b> --files <csv> --json
```

## Notes

2026-05-19 | status: done | validation: `npm run validate:governance-commands` + `npm run typecheck` | change: validated single-winner claim conflicts, explicit-reason takeover, and takeover evidence trail preservation in the isolated AI-Atomic-Framework worktree | blocker: none
2026-05-19 | status: open | validation: pending | change: formal card opened
