---
doc_id: doc_other_aao_0066
task_id: TASK-AAO-0066
title: "Read-only preflight and task materialization status"
status: planned
owner: atm-core
priority: P1
milestone: M17
depends_on:
  - "TASK-AAO-0034"
  - "TASK-AAO-0026"
  - "TASK-AAO-0061"
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/command-specs/next.spec.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "scripts/validate-prompt-scoped-next.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/command-specs/next.spec.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "scripts/validate-prompt-scoped-next.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-prompt-scoped-next.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Additive read-only flag and envelope block; revert removes the `--read-only` (or `preflight`) path without touching existing mutating flow."
atomizationImpact:
  ownerAtomOrMap: "atm.next-router-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  notes: "Add ownership entries for the new preflight surface in next.ts and the materialization helpers in tasks.ts."
outOfScope:
  - "Mutating claim/promote/reserve paths"
  - "Lock acquisition logic changes"
  - "Reservation queue mutation"
nonGoals:
  - "Do not replace the existing `next` flow"
  - "Do not change the default behaviour of `node atm.mjs next` invocations"
  - "Do not expose preflight as a public ledger record"
tags:
  - "agent-operability"
  - "cli-ergonomics"
---

# TASK-AAO-0066 - Read-only preflight and task materialization status

## Goal

(1) Add `node atm.mjs next preflight --task <id> --json` (or equivalent `--read-only` flag on existing `next --task`) that returns claim state, direction lock state, dependency state, and the would-be next-action playbook without invoking any reserve/promote/claim path or writing to `.atm/runtime/locks/`. (2) Add a `taskMaterialization` block to the envelope returned by `next --task` and `tasks show`, containing booleans for `taskCardPresent`, `evidencePresent`, `closurePacketPresent`, and the integer `transitionEventCount`.

## Why

Agents and operators frequently want a "look first, don't touch" view to confirm that a task card exists, dependencies are satisfied, and the lock state is what they expect — before committing to any state transition. Today `next --task <id>` performs implicit reserve/promote when matching, so there is no safe inspection path. The `taskMaterialization` block also collapses 3–4 separate filesystem probes into a single read.

## Acceptance Criteria

- `node atm.mjs next preflight --task <id> --json` (or chosen syntax) returns a documented envelope and provably does NOT touch `.atm/runtime/locks/`, `.atm/history/tasks/`, or `.atm/history/task-events/` (covered by validator that snapshots and diffs the runtime tree before/after).
- The same envelope reports `taskMaterialization: { taskCardPresent, evidencePresent, closurePacketPresent, transitionEventCount }`.
- A regression test in `scripts/validate-prompt-scoped-next.ts` proves the read-only contract.
- Existing `next --task <id>` non-preflight behaviour is unchanged.

## Stop Conditions

- If implementing preflight requires sharing code paths with the mutating reserve/promote path in a way that risks accidental writes, isolate the read-only path into a dedicated helper before shipping; do not ship preflight that "almost never" writes.
