---
task_id: TASK-RFT-0067
title: Split git hooks enforcement validator below 600 lines
status: done
owner: atm-release
priority: P1
depends_on:
  - TASK-RFT-0066
related_plan: docs/ai_atomic_framework/governance-optimization/tasks/TASK-RFT-0067-git-hooks-enforcement-final-600.task.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/validate-git-hooks-enforcement.ts
  - scripts/validate-git-hooks-enforcement/**/*.ts
  - tests/scripts/validate-git-hooks-enforcement-final-600.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts.json
deliverables:
  - scripts/validate-git-hooks-enforcement.ts
  - scripts/validate-git-hooks-enforcement/**/*.ts
  - tests/scripts/validate-git-hooks-enforcement-final-600.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts.json
validators:
  - node --strip-types tests/scripts/validate-git-hooks-enforcement-final-600.test.ts
  - npm run validate:git-hooks-enforcement -- --lane install
  - npm run typecheck
  - npm run validate:governance-projections
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.git-hooks-enforcement-validator-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts.json
  extractionCandidates:
    - atom: atm.git-hooks-enforcement-validator-map
      pattern: Facade
      source: scripts/validate-git-hooks-enforcement.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-16T06:01:19.036Z"
completed_by_agent: "codex-task-rft-0067"
closedAt: "2026-07-16T06:01:19.036Z"
closedByActor: "codex-task-rft-0067"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-16T06-01-19-036Z-close-1504030c02c9"
lastTransitionAt: "2026-07-16T06:01:19.036Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "d55c45f314fb7b55fca2398c8c94d1ff550642a9"
---

# TASK-RFT-0067 - Split git hooks enforcement validator below 600 lines

## Goal

Refactor `scripts/validate-git-hooks-enforcement.ts` into a thin operator-facing facade plus bounded implementation modules owned by `atm.git-hooks-enforcement-validator-map`.

## Acceptance

- `scripts/validate-git-hooks-enforcement.ts` remains the stable script entrypoint.
- Every physical TypeScript file in this task scope is below 600 lines.
- Existing validator behavior is preserved for at least the install lane.
- A focused final-600 guard verifies the facade and extracted module line counts.
- The scripts owner shard records both the facade and extracted module glob.

## Extraction Plan

Atom: `atm.git-hooks-enforcement-validator-map`
Pattern: Facade
Owner module: `scripts/validate-git-hooks-enforcement/**/*.ts`
Callers: `npm run validate:git-hooks-enforcement`
Public surface: unchanged script command and lane flags
Focused test: `node --strip-types tests/scripts/validate-git-hooks-enforcement-final-600.test.ts`
CLI regression: `npm run validate:git-hooks-enforcement -- --lane install`
Out of scope: deeper behavior changes to hook policy, task lifecycle gates, or commit admission semantics
Commit split: delivery commit first, closeout governance bundle second
