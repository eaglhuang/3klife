---
doc_id: doc_task_aao_0052
task_id: TASK-AAO-0052
title: "Validator fixture task id clarity"
status: planned
owner: atm-core
priority: P0
earlyUnblocker: true
unblockerReason: "Prevents validator fixtures from looking like formal task cards and reducing false-positive human or AI interpretation during governance checks."
milestone: M16
depends_on:
  - "TASK-AAO-0046"
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "scripts/validate-task-ledger-governance.ts"
  - "scripts/validate-cli.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "scripts/validate-task-ledger-governance.ts"
  - "scripts/validate-cli.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-task-ledger-governance.ts --mode validate"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the fixture-id clarity changes, restore the previous TASK-PIPE-style regression shape, and revert any atomization map refresh tied to the touched validator paths."
atomizationImpact:
  ownerAtomOrMap: "atm.framework-mode-governance-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Changing the formal task card ID grammar for production tasks"
  - "Changing the AAO planning task ID namespace"
  - "Reworking unrelated validator fixtures that do not participate in the task-ledger clarity regression"
nonGoals:
  - "Renaming real task ledger IDs used by genuine work items"
  - "Reframing TEST-TASK identifiers as production task IDs"
  - "Changing TASK-AAO planning card IDs"
---
# TASK-AAO-0052 - Validator fixture task id clarity

## Goal

Make validator fixtures use obvious TEST-TASK-* identifiers so they cannot be mistaken for formal task ledger items.

## Why

Current task-ledger governance fixtures still use IDs like TASK-PIPE-0002. That looks too much like a real task card when it appears in validator output, review screenshots, or AI reasoning. When a validator prints a fixture id, the id itself should make it obvious that this is a test fixture, not a production task ledger entry.

## Implementation Contract

- Rename or wrap the existing TASK-PIPE-0002 fixture shape so the regression uses TEST-TASK-* identifiers.
- All validator-side fixture task ids must use TEST-TASK-*; no new fixture may use TASK-PIPE-* or TASK-AAO-* style identifiers.
- Validator output and any generated evidence must clearly label fixture ids as test fixtures.
- The committed deliverable fixture must continue to use `--historical-delivery HEAD` or an equivalent current governance path for committed historical evidence.
- Do not change the formal task card ID format for real tasks.
- Do not change the AAO planning task ID namespace.

## Deliverables

- Task-ledger governance fixture updates in `scripts/validate-task-ledger-governance.ts` so the internal regression uses TEST-TASK-* ids.
- Shared guard or surface updates in `scripts/validate-cli.ts` only if the same clarity needs to be reflected there.
- Atomization ownership refresh for any touched validator path in `atomic_workbench/atomization-coverage/path-to-atom-map.json`.
- Regression coverage proving the committed fixture path still passes through `--historical-delivery HEAD` or the equivalent active governance path.

## Validators

- npm run typecheck
- npm run validate:cli
- node --strip-types scripts/validate-task-ledger-governance.ts --mode validate
- git diff --check

## Acceptance Criteria

- Validator fixture ids use TEST-TASK-* and no longer use TASK-PIPE-* or TASK-AAO-* style identifiers.
- When the validator prints a fixture id, the surrounding output makes it clear that the id belongs to a test fixture, not to a formal task ledger item.
- The existing TASK-PIPE-0002 regression is renamed or wrapped into TEST-TASK-*.
- The committed fixture path still uses `--historical-delivery HEAD` or an equivalent current governance path.
- The formal task card id grammar remains unchanged.
- The AAO planning task id namespace remains unchanged.

## Rollback

Revert the task commit, restore the previous fixture naming and wrapper shape, and re-run the listed validators.

## Atomization Impact

- Owner atom/map: atm.framework-mode-governance-map
- Map updates: atomic_workbench/atomization-coverage/path-to-atom-map.json
- Any new validator fixture or helper introduced by this card must be mapped before closure.

## Notes

This task is intentionally narrow: it changes fixture identity clarity, not the production task id grammar.
