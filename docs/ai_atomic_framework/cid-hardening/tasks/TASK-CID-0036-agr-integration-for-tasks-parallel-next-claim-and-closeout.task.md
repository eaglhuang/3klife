---
doc_id: doc_cid_0036
task_id: TASK-CID-0036
title: "AGR integration for tasks parallel, next claim, and closeout"
status: done
owner: atm-core
priority: P1
milestone: M3
depends_on:
  - "TASK-CID-0034"
  - "TASK-CID-0035"
related_plan: docs/ai_atomic_framework/cid-hardening/CID硬化計畫書2.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/tasks/task-transition-helpers.ts"
  - "scripts/validate-governance-commands.ts"
deliverables:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/tasks/task-transition-helpers.ts"
  - "scripts/validate-governance-commands.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-governance-commands.ts --mode validate"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert AGR surface integration if tasks/next/closeout do not present one coherent broker verdict model."
atomizationImpact:
  ownerAtomOrMap: "atm.cid-agr-runtime-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Rewriting the historical-delivery model"
  - "Adding remote broker service orchestration"
nonGoals:
  - "Do not let one surface bypass AGR blockers shown by another surface"
started_at: 2026-06-11T17:56:45+08:00
started_by_agent: codex-main
completed_at: 2026-06-11T22:51:27+08:00
completed_by_agent: codex-main
---

# TASK-CID-0036 - AGR integration for tasks parallel, next claim, and closeout

## Goal

Connect AGR verdicts to the major governance entry points so claim, parallel advice, and closeout all speak the same runtime language.

## Acceptance Criteria

- `tasks parallel`, `next --claim`, and closeout surfaces present consistent AGR-aware verdicts.
- Closeout preserves virtual atom and registry evidence.
- Historical-delivery closeback paths remain intact.

## Completion Notes

- Target-repo ledger is already closed as `done` in `AI-Atomic-Framework`.
- Closure packet exists at `.atm/history/evidence/TASK-CID-0036.closure-packet.json`.
- This planning mirror update only synchronizes the 3KLife task card with the authoritative target-repo closeout state.
