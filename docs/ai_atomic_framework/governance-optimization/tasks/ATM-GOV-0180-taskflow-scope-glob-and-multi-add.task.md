---
task_id: ATM-GOV-0180
title: taskflow scope glob recognition for new files + tasks scope add multi-flag fix
status: done
owner: atm-core
priority: P0
depends_on: []
related_plan: docs/ai_atomic_framework/governance-optimization/
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: >
  本卡修 taskflow scope/close 治理行為（untracked 新檔 glob 識別與 scope add
  多旗標），與 ATM-GOV 既有 scope-aware gating 卡群語義最近；RFT 系是模組拆分
  硬化，不符。開卡號依 owner 指定自 ATM-GOV-0180 起用（略過 0172–0179）。
related_bugs:
  - ATM-BUG-2026-07-16-006
  - ATM-BUG-2026-07-16-008
  - ATM-BUG-2026-07-16-009
  - ATM-BUG-2026-07-16-010
scopePaths:
  - packages/cli/src/commands/taskflow/**
  - packages/cli/src/commands/tasks/task-option-parsers/scope-options.ts
  - packages/cli/src/commands/tasks/**
  - packages/cli/src/commands/git-governance/**
  - packages/cli/src/commands/work-channels.ts
  - packages/cli/src/commands/task-direction.ts
  - tests/cli/taskflow-scope-untracked-glob.test.ts
  - tests/cli/tasks-scope-add-multi-flag.test.ts
  - docs/governance/error-code-registry.json
  - docs/ERROR_CODES.md
  - docs/governance/command-surface.md
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-07-16-006.json
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-07-16-008.json
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-07-16-009.json
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-07-16-010.json
  - docs/governance/atm-bug-and-optimization-backlog.md
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  - .atm/history/evidence/ATM-GOV-0180.*
  - .atm/history/task-events/ATM-GOV-0180/**
  - .atm/history/tasks/ATM-GOV-0180.json
deliverables:
  - packages/cli/src/commands/tasks/task-option-parsers/scope-options.ts
  - tests/cli/taskflow-scope-untracked-glob.test.ts
  - tests/cli/tasks-scope-add-multi-flag.test.ts
validators:
  - node --strip-types tests/cli/taskflow-scope-untracked-glob.test.ts
  - node --strip-types tests/cli/tasks-scope-add-multi-flag.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.taskflow.scope-glob-untracked
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.taskflow.scope-glob-untracked
      pattern: Guard
      source: packages/cli/src/commands/taskflow/
      disposition: extract
      inlineReason: null
    - atom: atm.tasks.scope-add-multi-flag
      pattern: Parser
      source: packages/cli/src/commands/tasks/task-option-parsers/scope-options.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-18T14:24:29.742Z"
completed_by_agent: "cursor-gov-0180"
closedAt: "2026-07-18T14:24:29.742Z"
closedByActor: "cursor-gov-0180"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-18T14-24-29-459Z-close-b7e3ecb2aaf6"
lastTransitionAt: "2026-07-18T14:24:29.742Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "d66c3b2de6758449e353c9489f74ae7f0428e615"
---

# ATM-GOV-0180 — taskflow scope glob for new files + scope add multi-flag

## Phase 0 Scope

Open this planning card in 3KLife only. Phase 1 implements the fixes in the
target AI-Atomic-Framework repository.

Phase 0 allowed files:

- `C:/Users/User/3KLife/docs/ai_atomic_framework/governance-optimization/tasks/ATM-GOV-0180-taskflow-scope-glob-and-multi-add.task.md`

## Background

AAF backlog items ATM-BUG-2026-07-16-006 / -008 / -009 / -010 share one root
cause cluster and are merged into this single governance card.

Reproduced on RFT-0048 / 0052 / 0062 (untracked in-scope files) and RFT-0063
(repeated `--add` flags).

## Problem

### A) Untracked files matching allowedFiles globs are treated as excluded

When a **new (untracked)** file lands inside a task direction lock
`allowedFiles` glob (for example
`packages/cli/src/commands/next/playbook-projection/**/*.ts`):

- `taskflow pre-close` still classifies it as **excluded dirty**
- `git commit --auto-stage` omits the new in-scope file from the commit bundle

Operators must hand-run `tasks scope add` per file. That defeats glob-based
scope declarations.

### B) Repeated `--add` flags keep only the last path

`tasks scope add --add path-a --add path-b` records only the last path
(RFT-0063). Either:

1. accept and accumulate every `--add` flag, **or**
2. reject multi-flag usage with an explicit error that points to CSV
   `--add a,b` form

Phase 1 must pick one behavior, document the rationale in evidence, and cover
it with a regression test.

## Acceptance Criteria

1. Untracked new files that match an `allowedFiles` glob are treated as
   **in-scope** by both `taskflow pre-close` and the governed commit bundle /
   `--auto-stage` path.
2. Multiple `--add` flags are either all recorded, or clearly rejected with a
   CSV-format hint (implementer chooses one and records the reason).
3. New regression tests cover both cases (suggested paths under
   `tests/cli/taskflow-scope-untracked-glob.test.ts` and
   `tests/cli/tasks-scope-add-multi-flag.test.ts`).

## Out of Scope (Phase 0)

- Any AI-Atomic-Framework implementation
- Status mirror commits
- Phase 2 / planning closeback
- Push unless the operator explicitly requests it
