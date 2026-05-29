---
task_id: TASK-AAO-0075
title: "next --claim --prompt ledger embed allowedFiles sync"
status: done
priority: P0
milestone: M5
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
depends_on: [TASK-AAO-0062]
related_plan: "TASK-AAO-0062 follow-up: cover next --claim --prompt branch missed by tasks claim fix"
scopePaths:
  - "packages/cli/src/commands/next.ts"
  - "scripts/validate-task-direction-governance.ts"
deliverables:
  - "packages/cli/src/commands/next.ts"
  - "scripts/validate-task-direction-governance.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-task-direction-governance.ts --mode validate"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: "atm.next-router-map"
  mapUpdates: []
  notes: "Pure bug fix; no new atom; lifts blocker for TASK-AAO-0074 and future next --claim --prompt claims."
outOfScope:
  - "Refactoring claimNextImportedTask structure"
  - "Touching tasks claim path (already correct from TASK-AAO-0062)"
nonGoals:
  - "Do not introduce new module or atom"
  - "Do not change writeTaskDirectionLock signature"
---

# TASK-AAO-0075: next --claim --prompt ledger embed allowedFiles sync

## Goal
Fix the `--files` argument passed from claimNextImportedTask (next.ts:~635) when invoking the internal tasks claim subcommand. Currently passes only claimableTask.taskPath; should pass claimableTask.targetAllowedFiles so the ledger embed allowedFiles aligns with the runtime lock allowedFiles produced by writeTaskDirectionLock at line ~686.

## Why
Dual lock storage (runtime lock file vs ledger embed) diverges because two code paths produce them: line 686 uses correct buildAllowedFilesForTask; line 635 routes through tasks claim subcommand passing only the task path. guard mutation reads ledger embed and rejects deliverable file mutations even though runtime lock would allow them. TASK-AAO-0074 exposed this; TASK-AAO-0062 fixed tasks claim but not next --claim --prompt.

## Acceptance
- After `next --claim --actor X --prompt "TASK-AAO-XXXX"`, the ledger embed `taskDirectionLock.allowedFiles` and `claim.files` both contain the card's deliverables (not only `.atm/history/...` self-allow paths)
- `validateNextClaimPromptScopeConsistency` passes
- tasks claim (0062 path) behavior unchanged (bitwise compat verified)
