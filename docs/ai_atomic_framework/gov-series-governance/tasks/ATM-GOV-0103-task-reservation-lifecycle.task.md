---
doc_id: doc_other_0804
task_id: ATM-GOV-0103
title: Task Opening and Reservation Lifecycle
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

# ATM-GOV-0103 Task Opening and Reservation Lifecycle

## Background

Task lifecycle states must be explicit before collaboration starts.
Reservation and promotion should separate "opened" from "ready to claim".

## Outputs

1. Formal lifecycle states (`reserved`, `ready`, `running`, `review`, `done`, `blocked`, `abandoned`).
2. CLI transitions for reserve/promote/close with evidence lineage.
3. Compatibility mapping from legacy status names.

## Acceptance Criteria

- [x] Task cannot be claimed before it is `ready`.
- [x] Every state transition has actor + timestamp evidence.
- [x] Status mapping docs cover 3KLife legacy naming.

## Target Files

- `packages/cli/src/commands/tasks.ts`
- `docs/governance/task-reservation-lifecycle.md`

## Validation Commands

```bash
node atm.mjs tasks reserve --task ATM-GOV-0103 --actor <actor> --title "Task lifecycle" --json
node atm.mjs tasks promote --task ATM-GOV-0103 --actor <actor> --json
```

## Notes

2026-05-19 | status: done | validation: `node --experimental-strip-types scripts/validate-task-import.ts --mode validate` + `npm run validate:governance-commands` + `npm run typecheck` | change: completed markdown table import parsing, dependency/status preservation, reserve/promote flow, and ready-only `next --claim` behavior in the isolated AI-Atomic-Framework worktree | blocker: none
2026-05-19 | status: in-progress | validation: validate-task-import + validate-governance-commands + typecheck pass in isolated AI-Atomic-Framework worktree | change: fixed plan table import field mapping, preserved status/dependency columns, and blocked claim/next-claim until task is ready | blocker: none
2026-05-19 | status: in-progress | validation: pending | change: locked by codex-gpt-5.5 for M1 reservation lifecycle implementation pass in isolated AI-Atomic-Framework worktree | blocker: waiting on shared foundation updates
2026-05-19 | status: open | validation: pending | change: formal card opened
