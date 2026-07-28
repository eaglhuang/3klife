---
task_id: TASK-AAO-0145
title: "Auto-generated residue guard and auto-clean before governed commit"
status: done
priority: P0
closure_authority: target_repo
depends_on:
  - TASK-AAO-0141
  - TASK-AAO-0144
scopePaths:
  - "packages/cli/src/commands/hook.ts"
  - "packages/cli/src/commands/git-governance.ts"
  - "packages/cli/src/commands/framework-development.ts"
  - "packages/cli/src/commands/framework-development/closure-packet-schema.ts"
  - "packages/cli/src/commands/command-specs/git.spec.ts"
  - "scripts/validate-governance-commands.ts"
  - "docs/governance/git-governance-contract.md"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
  - "tests/cli/git-commit-task-scoped-staging.test.ts"
deliverables:
  - "packages/cli/src/commands/hook.ts"
  - "packages/cli/src/commands/git-governance.ts"
  - "packages/cli/src/commands/framework-development/closure-packet-schema.ts"
  - "scripts/validate-governance-commands.ts"
  - "docs/governance/git-governance-contract.md"
  - "tests/cli/git-commit-task-scoped-staging.test.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-governance-commands.ts --mode validate"
  - "git diff --check"
atomizationImpact:
  ownerAtomOrMap: "atm.git-governance-map"
  mapUpdates:
    - path_pattern: "packages/cli/src/commands/hook.ts"
      atom_id: "atm.pre-commit-residue-guard"
      capability: "Classify, auto-clean, or block auto-generated residue before governed commit"
      coverage_status: "planned"
outOfScope:
  - "Blindly deleting arbitrary untracked files."
  - "Cleaning another task's staged or unstaged source edits."
  - "Making hook output disappear without an audit trail or classifier."
nonGoals:
  - "Do not weaken close-time or commit-time scope checks."
  - "Do not turn auto-clean into a hidden reset of user-authored work."
contextMap:
  primary:
    - path: "packages/cli/src/commands/hook.ts"
      reason: "pre-commit residue classifier and enforcement"
    - path: "packages/cli/src/commands/git-governance.ts"
      reason: "wrapper-side cleanup and governed staging contract"
    - path: "packages/cli/src/commands/framework-development/closure-packet-schema.ts"
      reason: "dirty/staged/unstaged residue diagnostics already live here"
  tests:
    - path: "scripts/validate-governance-commands.ts"
      reason: "governed commit regression coverage"
    - path: "tests/cli/git-commit-task-scoped-staging.test.ts"
      reason: "task-scoped staging and wrapper behavior"
completed_at: "2026-06-19T16:34:37.625Z"
completed_by_agent: "codex-gpt-5.4-mini"
delivery_commit: "43f5f5d0a02c23ef827330d299310d229d4fb570"
closedAt: "2026-06-19T16:34:37.625Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: "historical planning closeback backfill for TASK-CID-0124"
lastTransitionId: "2026-06-19T16-34-36-760Z-close-6144d8abfaed"
lastTransitionAt: "2026-06-19T16:34:37.625Z"
ledgerContractVersion: "task-ledger/v1"
---

## Goal
Make ATM actively clean or block known auto-generated residue before governed commits, so agents do not leave hook byproducts and transient governance files behind as ambient repo dirt.

## Why
Current behavior is too passive:

- pre-commit and wrapper flows can generate files such as `git-head` evidence, snapshots, or close-window diagnostics;
- those files may remain unstaged or out-of-scope after the real commit succeeds or after a failed commit race;
- agents rarely clean them proactively, so the repo accumulates garbage and later governance decisions become noisy.

This card should define a first-class residue policy: what ATM may auto-clean, what it must block, and what still requires human review.

## Acceptance
- ATM defines an explicit classifier for **auto-generated residue** with at least three buckets:
  - `auto-clean-safe`: deterministic byproducts ATM may restore/remove automatically before or after governed commit.
  - `block-and-explain`: generated files that are outside current scope or belong to another task/run, so commit must stop with a precise diagnostic.
  - `manual-review`: ambiguous files that look generated but cannot be proven safe to delete.
- `hook pre-commit` and the governed git wrapper use the same residue classifier.
- Known safe byproducts are cleaned automatically when they are not part of the intended staged bundle. Initial examples should include current hook-generated evidence residue such as:
  - `.atm/history/evidence/git-head.json`
  - `.atm/history/evidence/git-head.jsonl`
  - close-window or foreign-staged snapshots under `.atm/runtime/snapshots/` when they belong to the current failed/finished operation and are not referenced by live evidence.
- ATM emits an audit-friendly message when auto-clean runs, including which files were removed/restored and why they were classified as safe.
- If the residue is generated but not safe to auto-clean, ATM blocks the commit with a clear code and remediation command instead of silently leaving the repo dirty.
- Regression coverage proves:
  - a safe generated residue file is auto-cleaned;
  - a foreign/generated-but-out-of-scope residue file is blocked;
  - a user-authored dirty file is never auto-cleaned by mistake.

## Exclusion Rules
- Do not treat all `.atm/**` files as garbage.
- Do not auto-clean evidence, task, or task-event files that are already referenced by a live closure packet, active task bundle, or in-progress governed staging lane.
- Do not auto-clean files solely because they are untracked; classifier proof is required.

## Implementation Notes
- Prefer one shared residue classifier/policy object instead of duplicating ad hoc path rules in `hook.ts`, `git-governance.ts`, and framework dirty-state diagnostics.
- The policy should distinguish:
  - generated + reproducible + unreferenced + current-operation-local => auto-clean-safe
  - generated + referenced by evidence/closure/ledger => not garbage
  - generated + foreign task/run ownership => block-and-explain
  - unknown provenance => manual-review
- If a commit fails after hook success because branch `HEAD` moved, the wrapper should re-check and clean only the safe generated residue from the abandoned attempt.

## Verification
```bash
npm run typecheck
npm run validate:cli
node --strip-types scripts/validate-governance-commands.ts --mode validate
git diff --check
```

## Closure & Reports
1. List the initial safe-residue patterns and the reason each is safe.
2. Show one auto-clean success transcript and one block transcript.
3. Confirm the policy does not delete user-authored unstaged work.
