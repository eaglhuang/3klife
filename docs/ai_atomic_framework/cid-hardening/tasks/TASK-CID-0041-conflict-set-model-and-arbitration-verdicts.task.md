---
doc_id: doc_cid_0041
task_id: TASK-CID-0041
title: "Conflict-set model and arbitration verdicts"
status: done
finished_at: "2026-06-12T16:07:38+08:00"
finished_by_agent: "003"
evidence:
  type: command
  commands:
    - "npm run typecheck"
    - "npm run validate:cli"
    - "node --strip-types packages/core/src/broker/__tests__/conflict-matrix.test.ts"
    - "git diff --check"
  reports:
    - "C:\\Users\\User\\AI-Atomic-Framework\\.atm-temp\\captain-dispatch-mailbox\\agents\\003\\done\\P1-CIDHARD-003-S1-TASK-CID-0041--captain-to-003--20260612-153000TPE.dispatch.md"
owner: atm-core
priority: P1
milestone: M5
depends_on:
  - "TASK-CID-0040"
related_plan: docs/ai_atomic_framework/cid-hardening/agr-conflict-arbitration-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/core/src/broker/conflict-matrix.ts"
  - "packages/core/src/broker/types.ts"
  - "packages/core/src/broker/__tests__/conflict-matrix.test.ts"
  - "packages/cli/src/commands/broker.ts"
deliverables:
  - "packages/core/src/broker/conflict-matrix.ts"
  - "packages/core/src/broker/types.ts"
  - "packages/core/src/broker/__tests__/conflict-matrix.test.ts"
  - "packages/cli/src/commands/broker.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types packages/core/src/broker/__tests__/conflict-matrix.test.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the conflict-set model and verdict table if the router emits contradictory outcomes."
atomizationImpact:
  ownerAtomOrMap: "atm.cid-agr-conflict-matrix-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Applying patches to the worktree"
  - "Steward apply execution"
nonGoals:
  - "Do not let unknown read/write sets silently pass."
---

# TASK-CID-0041 - Conflict-set model and arbitration verdicts

## Goal

Encode the broker-side conflict-set model and the visible verdicts that the router must return before any write happens.

## Acceptance Criteria

- Same-file / non-overlap, read-write, base-drift, and artifact-collision cases are all covered.
- Verdicts are explicit and map cleanly to allow, watch, freeze, or takeover decisions.
- The control-plane / data-plane boundary is documented in code-facing contracts.
