---
doc_id: doc_other_0803
task_id: ATM-GOV-0102
title: Atomic Task Claim, Lease, Renew, Release, Handoff, Takeover
milestone: M1
status: done
blocked_by: [ATM-GOV-0101]
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
---

# ATM-GOV-0102 Atomic Task Claim, Lease, Renew, Release, Handoff, Takeover

## Background

Multi-actor collaboration must avoid double-claim and silent takeover.
A task needs a single active claim plus lease lifecycle evidence.

## Outputs

1. Atomic claim record with `actorId`, `leaseId`, `scope/files`, `ttl`, `heartbeatAt`.
2. Lease commands for renew, release, handoff, takeover.
3. Takeover requires explicit reason and evidence trail.

## Acceptance Criteria

- [x] Two concurrent claims on one task cannot both succeed.
- [x] Lease expiry and takeover follow deterministic rules.
- [x] Handoff updates ownership trace without losing evidence.

## Target Files

- `packages/cli/src/commands/tasks.ts`
- `packages/core/src/governance/**`
- `docs/governance/task-claim-lease-model.md`

## Validation Commands

```bash
node atm.mjs tasks claim --task ATM-GOV-0102 --actor <actor> --files <csv> --json
node atm.mjs tasks takeover --task ATM-GOV-0102 --actor <actor> --reason "ttl expired" --json
```

## Notes

2026-05-19 | status: done | validation: `npm run validate:governance-commands` + `npm run typecheck` | change: validated claim, renew, release, handoff, conflict, and explicit-reason takeover flows with deterministic evidence in the isolated AI-Atomic-Framework worktree | blocker: none
2026-05-19 | status: in-progress | validation: pending | change: locked by codex-gpt-5.5 for M1 claim and lease implementation pass in isolated AI-Atomic-Framework worktree | blocker: waiting on shared foundation updates
2026-05-19 | status: open | validation: pending | change: formal card opened
