---
task_id: TASK-CID-0096
doc_id: doc_cid_0096
title: "Numeric scalar adapter for commutative operations"
status: planned
owner: atm-core
priority: P1
milestone: M19
related_plan: docs/ai_atomic_framework/cid-hardening/CID硬化計畫書2.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
depends_on:
  - "TASK-CID-0092"
scopePaths:
  - "packages/core/src/broker/"
  - "packages/core/src/broker/__tests__/"
deliverables:
  - "Numeric scalar mutation adapter"
  - "increment / decrement / max / min / set-if-current fixtures"
  - "commutative merge decision tests"
validators:
  - "npm run typecheck"
  - "npm test"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert numeric scalar adapter and tests."
atomizationImpact:
  ownerAtomOrMap: "atm.numeric-scalar-adapter"
outOfScope:
  - "Arbitrary spreadsheet formulas"
  - "Floating-point financial precision policy"
nonGoals:
  - "Do not treat all numeric writes as commutative."
---

# TASK-CID-0096 - Numeric scalar adapter for commutative operations

## Goal

Support scalar numeric files or scalar numeric fields where operations can be merged safely.

## Required Behavior

- Support increment, decrement, max, min, and set-if-current.
- Mark only mathematically commutative operations as mergeable.
- Treat plain set operations as conflict unless guarded by expected current value.

## Acceptance Criteria

- Multiple increments can be combined in one broker batch.
- Increment plus plain set is not marked safe without a declared merge rule.
- Evidence records the operation list and final computed value.

## Validation

```powershell
npm run typecheck
npm test
git diff --check
```
