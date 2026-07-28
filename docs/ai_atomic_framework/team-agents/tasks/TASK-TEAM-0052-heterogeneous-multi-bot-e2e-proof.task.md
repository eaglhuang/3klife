---
doc_id: doc_team_0052
task_id: TASK-TEAM-0052
title: "Heterogeneous multi-bot team run end-to-end proof"
status: done
owner: atm-core
priority: P1
milestone: M10X
depends_on:
  - "TASK-TEAM-0050"
  - "TASK-TEAM-0051"
related_plan: "docs/ai_atomic_framework/team-agents/TEAM-BROKER-ENFORCEMENT-INTEGRATION-PLAN-2026-07-10.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "scripts/validate-team-agents.ts"
  - "docs/governance/team-agents/team-vendor-runtime.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "scripts/validate-team-agents.ts"
  - "docs/governance/team-agents/team-vendor-runtime.md"
validators:
  - "npm run typecheck"
  - "node --strip-types scripts/validate-team-agents.ts --case heterogeneous-multi-bot-team-run"
  - "npm run validate:team-agents"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert fixture, validator case, and doc section together."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-runtime"
  mapUpdates: []
outOfScope:
  - "Live paid API calls in CI (use injected executors; live run is a manual dry-run appendix)"
nonGoals:
  - "Do not turn the proof fixture into a second scheduler or bypass broker gates"
completed_at: "2026-07-11T02:31:46.870Z"
completed_by_agent: "coordinator"
closedAt: "2026-07-11T02:31:46.870Z"
closedByActor: "coordinator"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-11T02-31-46-791Z-close-a08868813972"
lastTransitionAt: "2026-07-11T02:31:46.870Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "072cadf4"
---
# TASK-TEAM-0052 Heterogeneous multi-bot team run end-to-end proof

## Goal

Provide the reproducible demo that the paper-level claim holds: one `team start --execute` run spawns
multiple independent vendor+model agent bots with different roles, sized by task difficulty, all under
broker/permission governance.

## Acceptance Criteria

- Fixture task with medium sizing produces a roster where at least three roles run on at least two
  different providers (e.g. claude-code implementer, gemini reviewer, openai validator) in one run.
- Each spawned bot yields its own `atm.teamProviderRunArtifact.v1` with distinct sessionId
  (task:role:provider:model), permission decision, and observability events.
- A same-run broker conflict scenario shows one bot blocked with `broker-conflict-blocked` while the
  others proceed, proving per-bot (not per-run) governance.
- `team-vendor-runtime.md` gains a "heterogeneous team run" walkthrough with the exact commands, plus
  a manual live-run appendix (env secret refs only, no raw secrets).
- The sizing manual override path (`--team-size large`) is exercised once in the fixture to prove the
  human-designation lane.
