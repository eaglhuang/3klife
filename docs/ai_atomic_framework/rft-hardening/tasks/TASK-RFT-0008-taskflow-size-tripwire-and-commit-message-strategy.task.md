---
doc_id: doc_rft_0008
task_id: TASK-RFT-0008
title: "taskflow close fast validation surface and test atom decomposition"
status: planned
owner: atm-core
priority: P2
milestone: RFT-M1
depends_on: []
related_plan: docs/ai_atomic_framework/rft-hardening/atm-cli-oversized-module-refactor-plan.md
related_skill: .agents/skills/atm-atom-map-refactor
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
planning_refresh_at: "2026-06-19"
planning_refresh_reason: "Close validation speed is now the primary objective. Production taskflow.ts main-body size reduction moved to TASK-RFT-0009."
previous_delivery_commit: "56413eea628c5078675aa877e052f474143d5729"
previous_closure_commit: "16feaf01552ab171f555f96451a8c0e6ede3c638"
previous_runner_sync_commit: "637cfcb87d57c1290e7cafaf1993fbe9f98d54e3"
previous_focused_regression_commit: "81a1fbf3ea7c604300e95318945089317373347e"
previous_closure_packet: ".atm/history/evidence/TASK-RFT-0008.closure-packet.json"
scopePaths:
  - "packages/cli/src/commands/taskflow/commit-messages.ts"
  - "packages/cli/src/commands/taskflow/__tests__/commit-messages.spec.ts"
  - "packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts"
  - "packages/cli/src/commands/taskflow/__tests__/close-gates-focused.spec.ts"
  - "packages/cli/src/commands/taskflow/__tests__/fixtures/dual-repo.ts"
  - "packages/cli/src/commands/taskflow/__tests__/fixtures/taskflow-close.ts"
  - "packages/cli/src/commands/taskflow/__tests__/fixtures/broker-state.ts"
  - "packages/cli/src/commands/taskflow/__tests__/fixtures/commit-queue-state.ts"
  - "packages/cli/src/commands/taskflow/__tests__/assertions/write-readiness.ts"
  - "packages/cli/src/commands/taskflow/__tests__/assertions/close-result.ts"
  - "scripts/validate-taskflow-size-tripwire.ts"
  - "docs/specs/taskflow-profile-v1.md"
deliverables:
  - "packages/cli/src/commands/taskflow/commit-messages.ts"
  - "packages/cli/src/commands/taskflow/__tests__/commit-messages.spec.ts"
  - "packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts"
  - "packages/cli/src/commands/taskflow/__tests__/close-gates-focused.spec.ts"
  - "packages/cli/src/commands/taskflow/__tests__/fixtures/dual-repo.ts"
  - "packages/cli/src/commands/taskflow/__tests__/fixtures/taskflow-close.ts"
  - "packages/cli/src/commands/taskflow/__tests__/fixtures/broker-state.ts"
  - "packages/cli/src/commands/taskflow/__tests__/fixtures/commit-queue-state.ts"
  - "packages/cli/src/commands/taskflow/__tests__/assertions/write-readiness.ts"
  - "packages/cli/src/commands/taskflow/__tests__/assertions/close-result.ts"
  - "scripts/validate-taskflow-size-tripwire.ts"
  - "docs/specs/taskflow-profile-v1.md"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types packages/cli/src/commands/taskflow/__tests__/commit-messages.spec.ts"
  - "node --strip-types packages/cli/src/commands/taskflow/__tests__/close-gates-focused.spec.ts"
  - "node --strip-types packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts"
  - "npm run validate:git-head-evidence"
  - "git diff --check"
diagnosticValidators:
  - "node --strip-types scripts/validate-taskflow-size-tripwire.ts"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert if close gate semantics change, commit message templates change, or the focused close regression surface stops matching the broad dry-run surface."
atomizationImpact:
  ownerAtomOrMap: "atm.taskflow-close-validation-surface"
  mapUpdates:
    - "docs/specs/taskflow-profile-v1.md"
    - "taskflow close dry-run layered test surface"
outOfScope:
  - "Splitting taskflow.ts production close orchestration beyond the commit-message Strategy Map seam in this card"
  - "Reducing taskflow.ts below the size tripwire threshold; this is owned by TASK-RFT-0009"
  - "Changing taskflow open runtime behavior"
  - "Changing taskflow close semantics while extracting test atoms"
  - "Changing writeReadinessHint contract ownership"
  - "Changing the default close commit message strings"
nonGoals:
  - "Do not replace the broad integration file with only focused specs."
  - "Do not make focused specs the only place where close gates are exercised."
  - "Do not add host-specific commit message customization behavior beyond the Strategy Map seam."
  - "Do not use this card to perform the production taskflow.ts main-body split."
---

# TASK-RFT-0008 - taskflow close fast validation surface and test atom decomposition

## Goal

Make `taskflow close` validation faster without changing close semantics.

This card is the close regression acceleration card. It keeps the existing commit-message Strategy Map seam, but the main delivery is a layered test surface:

1. keep commit-message templates in a Strategy Map so future host customization has a single seam;
2. make `close-gates-focused.spec.ts` the fast validator for high-risk `taskflow close` blockers;
3. extract fixture, injection, invocation, and assertion helpers into reusable test atoms;
4. keep `taskflow-dryrun.spec.ts` as a representative broad integration surface, not the only regression sink.

Production-side `taskflow.ts` main-body size reduction is intentionally deferred to `TASK-RFT-0009`.

## Why This Card Changed

The original card assumed new regressions should keep being added to the giant `taskflow-dryrun.spec.ts`.

That is no longer enough.

`taskflow-dryrun.spec.ts` is still valuable as the broad integration surface, but it is too heavy for fast repair loops. This card now records the intended steady state for close validation speed:

1. broad integration coverage stays in the giant spec;
2. fast close-gate regressions move into focused specs;
3. repeated setup, state injection, invocation, and assertions become reusable test atoms;
4. the test atom split should mirror the future atom/map split of `taskflow` itself;
5. the size tripwire stays as a diagnostic pressure signal, but this card does not have to shrink `taskflow.ts` below the threshold.

## Atom/Map Extraction Pattern

Use the `atm-atom-map-refactor` skill.

This card defines one small production seam and a larger test seam. The test seam is the primary delivery.

### Production seam

1. **`taskflow/commit-messages.ts`**  
   Strategy Map keyed by repo role: `{ target: (taskId) => string, planning: (taskId) => string }`.
   Default templates remain:
   - target: `` `chore(taskflow): close ${taskId} target governance bundle` ``
   - planning: `` `docs(taskflow): close ${taskId} planning bundle` ``
2. **`taskflow.ts`**  
   Only touch the call sites needed to preserve the commit-message Strategy Map seam. No close behavior change and no broad production split.
3. **`scripts/validate-taskflow-size-tripwire.ts`**  
   Keep the diagnostic tripwire that prints `ATM_TASKFLOW_SIZE_TRIPWIRE_FIRED` when `taskflow.ts` exceeds **2,200** lines. If it fires, it should point to `TASK-RFT-0009` as the production-size follow-up, not block this card's close validation acceleration proof.
4. **`docs/specs/taskflow-profile-v1.md`**  
   Document optional future `delegation.policy.commitMessage.targetTemplate` and `planningTemplate` fields without consuming them yet.

### Test seam

Extract reusable test atoms from `taskflow-dryrun.spec.ts` and `close-gates-focused.spec.ts` along semantic boundaries, not line-count boundaries:

1. `fixtures/dual-repo.ts`
2. `fixtures/taskflow-close.ts`
3. `fixtures/broker-state.ts`
4. `fixtures/commit-queue-state.ts`
5. `assertions/write-readiness.ts`
6. `assertions/close-result.ts`

Move fast close-path regressions into `close-gates-focused.spec.ts`.

Keep `taskflow-dryrun.spec.ts` as the broad integration surface, but reduce it to representative end-to-end close flows over time.

## Required Behavior

- `taskflow close --write` produces the exact same commit messages as before this card.
- The size tripwire remediation text points to `TASK-RFT-0009`.
- The Strategy Map signature is documented in `docs/specs/taskflow-profile-v1.md`.
- `taskflow-dryrun.spec.ts` remains the broad integration surface for close behavior, but no longer owns every close-gate regression.
- `close-gates-focused.spec.ts` becomes the preferred quick validator for high-risk close blockers.
- Extracted test atoms must not change close semantics; they only remove duplicated fixture setup, state injection, invocation, and assertion code.
- The focused close validator must run successfully on its own and be the recommended first validator for close-gate repair loops.

## Decomposition Plan

### Layer 1: test atoms

Extract these helpers first:

1. `makeDualRepoFixture()`
2. `makeClosableTaskFixture()`
3. `writeBrokerRegistry()`
4. `writeBranchCommitQueueLock()`
5. `runCloseDryRun()`
6. `expectBlocked(code)`
7. `expectGateStatus(path, value)`
8. `expectCloseHappyPath()`

### Layer 2: focused specs

Move high-risk, single-gate close regressions into focused specs:

1. stale lease epoch
2. branch commit queue busy
3. confirmed conflict / takeover-required blockers
4. other single blocker-code regressions

### Layer 3: broad integration spec

Keep `taskflow-dryrun.spec.ts` to representative end-to-end scenes:

1. happy path close
2. planning closeback / cross-repo close
3. governed commit bundle / closure packet representative path
4. one representative integrated close-gate path

The broad integration file must keep at least one representative close-gate path so focused specs never become the only place where that gate is exercised.

## Testing Requirements

### `commit-messages.spec.ts`

- one default target template case (`taskId = TASK-RFT-0008`);
- one default planning template case;
- one override case showing a profile-provided strategy override applies;
- one override-missing case showing the default still fires;
- one variable-substitution case proving `${taskId}` string interpolation is not a supported raw-template surface.

### `taskflow-dryrun.spec.ts`

Keep representative integration coverage:

- one case asserting that the auto-commit fixture's commit messages match the Strategy Map default exactly;
- one representative happy-path close flow;
- one representative planning closeback / cross-repo close flow;
- one representative close-gate integration case proving the gate is still connected inside the real close pipeline.

### `close-gates-focused.spec.ts`

Use as the fast regression surface:

- `leaseEpoch < currentEpoch` blocks close with the expected blocker code;
- branch commit queue busy blocks close with the expected blocker code;
- future single-gate close blockers should land here first unless they are specifically about whole-pipeline orchestration.

### Extracted test atoms

- dual-repo fixture construction must be reusable across dry-run scenarios;
- broker registry injection must be reusable without re-embedding JSON in every test;
- branch commit queue injection must be reusable without duplicated inline lock writers;
- blocker and gate-status assertions must be reusable across focused and integration specs.

## Atom Map Targets

The extracted test surface should map to these test atoms:

1. `fixture.dual-repo`
2. `fixture.close-task`
3. `inject.broker-state`
4. `inject.commit-queue-state`
5. `invoke.close-dryrun`
6. `assert.write-readiness`
7. `assert.close-result`

The longer-term production-side map this decomposition is preparing for is owned by `TASK-RFT-0009`:

1. `taskflow.close-preflight`
2. `taskflow.write-readiness`
3. `taskflow.broker-gate`
4. `taskflow.branch-commit-queue-gate`
5. `taskflow.closeback-orchestration`
6. `taskflow.commit-bundle-assembly`

## Validation

```powershell
npm run typecheck
npm run validate:cli
node --strip-types packages/cli/src/commands/taskflow/__tests__/commit-messages.spec.ts
node --strip-types packages/cli/src/commands/taskflow/__tests__/close-gates-focused.spec.ts
node --strip-types packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts
npm run validate:git-head-evidence
git diff --check
```

Diagnostic-only during this card:

```powershell
node --strip-types scripts/validate-taskflow-size-tripwire.ts
```

If the diagnostic fires because `taskflow.ts` is already above 2,200 lines, do not widen this card into a production split. Confirm that the output points to `TASK-RFT-0009`.

## Closing

Use `taskflow open --write` / `taskflow close --write`. This card explicitly exercises the closing path it accelerates.

## Historical Notes

- Previous target repo delivery commit: `56413eea628c5078675aa877e052f474143d5729`
- Previous target repo closure commit: `16feaf01552ab171f555f96451a8c0e6ede3c638`
- Previous runner sync steward commit: `637cfcb87d57c1290e7cafaf1993fbe9f98d54e3`
- Previous focused regression follow-up commit: `81a1fbf3ea7c604300e95318945089317373347e`
- Previous closure packet: `.atm/history/evidence/TASK-RFT-0008.closure-packet.json`
- 2026-06-19 captain refresh: close validation speed is now the primary objective. Production `taskflow.ts` main-body size reduction moved to `TASK-RFT-0009`.
