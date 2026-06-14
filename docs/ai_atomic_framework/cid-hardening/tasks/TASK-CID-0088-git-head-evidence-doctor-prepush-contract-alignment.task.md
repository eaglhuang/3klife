---
task_id: TASK-CID-0088
doc_id: doc_cid_0088
title: "Git-head evidence doctor/pre-push contract alignment"
status: planned
owner: atm-core
priority: P0
milestone: M18
related_plan: docs/ai_atomic_framework/cid-hardening/atm-tasks-command-atomic-map-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
depends_on:
  - "TASK-CID-0087"
scopePaths:
  - "packages/cli/src/commands/evidence.ts"
  - "packages/cli/src/commands/git-head-evidence.ts"
  - "packages/cli/src/commands/hook.ts"
  - "scripts/validate-git-head-evidence.ts"
  - "scripts/validate-git-hooks-enforcement.ts"
deliverables:
  - "packages/cli/src/commands/evidence.ts"
  - "packages/cli/src/commands/git-head-evidence.ts"
  - "packages/cli/src/commands/hook.ts"
  - "scripts/validate-git-head-evidence.ts"
  - "scripts/validate-git-hooks-enforcement.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:git-head-evidence"
  - "node --strip-types scripts/validate-git-hooks-enforcement.ts"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert if doctor, pre-push, and git-head backfill no longer agree on protected commit evidence."
atomizationImpact:
  ownerAtomOrMap: "atm.git-head-evidence-contract"
  mapUpdates:
    - "packages/cli/src/commands/evidence.ts"
    - "packages/cli/src/commands/git-head-evidence.ts"
    - "packages/cli/src/commands/hook.ts"
outOfScope:
  - "Weakening protected branch pre-push enforcement"
  - "Allowing arbitrary evidence-only commits without a covered commit relation"
nonGoals:
  - "Do not bypass hooks or ask operators to use no-verify."
---

# TASK-CID-0088 - Git-head evidence doctor/pre-push contract alignment

## Goal

Align `evidence git-head-backfill`, `doctor`, and protected `pre-push`
commit-range enforcement so a repair path that passes one surface does not
remain broken on another surface.

## Trigger

During the 2026-06-14 dual-repo push, protected pre-push correctly blocked a
missing critical commit evidence record. After a minimal evidence backfill
commit, pre-push passed but `doctor` still reported latest HEAD as missing
git-head evidence.

## Required Behavior

- Backfill evidence must describe the covered commit in a shape consumed by both
  doctor and pre-push.
- Doctor must recognize legitimate evidence-only repair commits when they cover
  their parent or an explicitly declared protected historical commit.
- Pre-push must keep failing for critical commits with no matching evidence.
- Regression coverage must prove the cross-surface contract.

## Acceptance Criteria

- `npm run validate:git-head-evidence` includes the repair-commit case.
- Protected pre-push and doctor agree on the same covered commit semantics.
- Evidence-only commits without a valid covered commit relation remain rejected
  or warned according to repo role.

## Validation

```powershell
npm run typecheck
npm run validate:git-head-evidence
node --strip-types scripts/validate-git-hooks-enforcement.ts
npm run validate:cli
git diff --check
```
