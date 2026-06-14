---
task_id: TASK-CID-0079
doc_id: doc_cid_0079
title: "Same-task evidence write serialization"
status: planned
owner: atm-core
priority: P0
milestone: M16
related_plan: docs/ai_atomic_framework/cid-hardening/atm-tasks-command-atomic-map-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
depends_on:
  - "TASK-CID-0075"
scopePaths:
  - "packages/cli/src/commands/evidence.ts"
  - "scripts/validate-evidence-command-runs.ts"
  - "scripts/validate-task-ledger-governance.ts"
deliverables:
  - "packages/cli/src/commands/evidence.ts"
  - "scripts/validate-evidence-command-runs.ts"
  - "scripts/validate-task-ledger-governance.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-evidence-command-runs.ts"
  - "node --strip-types scripts/validate-task-ledger-governance.ts --mode validate"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert if serialization corrupts ordinary evidence capture or silently drops command-run metadata."
atomizationImpact:
  ownerAtomOrMap: "atm.evidence-same-task-write-serialization"
  mapUpdates:
    - "packages/cli/src/commands/evidence.ts"
    - "scripts/validate-evidence-command-runs.ts"
outOfScope:
  - "Changing what counts as valid evidence"
  - "Broad repo-wide write-lock redesign outside evidence capture"
nonGoals:
  - "Do not allow parallel evidence writes to win by last write."
  - "Do not serialize unrelated tasks together when the race only concerns the same task bundle."
---

# TASK-CID-0079 - Same-task evidence write serialization

## Goal

Prevent same-task `evidence run` or equivalent command-backed evidence updates
from racing each other and silently losing proof.

## Problem

The closeback run showed that parallel evidence capture against one task can
overwrite bundle state depending on timing. That is a correctness bug: command-
backed evidence should merge safely, serialize, or fail closed, but it must not
drop one validator because another write arrived a moment later.

## Required Behavior

- Before source edits, run the repo-local `atm-atom-map-refactor` skill in
  review mode.
- Keep any extraction limited to an in-scope evidence-write guard, lock, or
  merge helper.
- Same-task evidence writes must either:
  - serialize behind an explicit lock; or
  - fail closed with a retryable diagnostic before bundle mutation.
- The final persisted bundle must retain all successful command-backed evidence
  entries instead of last-write-wins loss.
- Validation must exercise a same-task concurrent-write scenario.

## Acceptance Criteria

- Parallel evidence writes for the same task no longer lose previously recorded
  command-run entries.
- Unrelated task evidence capture remains unaffected.
- Validation proves the race is fixed or fail-closed.

## Validation

```powershell
npm run typecheck
npm run validate:cli
node --strip-types scripts/validate-evidence-command-runs.ts
node --strip-types scripts/validate-task-ledger-governance.ts --mode validate
git diff --check
```

## Report Back

Report whether the fix chose serialization or fail-closed retry, how the same-
task scope is identified, and the regression that proves one validator cannot
erase another.
