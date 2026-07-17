---
doc_id: doc_other_0802
task_id: ATM-GOV-0101
title: Actor Identity Registry and Git Identity Contract
milestone: M1
status: done
blocked_by: []
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
lastTransitionId: 2026-05-21T10-29-44-295Z-migrate-legacy-ledger-12cda52e9d5c
lastTransitionAt: 2026-05-21T10:29:44.295Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.295Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:3ef12a4162af7eff8a8163dc870f5769131579515b4e876dcf91f6cfcf22a2b0
---

# ATM-GOV-0101 Actor Identity Registry and Git Identity Contract

## Background

ATM needs a neutral actor model for humans, AI agents, and automation services.
Git author identity and ATM actor identity must be explicitly aligned.

## Outputs

1. Actor registry schema and CLI operations (`register`, `list`, `resolve`, `verify-git`).
2. `ATM_ACTOR_ID` contract and `AGENT_IDENTITY` compatibility alias.
3. Deterministic git identity verification evidence.

## Acceptance Criteria

- [x] Actor kinds support `human`, `ai-agent`, and `automation`.
- [x] Git name/email mismatch is detectable and actionable.
- [x] CLI emits machine-readable identity evidence.

## Target Files

- `packages/cli/src/commands/actor.ts`
- `packages/core/src/governance/**`
- `docs/governance/actor-identity-model.md`

## Validation Commands

```bash
node atm.mjs actor list --json
node atm.mjs actor verify-git --id <actor-id> --json
```

## Notes

2026-05-19 | status: done | validation: `atm.mjs actor register` + `atm.mjs actor verify-git --id codex-gpt-5.5 --json` + `npm run typecheck` | change: validated actor registry creation, AGENT_IDENTITY compatibility alias, and deterministic git identity evidence in the isolated AI-Atomic-Framework worktree | blocker: none
2026-05-19 | status: in-progress | validation: actor register + actor verify-git pass in isolated AI-Atomic-Framework worktree | change: exercised actor registry creation, AGENT_IDENTITY compatibility, and git identity verification end-to-end with codex-gpt-5.5 | blocker: none
2026-05-19 | status: in-progress | validation: pending | change: locked by codex-gpt-5.5 and started M1 governance foundations in isolated AI-Atomic-Framework worktree | blocker: none
2026-05-19 | status: open | validation: pending | change: formal card opened
