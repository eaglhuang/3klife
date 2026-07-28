---
doc_id: doc_team_0033
task_id: TASK-TEAM-0033
title: "Team reviewer-validator rework route state machine"
status: done
owner: atm-core
priority: P0
milestone: M6R
depends_on:
  - "TASK-TEAM-0014"
  - "TASK-TEAM-0016"
  - "TASK-TEAM-0031"
related_plan: "docs/ai_atomic_framework/team-agents/ATM多語言WorkerAdaptor方案.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/evidence.ts"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/evidence.ts"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-team-agents.ts --case rework-route-state-machine"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert rework route transitions, validator handling, and evidence wiring."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-runtime"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Replacing task closure authority"
  - "Allowing reviewer text to override failed validators"
  - "Infinite auto-retry behavior"
nonGoals:
  - "Do not create an advisory-only rework state"
  - "Do not bypass evidence requirements"
completed_at: "2026-06-18T17:33:03.276Z"
completed_by_agent: "codex-gpt-5.4-mini"
closed_by_agent: "codex-gpt-5.4-mini"
lastTransitionId: "2026-06-18T17-33-03-156Z-close-eb32e5894e38"
delivery_commit: "605cd5c7ad600ff6140ff8ceb135787dc5a8e601"
---
# TASK-TEAM-0033 Team reviewer-validator rework route state machine

## Goal

Turn reviewer and validator findings into explicit Team runtime route transitions such as `needs-rework`, `revalidate-pending`, and `ready-for-close`.

## Why

ATM already has reviewer and validator roles. The missing piece is a formal state machine that can route those findings back into work instead of leaving them as advisory text.

## Implementation Contract

- Define allowed state transitions for rework routing.
- A blocking reviewer finding or validator failure must be able to move a run into `needs-rework`.
- Retry exhaustion must route to `blocked` or `escalated`, not loop forever.

## Acceptance Criteria

- Reviewer and validator findings can formally move a Team run into `needs-rework`.
- Revalidation can return a run to `ready-for-close` only after required checks pass.
- Route transitions are recorded as runtime state, not only console text.

## Notes

This card is the core governance upgrade learned from botpipe: not having a reviewer, but giving the reviewer a formal return path.
