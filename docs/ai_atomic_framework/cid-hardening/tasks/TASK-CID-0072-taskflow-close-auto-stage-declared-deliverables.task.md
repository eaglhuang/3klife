---
doc_id: doc_cid_0072
task_id: TASK-CID-0072
title: "Taskflow close auto-stage declared deliverables"
status: done
started_at: "2026-06-13T19:59:11+08:00"
started_by_agent: "Antigravity"
owner: atm-core
priority: P0
milestone: M8
depends_on:
  - "TASK-CID-0063"
  - "TASK-CID-0071"
related_plan: docs/ai_atomic_framework/cid-hardening/atm-tasks-command-atomic-map-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts"
  - "scripts/validate-task-ledger-governance.ts"
  - "docs/specs/taskflow-profile-v1.md"
deliverables:
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts"
  - "scripts/validate-task-ledger-governance.ts"
  - "docs/specs/taskflow-profile-v1.md"
targetAllowedFiles:
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts"
  - "scripts/validate-task-ledger-governance.ts"
  - "docs/specs/taskflow-profile-v1.md"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-task-ledger-governance.ts --mode validate"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert taskflow close bundle changes if target delivery staging starts including unrelated dirty files."
atomizationImpact:
  ownerAtomOrMap: "atm.taskflow-governed-commit-bundle"
  mapUpdates:
    - "packages/cli/src/commands/taskflow/close-orchestration.ts"
outOfScope:
  - "Changing emergency lane authorization semantics"
  - "Changing taskflow open behavior"
  - "Redesigning tasks close/reconcile backend semantics"
  - "Committing or cleaning legacy unrelated dirty files"
nonGoals:
  - "Do not rely on agent judgment to manually stage deliverables."
  - "Do not stage every dirty file in the repository."
  - "Do not require a pre-existing source delivery commit when uncommitted declared deliverables are present and in scope."
completed_at: "2026-06-13T14:24:37.323Z"
completed_by_agent: "captain"
lastTransitionId: "2026-06-13T14-24-37-201Z-close-5a4dae2774b1"
delivery_commit: "7f78ea0e0a52bf50b43af024cb21d595e80752e1"
---

# TASK-CID-0072 - Taskflow close auto-stage declared deliverables

## Goal

Make `taskflow close` deterministic enough that an ordinary AI operator does not need to manually notice and stage task deliverables before closeout.

When a task has uncommitted target deliverables that are declared by the task card and allowed by the active task direction lock, `taskflow close --write` must include those files in the governed target commit bundle together with the `.atm` closeout artifacts.

The primary decision about what belongs in the bundle must come from CLI-computable rules, not from LLM judgment.

## Why

TASK-CID-0071 exposed an important gap: `taskflow close --dry-run` correctly previewed the `.atm` governance bundle and the 3KLife planning card, but did not include the new skill files that were the actual task deliverables. A careful Captain compensated with a manual source delivery commit, but ATM cannot depend on every agent noticing that omission.

The normal operator lane should be able to answer: "What exact files should be staged and committed for this task?" without asking the model to infer it from chat history.

LLM assistance is still useful, but only as a review layer after the CLI has already produced a deterministic dry-run prediction. The model may point out suspected omissions or suspicious inclusions, but it must not be the authority that decides the bundle.

## Required Behavior

- Before source edits, run the repo-local skill `atm-atom-map-refactor` as a preflight lens.
- Use the skill to classify whether this task exposes a small in-scope atom/map extraction opportunity, but keep deterministic bundle computation as the primary goal.
- Allowed opportunistic extraction is limited to a named helper/module/result-contract split that stays fully inside this card's declared scope and reduces ambiguity in the bundle algorithm.
- If the skill identifies a larger or cross-card extraction, record it in the report as a follow-up atom candidate instead of widening TASK-CID-0072.
- The target delivery bundle algorithm must be deterministic and CLI-computable from repository state plus governed task metadata. It must not require semantic interpretation of chat history or freeform model reasoning.
- The primary inputs must be machine-readable task sources such as:
  - `deliverables`
  - `scopePaths`
  - `targetAllowedFiles`
  - active task direction lock
  - live tracked/untracked working tree state
  - optional `--historical-delivery <sha>` commit diff
- `taskflow close` must compute the target delivery stage set from those inputs before any commit decision is made.
- The algorithm priority order must be explicit and stable:
  - active direction lock / `targetAllowedFiles` define the hard outer boundary;
  - `deliverables` define the primary source-delivery intent;
  - `scopePaths` provide secondary in-scope candidates when they also satisfy the hard boundary;
  - task-scoped `.atm` closeout artifacts are governance-only allowlisted outputs;
  - `--historical-delivery` only subtracts already-committed source deliverables from the stage set and must not expand scope by itself.
- Extend `atm.taskflowGovernedCommitBundle.v1` so `targetRepo.stageFiles` includes:
  - generated closeout artifacts for the task;
  - uncommitted target deliverable files declared in `deliverables`, `scopePaths`, or `targetAllowedFiles`;
  - only files that are inside the task's declared target scope or explicitly allowed governance outputs.
- `taskflow close --dry-run` must preview the same target delivery stage set without mutating the index.
- `taskflow close --dry-run` must expose enough structured data for human or LLM review to compare:
  - predicted target deliverable files;
  - predicted governance files;
  - excluded dirty files and why they were excluded.
- The dry-run output contract must be structured enough to support deterministic review and assertions. At minimum it must distinguish:
  - `targetDeliveryFiles`
  - `targetGovernanceFiles`
  - `planningFiles`
  - `excludedDirtyFiles`
  - `excludedReasons`
- `taskflow close --write --no-commit` must exact-path stage:
  - target deliverables;
  - target closeout artifacts;
  - planning repo closeback files.
- `taskflow close --write` default auto-commit must commit the target deliverables and target closeout artifacts as the same governed target bundle when those deliverables are still uncommitted.
- If the operator supplies `--historical-delivery`, taskflow must not re-stage source files that are already committed by that historical delivery; it should still stage closeout artifacts.
- If declared deliverable files cannot be computed, `taskflow close` must fail closed before commit with a named diagnostic.
- If unrelated dirty files exist outside task scope, they must not enter `targetRepo.stageFiles`; they may appear only as scoped-diff advisory data.
- If dirty files exist inside task scope but are not declared or direction-lock allowed, close must fail closed instead of silently staging them.
- The governed bundle result must expose a deterministic distinction between:
  - `targetDeliveryFiles` or equivalent source deliverable stage set;
  - `targetGovernanceFiles`;
  - `planningFiles`.
- If task metadata is insufficient to compute a unique delivery stage set, `taskflow close` must fail closed instead of guessing. This includes cases such as:
  - empty or missing `deliverables` with broad `scopePaths`;
  - `deliverables` that fall outside the active direction lock;
  - mixed planning-path and target-path declarations that cannot be partitioned deterministically;
  - directory-style declarations whose concrete dirty-file expansion is ambiguous.
- Fail-closed metadata diagnostics must point operators toward governed remediation such as fixing task metadata or rerunning `tasks import`, not toward manual bundle curation.
- LLM review may be used after dry-run to flag a possible miss or false inclusion, but the remediation path must still be a governed CLI path:
  - fix task metadata;
  - fix deterministic bundle computation;
  - rerun dry-run;
  - never silently let the model append ad hoc files to the commit bundle.

## Acceptance Criteria

- A fixture task with untracked declared deliverables shows those files in `taskflow close --dry-run` `governedCommitBundle.targetRepo.stageFiles`.
- `taskflow close --write --no-commit` stages untracked declared deliverables plus `.atm` closeout artifacts, and leaves unrelated dirty files unstaged.
- `taskflow close --write` auto-commits a target bundle containing both declared deliverables and closeout artifacts when the deliverables were not pre-committed.
- A task closed with `--historical-delivery <sha>` does not re-stage already committed deliverable files, but still commits closeout artifacts.
- Missing or ambiguous deliverable stage computation fails closed with a stable diagnostic code.
- Regression coverage prevents the TASK-CID-0071 failure mode: a new skill/file deliverable cannot be omitted from the close bundle preview.
- Dry-run output is specific enough that an LLM or human reviewer can compare the predicted bundle against the task contract, but changing the bundle still requires changing governed inputs or the deterministic algorithm.
- A fixture with multiple declared deliverables but only a subset changed stages exactly the changed in-scope deliverables, without forcing untouched declared files into the commit bundle.
- A fixture with incomplete or contradictory metadata fails closed with a stable diagnostic and a remediation path that points back to governed metadata repair.

## Algorithm Notes

- Treat this as a set-calculation problem, not an intent-interpretation problem.
- The preferred mental model is:
  - start from dirty/untracked target files;
  - intersect with the hard boundary from direction lock / `targetAllowedFiles`;
  - classify files into `targetDeliveryFiles`, `targetGovernanceFiles`, or excluded buckets;
  - subtract files already covered by `--historical-delivery` when applicable;
  - fail closed if the remaining stage set cannot be justified from governed metadata.
- Do not use plain `scopePaths` as an unconditional stage list. They describe allowed work, not automatic inclusion.
- Do not use `deliverables` as an unconditional stage list either. They define the intended delivery universe, but only changed files from that universe should enter the bundle for the current close.

## Validation

```powershell
npm run typecheck
npm run validate:cli
node --strip-types scripts/validate-task-ledger-governance.ts --mode validate
git diff --check
```

## Report Back

Report the exact bundle schema fields added or reused, the fixture scenario that proves uncommitted deliverables are included, the status of unrelated dirty-file exclusion, and whether the refactor skill found an in-scope atom/map extraction worth keeping.
