---
doc_id: doc_other_0806
task_id: ATM-GOV-0105
title: Git Governance and Commit Trailer Validation
milestone: M1
status: done
blocked_by: [ATM-GOV-0101, ATM-GOV-0102]
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
lastTransitionId: 2026-05-21T10-29-44-299Z-migrate-legacy-ledger-d972b2da5328
lastTransitionAt: 2026-05-21T10:29:44.299Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.299Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:dff6ed19e3004c39bfd9a090a49f5d84029220b0e88d103ba4bc3392b58df1fa
---

# ATM-GOV-0105 Git Governance and Commit Trailer Validation

## Background

Actor/claim ownership must align with git metadata.
Commit trailer enforcement gives deterministic traceability.

## Outputs

1. `atm git prepare` and `atm git check` governance checks.
2. Trailer contract (`ATM-Task`, `ATM-Actor`, `ATM-Claim`, `ATM-Evidence`).
3. Ownership consistency checks across actor, claim, lock, and commit author.

## Acceptance Criteria

- [x] Invalid actor/git identity fails check with explicit reason.
- [x] Trailer mismatch is detectable pre-merge.
- [x] Contract does not manage remote git credentials.

## Target Files

- `packages/cli/src/commands/git.ts`
- `docs/governance/git-governance-contract.md`

## Validation Commands

```bash
node atm.mjs git prepare --task ATM-GOV-0105 --actor <actor> --json
node atm.mjs git check --task ATM-GOV-0105 --actor <actor> --json
```

## Notes

2026-05-19 | status: done | validation: `npm run validate:governance-commands` + `npm run typecheck` | change: validated git prepare/check, trailer hints, and ownership alignment across actor registry, claim record, and repo-local git identity in the isolated AI-Atomic-Framework worktree | blocker: none
2026-05-19 | status: in-progress | validation: pending | change: locked by codex-gpt-5.5 for M1 git governance implementation pass in isolated AI-Atomic-Framework worktree | blocker: waiting on shared foundation updates
2026-05-19 | status: open | validation: pending | change: formal card opened
