---
doc_id: doc_team_0026
task_id: TASK-TEAM-0026
title: "TEAM safe mirror/import ledger reconciliation lane"
status: planned
owner: atm-core
priority: P1
milestone: M4R
depends_on:
  - "TASK-TEAM-0001"
related_plan: "docs/ai_atomic_framework/team-agents/團隊自動化代理分工計畫.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: planning_repo
scopePaths:
  - "C:/Users/User/3KLife/docs/ai_atomic_framework/team-agents/團隊自動化代理分工計畫.md"
  - "C:/Users/User/3KLife/docs/ai_atomic_framework/team-agents/tasks/README.md"
  - "C:/Users/User/3KLife/docs/ai_atomic_framework/team-agents/tasks/TASK-TEAM-0026-team-safe-mirror-import-ledger-reconciliation-lane.task.md"
  - "C:/Users/User/3KLife/docs/tasks/tasks-team.json"
  - "C:/Users/User/3KLife/docs/tasks/tasks-team/tasks-team-part-1.json"
deliverables:
  - "C:/Users/User/3KLife/docs/ai_atomic_framework/team-agents/團隊自動化代理分工計畫.md"
  - "C:/Users/User/3KLife/docs/ai_atomic_framework/team-agents/tasks/README.md"
  - "C:/Users/User/3KLife/docs/ai_atomic_framework/team-agents/tasks/TASK-TEAM-0026-team-safe-mirror-import-ledger-reconciliation-lane.task.md"
  - "C:/Users/User/3KLife/docs/tasks/tasks-team.json"
  - "C:/Users/User/3KLife/docs/tasks/tasks-team/tasks-team-part-1.json"
validators:
  - "npm.cmd run check:encoding:touched -- --files docs/ai_atomic_framework/team-agents/團隊自動化代理分工計畫.md docs/ai_atomic_framework/team-agents/tasks/README.md docs/ai_atomic_framework/team-agents/tasks/TASK-TEAM-0026-team-safe-mirror-import-ledger-reconciliation-lane.task.md docs/tasks/tasks-team.json docs/tasks/tasks-team/tasks-team-part-1.json"
  - "node tools_node/shard-manager.js validate docs/tasks/tasks-team"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the TEAM Phase 0 planning opener docs and shard updates together."
atomizationImpact:
  ownerAtomOrMap: "atm.planning-bridge-map"
  mapUpdates: []
  notes: "Phase 0 opener only; the later AAF reconciliation lane stays a separate target-repo follow-up."
outOfScope:
  - "AAF source tree"
  - "AAF .atm/history/tasks/TASK-TEAM-0001..0019 / 0025 Phase 1 delivery"
  - "Framework evidence history"
  - "Framework runtime surfaces"
  - "Framework command surfaces"
  - "Framework script surfaces"
  - "Framework release surfaces"
  - "Playwright MCP runtime"
  - "scratch"
  - "claim_out.json"
  - "TASK-TEAM-002[0-4] history/tasks and task-events"
  - "TASK-AAO-*"
nonGoals:
  - "Do not touch AAF source"
  - "Do not convert the safe TEAM subset into a second registry or second task store"
  - "Do not reintroduce the dangerous TASK-TEAM-0020..0024 residue"
  - "Do not require every agent to read the full corpus before work can start"
dispatch_pattern:
  shape: "Phase 0 planning opener + later Phase 1 target-repo handoff"
  rationale: "Phase 0 is executable now inside 3KLife so the safe TEAM subset, forbidden residue, and future AAF handoff can be frozen before knowledge/runtime cards land. Phase 1 remains a later target-repo move."
  phase_0:
    lane: "planning opener"
    allowed_files:
      - "C:/Users/User/3KLife/docs/ai_atomic_framework/team-agents/團隊自動化代理分工計畫.md"
      - "C:/Users/User/3KLife/docs/ai_atomic_framework/team-agents/tasks/README.md"
      - "C:/Users/User/3KLife/docs/ai_atomic_framework/team-agents/tasks/TASK-TEAM-0026-team-safe-mirror-import-ledger-reconciliation-lane.task.md"
      - "C:/Users/User/3KLife/docs/tasks/tasks-team.json"
      - "C:/Users/User/3KLife/docs/tasks/tasks-team/tasks-team-part-1.json"
    allowed_files_strict: true
    commit_budget: 1
    output: "A route-visible Phase 0 packet that freezes the safe TEAM mirror/import subset, forbidden residue, and later AAF Phase 1 activation rule."
  phase_1:
    lane: "future AI-Atomic-Framework target_repo reconciliation lane"
    activation_requires:
      - "TASK-TEAM-0020"
      - "TASK-TEAM-0025"
    allowed_files:
      - "C:/Users/User/AI-Atomic-Framework/.atm/history/tasks/TASK-TEAM-000[1-9].json"
      - "C:/Users/User/AI-Atomic-Framework/.atm/history/tasks/TASK-TEAM-001[0-9].json"
      - "C:/Users/User/AI-Atomic-Framework/.atm/history/tasks/TASK-TEAM-0025.json"
      - "C:/Users/User/AI-Atomic-Framework/.atm/history/task-events/TASK-TEAM-000[1-9]/**"
      - "C:/Users/User/AI-Atomic-Framework/.atm/history/task-events/TASK-TEAM-001[0-9]/**"
      - "C:/Users/User/AI-Atomic-Framework/.atm/history/task-events/TASK-TEAM-0025/**"
    allowed_files_strict: true
    forbidden_files:
      - "TASK-TEAM-002[0-4] residue"
      - "TASK-AAO-*"
      - "AAF source tree"
      - "Framework evidence history"
      - "Framework command surfaces"
      - "Framework script surfaces"
      - "Framework release surfaces"
      - "Playwright MCP runtime"
      - "scratch"
      - "claim_out.json"
    commit_budget: 1
    commit_layout:
      - "commit_1: TEAM safe subset reconciliation only"
condition_review:
  - "Phase 0 closes in 3KLife without mutating the AAF ledger"
  - "TASK-TEAM-0001..0019 / 0025 stay in the safe subset"
  - "No running TEAM task is reset back to planned"
  - "No claim, owner, startedAt, startedByActor, or taskDirectionLock is removed"
  - "TASK-TEAM-0020..0024 remain forbidden residue"
  - "AAO tasks and AAF source remain untouched"
  - "Ledger and shard stay thin, advisory, and planning-only"
---
# TASK-TEAM-0026 - TEAM safe mirror/import ledger reconciliation lane

## Goal

Turn `TASK-TEAM-0026` into an executable Phase 0 planning opener that freezes the safe TEAM mirror/import subset now, while leaving the actual AAF reconciliation as a later Phase 1 handoff.

## Why

`TASK-TEAM-0001..0019 / 0025` are safe mirror/import updates, but the repo still lacks a clearly bounded lane that keeps them separated from:

- the dangerous `TASK-TEAM-0020..0024` refresh residue,
- all `TASK-AAO-*` work,
- and any AAF source, release, or runtime noise.

This card does not perform the AAF reconciliation itself. It opens and closes the planning contract in 3KLife first, so later agents can activate the AAF lane without guessing which subset is safe.

## Phase 0 Contract

- Phase 0 only changes 3KLife planning docs, the TEAM task card, and the TEAM ledger/shard.
- Phase 0 may start before `TASK-TEAM-0020` and `TASK-TEAM-0025` are implemented, because its job is to freeze the route rather than deliver the AAF import.
- Do not mutate the AAF source tree.
- Do not touch `TASK-TEAM-0020..0024`.
- Do not touch AAO tasks.
- Keep the ledger compact so route checks stay fast and disk pressure stays low.
- The top-level `scopePaths` / `deliverables` describe the Phase 0 planning opener outputs, not the later AAF Phase 1 file set.

## Phase 1 Candidate Scope

- target_repo: `AI-Atomic-Framework`
- closure_authority for this card stays `planning_repo`; the AAF route is a later follow-up handoff, not this card's close event.
- Phase 1 must wait until `TASK-TEAM-0020` and `TASK-TEAM-0025` are closed, because it relies on the knowledge boundary contract plus canonical dispatch metadata preservation.
- Safe subset:
  - `.atm/history/tasks/TASK-TEAM-0001.json` through `TASK-TEAM-0019.json`
  - `.atm/history/tasks/TASK-TEAM-0025.json`
  - `.atm/history/task-events/TASK-TEAM-0001/**` through `TASK-TEAM-0019/**`
  - `.atm/history/task-events/TASK-TEAM-0025/**`
- Forbidden residue:
  - `.atm/history/tasks/TASK-TEAM-0020.json` through `TASK-TEAM-0024.json`
  - `.atm/history/task-events/TASK-TEAM-0020/**` through `TASK-TEAM-0024/**`
  - all `TASK-AAO-*`
  - all AAF source, release, runtime, and evidence noise listed in `outOfScope`

## Deliverables

- `C:/Users/User/3KLife/docs/ai_atomic_framework/team-agents/團隊自動化代理分工計畫.md`
- `C:/Users/User/3KLife/docs/ai_atomic_framework/team-agents/tasks/README.md`
- `C:/Users/User/3KLife/docs/ai_atomic_framework/team-agents/tasks/TASK-TEAM-0026-team-safe-mirror-import-ledger-reconciliation-lane.task.md`
- `C:/Users/User/3KLife/docs/tasks/tasks-team.json`
- `C:/Users/User/3KLife/docs/tasks/tasks-team/tasks-team-part-1.json`

## Validators

- `npm.cmd run check:encoding:touched -- --files docs/ai_atomic_framework/team-agents/團隊自動化代理分工計畫.md docs/ai_atomic_framework/team-agents/tasks/README.md docs/ai_atomic_framework/team-agents/tasks/TASK-TEAM-0026-team-safe-mirror-import-ledger-reconciliation-lane.task.md docs/tasks/tasks-team.json docs/tasks/tasks-team/tasks-team-part-1.json`
- `node tools_node/shard-manager.js validate docs/tasks/tasks-team`
- `git diff --check`

## Acceptance Criteria

- The TEAM planning docs name a separate safe mirror/import reconciliation lane.
- Phase 0 can be implemented and closed in 3KLife before `TASK-TEAM-0020` and `TASK-TEAM-0025` land.
- The TEAM ledger stays small and readable instead of becoming a second registry.
- The shard path is explicit and stays advisory-only.
- Phase 1 is limited to the safe subset `0001..0019 / 0025` and still waits for `TASK-TEAM-0020` plus `TASK-TEAM-0025`.
- `TASK-TEAM-0020..0024`, `TASK-AAO-*`, and AAF source/runtime noise remain excluded.

## Rollback

Revert the TEAM planning docs and shard entries together.

## Notes

This card is now a planning-only Phase 0 opener. Closing it means the planning bridge is frozen in 3KLife; it does not mean the AAF reconciliation has already happened.
