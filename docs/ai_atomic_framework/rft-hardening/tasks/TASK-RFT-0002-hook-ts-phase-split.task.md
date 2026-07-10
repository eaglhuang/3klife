---
doc_id: doc_rft_0002
task_id: TASK-RFT-0002
title: "hook.ts split by phase"
status: done
owner: atm-core
priority: P0
milestone: RFT-M1
depends_on: []
related_plan: docs/ai_atomic_framework/rft-hardening/atm-cli-oversized-module-refactor-plan.md
related_skill: .agents/skills/atm-atom-map-refactor
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/hook.ts"
  - "packages/cli/src/commands/hook/pre-commit.ts"
  - "packages/cli/src/commands/hook/pre-push.ts"
  - "packages/cli/src/commands/hook/git-hooks-installer.ts"
  - "packages/cli/src/commands/hook/git-index-diagnostics.ts"
  - "packages/cli/src/commands/hook/commit-range-guard.ts"
  - "packages/cli/src/commands/hook/__tests__/pre-commit.spec.ts"
  - "packages/cli/src/commands/hook/__tests__/pre-push.spec.ts"
  - "packages/cli/src/commands/hook/__tests__/git-hooks-installer.spec.ts"
  - "packages/cli/src/commands/hook/__tests__/git-index-diagnostics.spec.ts"
  - "packages/cli/src/commands/hook/__tests__/commit-range-guard.spec.ts"
  - "scripts/validate-hook-atomic-map.ts"
  - "docs/reports/hook-command-atomic-map.md"
deliverables:
  - "packages/cli/src/commands/hook.ts"
  - "packages/cli/src/commands/hook/pre-commit.ts"
  - "packages/cli/src/commands/hook/pre-push.ts"
  - "packages/cli/src/commands/hook/git-hooks-installer.ts"
  - "packages/cli/src/commands/hook/git-index-diagnostics.ts"
  - "packages/cli/src/commands/hook/commit-range-guard.ts"
  - "packages/cli/src/commands/hook/__tests__/pre-commit.spec.ts"
  - "packages/cli/src/commands/hook/__tests__/pre-push.spec.ts"
  - "packages/cli/src/commands/hook/__tests__/git-hooks-installer.spec.ts"
  - "packages/cli/src/commands/hook/__tests__/git-index-diagnostics.spec.ts"
  - "packages/cli/src/commands/hook/__tests__/commit-range-guard.spec.ts"
  - "scripts/validate-hook-atomic-map.ts"
  - "docs/reports/hook-command-atomic-map.md"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-hook-atomic-map.ts"
  - "node --strip-types packages/cli/src/commands/hook/__tests__/pre-commit.spec.ts"
  - "node --strip-types packages/cli/src/commands/hook/__tests__/pre-push.spec.ts"
  - "node --strip-types packages/cli/src/commands/hook/__tests__/git-hooks-installer.spec.ts"
  - "node --strip-types packages/cli/src/commands/hook/__tests__/git-index-diagnostics.spec.ts"
  - "node --strip-types packages/cli/src/commands/hook/__tests__/commit-range-guard.spec.ts"
  - "npm run validate:git-head-evidence"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert if the split changes any pre-commit or pre-push exit code, blocking-finding shape, or repair-hint text."
atomizationImpact:
  ownerAtomOrMap: "atm.hook-command-atomic-map"
  mapUpdates:
    - "docs/reports/hook-command-atomic-map.md"
outOfScope:
  - "Changing pre-commit or pre-push exit codes"
  - "Changing the install-git-hooks output format"
  - "Modifying hook/context-map-advisor.ts (existing sibling)"
  - "Adding new hook phases"
nonGoals:
  - "Do not consolidate git hook installation steps; keep them as separate phases."
  - "Do not silently swallow stderr from sandboxed git failures."
completed_at: "2026-07-10T00:38:46.037Z"
completed_by_agent: "cursor-composer-rft0002"
closedAt: "2026-07-10T00:38:46.037Z"
closedByActor: "cursor-composer-rft0002"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-10T00-38-46-037Z-close-2be1b96fd4c1"
lastTransitionAt: "2026-07-10T00:38:46.037Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "b5229d64b1a2c1990c76754a4d3cf832e7ddc72b"
---

# TASK-RFT-0002 - hook.ts split by phase

## Goal

Reduce `packages/cli/src/commands/hook.ts` (3,429 lines as of 2026-06-20, second-largest open RFT surface) into a thin Facade by extracting one module per hook phase plus dedicated modules for git-hook installation and git-index diagnostics.

## Atom/Map Extraction Pattern

Use the `atm-atom-map-refactor` skill (`Strategy Map` + `Facade`). Per the skill's casebook RFT-0002 forward case:

1. **`hook/pre-commit.ts`** — owns `runPreCommitHook`, `buildPreCommitBlockingFindings`, `buildPreCommitFailureEnvelope`, `buildPreCommitRepairHints`, `isPreCommitBaselineFinding`, `isPreCommitEnvironmentFinding`.
2. **`hook/pre-push.ts`** — owns `runPrePushHook`, `createPrePushEnforcementDecision`, `readFrameworkCommitRangeBaseline`, `isCommitAcceptedByLegacyBaseline`, `isAncestorCommit`, `runRequiredFrameworkValidators`, `runCommandForReport`.
3. **`hook/commit-range-guard.ts`** — owns `runCommitRangeGuard`, `createCommitRangeGuardReport`.
4. **`hook/git-hooks-installer.ts`** — owns `inspectGitHooks`, `installGitHooks`, `runGitHooks`, `GitHookInspectionReport`, `HookFileInspection`.
5. **`hook/git-index-diagnostics.ts`** — owns `inspectGitIndexAccess`, `classifyGitIndexFailure`, `classifySandboxGitFailure`, `classifyGitIndexPermissionFailure`.
6. **`hook.ts`** — thin Facade routing `runHook(argv)` to the right phase module.

The existing sibling `hook/context-map-advisor.ts` is NOT touched.

## Required Behavior

- `node atm.mjs hook pre-commit` exit code, stderr text, and JSON evidence shape must be byte-identical to the pre-split version on the same input.
- `node atm.mjs hook pre-push` same invariant.
- `node atm.mjs hook install` same invariant.
- All exported symbols currently used by callers (`runHook`, `runGitHooks`, `runCommitRangeGuard`, `inspectGitHooks`, `installGitHooks`) must re-export from `hook.ts` for backwards compatibility.
- `hook.ts` after the split must be under 600 lines.
- The atomic-map report `docs/reports/hook-command-atomic-map.md` enumerates each phase module, its public surface, and a before/after line count table.

## Testing Requirements

Each phase module needs a focused spec with **at least three cases**:

- `pre-commit.spec.ts`:
  - one passing case (clean tree, expected validators all pass);
  - one blocking case (`ATM_HOOK_PRE_COMMIT_FAILED` with `commit-attribution` classification, matching the TASK-CID-0073 closeout scenario);
  - one repair-hint case asserting that `buildPreCommitRepairHints` returns the deterministic `node atm.mjs git commit --actor <id> --task <id> ...` template;
  - one environment-finding case asserting that sandboxed git failures don't poison `baselineFailures`.
- `pre-push.spec.ts`:
  - one passing case;
  - one legacy-baseline-accept case (ancestor commit is in the framework baseline);
  - one rejected-commit case showing the enforcement decision shape;
  - one ATM_RUNNER_SYNC_REQUIRED interaction case.
- `commit-range-guard.spec.ts`:
  - one passing case;
  - one violation case (commit range includes a forbidden path);
  - one boundary case (base equals head, empty range).
- `git-hooks-installer.spec.ts`:
  - one fresh-install case;
  - one re-install case showing idempotency;
  - one inspection-only case.
- `git-index-diagnostics.spec.ts`:
  - one readable-index case;
  - one permission-denied case (`classifyGitIndexPermissionFailure` returns true);
  - one sandbox failure case (`classifySandboxGitFailure` returns true).

Add `scripts/validate-hook-atomic-map.ts` that asserts:

- five new phase modules exist;
- each has at least one spec under `hook/__tests__/`;
- `hook.ts` line count is below 600;
- `runHook`, `runGitHooks`, `runCommitRangeGuard`, `inspectGitHooks`, `installGitHooks` are still exported from `hook.ts`.

## Validation

```powershell
npm run typecheck
npm run validate:cli
node --strip-types scripts/validate-hook-atomic-map.ts
node --strip-types packages/cli/src/commands/hook/__tests__/pre-commit.spec.ts
node --strip-types packages/cli/src/commands/hook/__tests__/pre-push.spec.ts
node --strip-types packages/cli/src/commands/hook/__tests__/git-hooks-installer.spec.ts
node --strip-types packages/cli/src/commands/hook/__tests__/git-index-diagnostics.spec.ts
node --strip-types packages/cli/src/commands/hook/__tests__/commit-range-guard.spec.ts
npm run validate:git-head-evidence
git diff --check
```

## Closing

Use `taskflow open --write` / `taskflow close --write`. No raw `git commit`, no backend `tasks close`.
