---
doc_id: doc_cid_0074
task_id: TASK-CID-0074
title: "Taskflow close profile-root fallback when source plan path is missing"
status: done
started_at: 2026-06-13T20:05:00+08:00
started_by_agent: cursor-composer-2.5
completed_at: 2026-06-13T20:16:00+08:00
completed_by_agent: 008
notes: |
  狀態: AI-Atomic-Framework 已交付並完成 governed closeout（delivery 37a148e7、close bundle 6c709a7b）。
  驗證: evidence missing 7/7 PASS；typecheck / validate:cli / validate-task-ledger-governance / taskflow-dryrun 全 PASS。
  變更: close-orchestration 新增 resolveClosebackPlanningPath Result Contract；taskflow close 暴露 closebackPathResolution。
  阻塞: 無；live ledger 與 planning mirror 皆 done，residue no-residue。
owner: atm-core
priority: P0
milestone: M15
depends_on:
  - "TASK-CID-0063"
  - "TASK-CID-0069"
related_plan: docs/ai_atomic_framework/cid-hardening/atm-tasks-command-atomic-map-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
  - "packages/cli/src/commands/taskflow/profile-loader.ts"
  - "packages/cli/src/commands/taskflow/host-opener-policy.ts"
  - "packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts"
  - "scripts/validate-task-ledger-governance.ts"
  - "docs/specs/taskflow-profile-v1.md"
deliverables:
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
  - "packages/cli/src/commands/taskflow/profile-loader.ts"
  - "packages/cli/src/commands/taskflow/host-opener-policy.ts"
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
  notes: "Revert if profile-root fallback starts resolving the wrong planning card or weakens fail-closed closeback behavior."
atomizationImpact:
  ownerAtomOrMap: "atm.taskflow-closeback-path-resolution"
  mapUpdates:
    - "docs/specs/taskflow-profile-v1.md"
outOfScope:
  - "Redesigning taskflow open generation semantics"
  - "Weakening taskflow close fail-closed behavior"
  - "Emergency lease model changes"
nonGoals:
  - "Do not guess a planning path when multiple candidates exist."
  - "Do not require operators to fall back to direct backend close commands just because `source.planPath` is absent."
---

# TASK-CID-0074 - Taskflow close profile-root fallback when source plan path is missing

## Goal

Make `taskflow close` able to recover the planning-side closeback path from governed profile/adaptor metadata when `taskDocument.source.planPath` is missing, instead of failing permanently even though the task still belongs to a valid dual-repo operator contract.

## Problem

The gap report identified a real design hole: some governed tasks can exist in runtime without a durable `source.planPath`, especially after alternate open/import/reserve flows. Today that can make `taskflow close` fail with planning-frontmatter-missing even when the active taskflow profile already knows the planning root and canonical path pattern.

## Required Behavior

- Before source edits, run the repo-local skill `atm-atom-map-refactor` as a path-resolution preflight.
- Use it to decide whether the fallback logic wants a small Result Contract Object, Strategy Map, or Adapter/Port split inside this card's scope.
- Only perform the extraction when it reduces ambiguity and stays fully inside the declared files for TASK-CID-0074. Larger closeback refactors belong in a follow-up task, not in this card.
- If `source.planPath` is missing, `taskflow close` may attempt governed planning-path recovery from:
  - active `--profile`;
  - profile owner repo root;
  - canonical output-path policy;
  - `taskId`;
  - resolver inputs already used by `taskflow open`.
- The fallback must only succeed when it resolves one deterministic planning document path.
- If the recovered path exists and matches the task id, taskflow close may continue normal planning closeback behavior.
- If the recovered path is missing, ambiguous, or inconsistent with the task id/profile contract, taskflow close must fail closed with a named diagnostic.
- Dry-run must surface whether closeback used:
  - direct `source.planPath`;
  - recovered profile-root fallback;
  - fail-closed ambiguity.
- Regression coverage must include a profile-only close case where the runtime task lacks `source.planPath` but the profile can still deterministically resolve the planning card.

## Acceptance Criteria

- `taskflow close --dry-run --task TASK-... --profile <profile>` can recover the planning card path when `source.planPath` is absent but the profile uniquely defines the canonical path.
- `taskflow close --write` can use the recovered planning path to perform planning closeback in the same governed flow.
- If multiple candidate planning paths exist, taskflow close fails closed with a stable ambiguity diagnostic.
- If the recovered path does not exist, taskflow close fails closed with a stable missing-planning-path diagnostic.
- `npm run validate:cli` and `validate-task-ledger-governance` cover the profile-root fallback route.

## Validation

```powershell
npm run typecheck
npm run validate:cli
node --strip-types scripts/validate-task-ledger-governance.ts --mode validate
git diff --check
```

## Report Back

Report the fallback decision inputs, the new diagnostics, one regression proving that a task without `source.planPath` can still close through the normal taskflow lane when the profile makes the planning path deterministic, and whether the refactor skill led to a retained in-scope atom/map split or only a deferred candidate.
