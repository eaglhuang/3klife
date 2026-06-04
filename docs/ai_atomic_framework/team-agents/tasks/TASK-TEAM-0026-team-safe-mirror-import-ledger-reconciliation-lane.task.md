---
doc_id: doc_team_0026
task_id: TASK-TEAM-0026
title: "TEAM safe mirror/import ledger reconciliation lane"
status: planned
owner: atm-core
priority: P1
milestone: M4R
depends_on:
  - "TASK-TEAM-0025"
  - "TASK-TEAM-0020"
related_plan: "docs/ai_atomic_framework/team-agents/團隊自動化代理分工計畫.md"
planning_repo: 3KLife
target_repo: 3KLife
closure_authority: planning_repo
scopePaths:
  - "docs/ai_atomic_framework/team-agents/團隊自動化代理分工計畫.md"
  - "docs/ai_atomic_framework/team-agents/tasks/README.md"
  - "docs/ai_atomic_framework/team-agents/tasks/TASK-TEAM-0026-team-safe-mirror-import-ledger-reconciliation-lane.task.md"
  - "docs/tasks/README.md"
  - "docs/tasks/tasks-team.json"
  - "docs/tasks/tasks-team/.shardrc.json"
  - "docs/tasks/tasks-team/tasks-team-part-1.json"
deliverables:
  - "docs/ai_atomic_framework/team-agents/團隊自動化代理分工計畫.md"
  - "docs/ai_atomic_framework/team-agents/tasks/README.md"
  - "docs/ai_atomic_framework/team-agents/tasks/TASK-TEAM-0026-team-safe-mirror-import-ledger-reconciliation-lane.task.md"
  - "docs/tasks/README.md"
  - "docs/tasks/tasks-team.json"
  - "docs/tasks/tasks-team/.shardrc.json"
  - "docs/tasks/tasks-team/tasks-team-part-1.json"
validators:
  - "npm.cmd run check:encoding:touched -- --files docs/ai_atomic_framework/team-agents/團隊自動化代理分工計畫.md docs/ai_atomic_framework/team-agents/tasks/README.md docs/ai_atomic_framework/team-agents/tasks/TASK-TEAM-0026-team-safe-mirror-import-ledger-reconciliation-lane.task.md docs/tasks/README.md docs/tasks/tasks-team.json docs/tasks/tasks-team/.shardrc.json docs/tasks/tasks-team/tasks-team-part-1.json"
  - "node tools_node/shard-manager.js validate docs/tasks/tasks-team"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the TEAM planning docs, ledger file, shard config, and shard part together."
atomizationImpact:
  ownerAtomOrMap: "atm.planning-bridge-map"
  mapUpdates: []
  notes: "Planning-only lane; downstream AAF implementation remains a separate target-repo card."
outOfScope:
  - "C:/Users/User/AI-Atomic-Framework/**"
  - "C:/Users/User/AI-Atomic-Framework/.atm/history/evidence/**"
  - "C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/**"
  - "C:/Users/User/AI-Atomic-Framework/scripts/**"
  - "C:/Users/User/AI-Atomic-Framework/release/**"
  - "C:/Users/User/AI-Atomic-Framework/.playwright-mcp/**"
  - "C:/Users/User/AI-Atomic-Framework/scratch/**"
  - "C:/Users/User/AI-Atomic-Framework/claim_out.json"
  - "C:/Users/User/AI-Atomic-Framework/.atm/history/tasks/TASK-TEAM-002[0-4].json"
  - "C:/Users/User/AI-Atomic-Framework/.atm/history/task-events/TASK-TEAM-002[0-4]/**"
  - "TASK-AAO-*"
nonGoals:
  - "Do not touch AAF source"
  - "Do not convert the safe TEAM subset into a second registry or second task store"
  - "Do not reintroduce the dangerous TASK-TEAM-0020..0024 residue"
  - "Do not require every agent to read the full corpus before work can start"
dispatch_pattern:
  shape: "dual-agent (Phase 0 planning lane + Phase 1 future safe-lane builder)"
  rationale: "Phase 0 carves the legal TEAM reconciliation lane in planning docs only; Phase 1 will later use the frozen safe subset and the forbidden fence to keep AAF source clean."
  phase_0:
    lane: "helper (read-only sidecar)"
    allowed_files:
      - "docs/ai_atomic_framework/team-agents/團隊自動化代理分工計畫.md"
      - "docs/ai_atomic_framework/team-agents/tasks/README.md"
      - "docs/ai_atomic_framework/team-agents/tasks/TASK-TEAM-0026-*.task.md"
      - "docs/tasks/README.md"
      - "docs/tasks/tasks-team.json"
      - "docs/tasks/tasks-team/.shardrc.json"
      - "docs/tasks/tasks-team/tasks-team-part-1.json"
    commit_budget: 0
    output: "Phase 1 brief that freezes the safe TEAM mirror/import subset, names the forbidden residue, and defines the future commit lane."
  phase_1:
    lane: "future batch lane"
    allowed_files:
      - "C:/Users/User/AI-Atomic-Framework/.atm/history/tasks/TASK-TEAM-000[1-9].json"
      - "C:/Users/User/AI-Atomic-Framework/.atm/history/tasks/TASK-TEAM-001[0-9].json"
      - "C:/Users/User/AI-Atomic-Framework/.atm/history/tasks/TASK-TEAM-0025.json"
      - "C:/Users/User/AI-Atomic-Framework/.atm/history/task-events/TASK-TEAM-000[1-9]/**"
      - "C:/Users/User/AI-Atomic-Framework/.atm/history/task-events/TASK-TEAM-001[0-9]/**"
      - "C:/Users/User/AI-Atomic-Framework/.atm/history/task-events/TASK-TEAM-0025/**"
    allowed_files_strict: true
    forbidden_files:
      - "C:/Users/User/AI-Atomic-Framework/.atm/history/tasks/TASK-TEAM-002[0-4].json"
      - "C:/Users/User/AI-Atomic-Framework/.atm/history/task-events/TASK-TEAM-002[0-4]/**"
      - "C:/Users/User/AI-Atomic-Framework/.atm/history/evidence/**"
      - "C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/**"
      - "C:/Users/User/AI-Atomic-Framework/scripts/**"
      - "C:/Users/User/AI-Atomic-Framework/release/**"
      - "C:/Users/User/AI-Atomic-Framework/.playwright-mcp/**"
      - "C:/Users/User/AI-Atomic-Framework/scratch/**"
      - "C:/Users/User/AI-Atomic-Framework/claim_out.json"
      - "TASK-AAO-*"
    commit_budget: 1
    commit_layout:
      - "commit_1: TEAM safe subset reconciliation only"
condition_review:
  - "TASK-TEAM-0001..0019 / 0025 stay in the safe subset"
  - "No running TEAM task is reset back to planned"
  - "No claim, owner, startedAt, startedByActor, or taskDirectionLock is removed"
  - "TASK-TEAM-0020..0024 remain forbidden residue"
  - "AAO tasks and AAF source remain untouched"
  - "Ledger and shard stay thin, advisory, and planning-only"
---
# TASK-TEAM-0026 - TEAM safe mirror/import ledger reconciliation lane

## Goal

Create a legal TEAM-only reconciliation lane for the already-safe mirror/import subset so later agents can route it without mixing in dangerous residue or AAF source fixes.

## Why

`TASK-TEAM-0001..0019 / 0025` are safe mirror/import updates, but the repo still lacks a clearly bounded lane that keeps them separated from:

- the dangerous `TASK-TEAM-0020..0024` refresh residue,
- all `TASK-AAO-*` work,
- and any AAF source, release, or runtime noise.

This card does not perform the reconciliation itself. It opens the planning contract, ledger, and shard that make the future route explicit.

## Phase 0 Contract

- Phase 0 only changes 3KLife planning docs, the TEAM task card, and the TEAM ledger/shard.
- Do not mutate `C:/Users/User/AI-Atomic-Framework/**`.
- Do not touch `TASK-TEAM-0020..0024`.
- Do not touch AAO tasks.
- Keep the ledger compact so route checks stay fast and disk pressure stays low.

## Phase 1 Candidate Scope

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

- `docs/ai_atomic_framework/team-agents/團隊自動化代理分工計畫.md`
- `docs/ai_atomic_framework/team-agents/tasks/README.md`
- `docs/ai_atomic_framework/team-agents/tasks/TASK-TEAM-0026-team-safe-mirror-import-ledger-reconciliation-lane.task.md`
- `docs/tasks/README.md`
- `docs/tasks/tasks-team.json`
- `docs/tasks/tasks-team/.shardrc.json`
- `docs/tasks/tasks-team/tasks-team-part-1.json`

## Validators

- `npm.cmd run check:encoding:touched -- --files docs/ai_atomic_framework/team-agents/團隊自動化代理分工計畫.md docs/ai_atomic_framework/team-agents/tasks/README.md docs/ai_atomic_framework/team-agents/tasks/TASK-TEAM-0026-team-safe-mirror-import-ledger-reconciliation-lane.task.md docs/tasks/README.md docs/tasks/tasks-team.json docs/tasks/tasks-team/.shardrc.json docs/tasks/tasks-team/tasks-team-part-1.json`
- `node tools_node/shard-manager.js validate docs/tasks/tasks-team`
- `node tools_node/check-doc-shard-health.js`
- `git diff --check`

## Acceptance Criteria

- The TEAM planning docs name a separate safe mirror/import reconciliation lane.
- The TEAM ledger stays small and readable instead of becoming a second registry.
- The shard path is explicit and stays advisory-only.
- Phase 1 is limited to the safe subset `0001..0019 / 0025`.
- `TASK-TEAM-0020..0024`, `TASK-AAO-*`, and AAF source/runtime noise remain excluded.

## Rollback

Revert the TEAM planning docs, ledger file, shard config, and shard part together.

## Notes

This card is planning-only. A later governed route check must still happen before any actual TEAM subset commit is attempted.
Repository-wide doc shard health is advisory only here; it currently reports unrelated large-doc noise outside the TEAM lane.
