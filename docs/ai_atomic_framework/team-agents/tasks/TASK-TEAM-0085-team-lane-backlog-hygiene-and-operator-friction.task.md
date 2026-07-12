---
doc_id: doc_team_0085
task_id: TASK-TEAM-0085
title: "TEAM lane backlog hygiene and operator-friction records"
status: done
owner: atm-core
priority: P2
milestone: "Team Broker Maintainability"
depends_on:
  - TASK-TEAM-0081
  - TASK-TEAM-0083
  - TASK-TEAM-0084
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "docs/governance/atm-bug-and-optimization-backlog.md"
deliverables:
  - "docs/governance/atm-bug-and-optimization-backlog.md"
validators:
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the backlog hygiene rows if the status or friction classification is wrong."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-runtime"
completed_at: "2026-07-12T09:29:30.104Z"
completed_by_agent: "Codex-GPT5.6 Terra"
closedAt: "2026-07-12T09:29:30.104Z"
closedByActor: "Codex-GPT5.6 Terra"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-12T09-29-30-104Z-close-0ea0ebc13c7f"
lastTransitionAt: "2026-07-12T09:29:30.104Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "6d72a6d9195ab59efea30a09d6d8b9edd195b0bd"
---

# TASK-TEAM-0085 TEAM lane backlog hygiene and operator-friction records

## Goal

Finish TEAM lane backlog hygiene after the 2026-07-12 closeout audit.
`TASK-TEAM-0081` is officially closed, but `ATM-BUG-2026-07-12-137` still says
`Needs task card`. Also record the three operator-friction issues discovered
during the TEAM lane dogfood so future captains do not rediscover them from
chat history.

## Acceptance Criteria

- `ATM-BUG-2026-07-12-137` is marked `Fixed in TASK-TEAM-0081` and references
  delivery commit `573ac3cf`.
- The backlog records `--role-provider` empty-segment parsing as an ATM
  operator-friction bug or optimization.
- The backlog records `next --claim --auto-intent` closeout-only misclassification
  as an ATM operator-friction follow-up, without reopening the earlier fixed
  preflight guard row.
- The backlog records broker intents not being automatically released after
  task close as an ATM operator-friction follow-up.
- The update is committed through governed target closeout with command-backed
  `git diff --check` evidence.
