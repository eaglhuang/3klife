---
doc_id: doc_cid_0073
task_id: TASK-CID-0073
title: "Taskflow operator guidance and backend wording normalization"
status: done
owner: atm-core
priority: P1
milestone: M15
depends_on:
  - "TASK-CID-0063"
  - "TASK-CID-0066"
  - "TASK-CID-0070"
related_plan: docs/ai_atomic_framework/cid-hardening/atm-tasks-command-atomic-map-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/command-specs/taskflow.spec.ts"
  - "packages/cli/src/commands/command-specs/next.spec.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts"
  - "scripts/validate-cli.ts"
  - "tests/cli-fixtures/help-snapshots/next.json"
  - "docs/specs/taskflow-profile-v1.md"
  - "docs/ATM_NEW_USER_WORKFLOW.md"
deliverables:
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/command-specs/taskflow.spec.ts"
  - "packages/cli/src/commands/command-specs/next.spec.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts"
  - "scripts/validate-cli.ts"
  - "tests/cli-fixtures/help-snapshots/next.json"
  - "docs/specs/taskflow-profile-v1.md"
  - "docs/ATM_NEW_USER_WORKFLOW.md"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert if the guidance rewrite makes correct operator paths harder to discover or regresses existing taskflow/operator commands."
atomizationImpact:
  ownerAtomOrMap: "atm.taskflow-operator-guidance-surface"
  mapUpdates:
    - "docs/specs/taskflow-profile-v1.md"
outOfScope:
  - "Changing taskflow close bundle semantics"
  - "Changing emergency lease validation rules"
  - "Adding a second task opener lifecycle"
nonGoals:
  - "Do not leave fallback-mode write failure discoverable only by reading raw dry-run JSON."
  - "Do not keep `tasks new` or `tasks import` worded as co-equal operator defaults when taskflow open exists."
completed_at: "2026-06-13T13:31:42.133Z"
completed_by_agent: "004"
delivery_commit: "235fd821"
---

# TASK-CID-0073 - Taskflow operator guidance and backend wording normalization

## Goal

Close the operator-guidance gap from the document-versus-code report so ATM's CLI help, dry-run diagnostics, and first-day workflow docs all describe the same normal lane.

The target outcome is that an ordinary operator can tell, from CLI output alone, whether they are on the official taskflow lane, in fallback-only mode, or about to touch a low-level backend surface.

## Required Behavior

- Before source edits, run the repo-local skill `atm-atom-map-refactor` in review mode.
- Use it to check whether the wording/help changes naturally suggest a tiny in-scope extraction such as a guidance helper, result-contract formatter, or backend-surface labeling map.
- Only keep the extraction if it is small, named, and entirely inside this card's scope. Otherwise record the atom candidate and continue with the wording fix directly.
- `taskflow open --dry-run` must emit a top-level write-readiness hint when the loaded profile is in fallback mode and `--write` would fail closed.
- The hint must name the missing prerequisite or the exact explicit flags still required, instead of forcing the operator to infer that from nested policy fields.
- Docs and examples must stop implying a framework-repo local `docs/taskflow.profile.json`; they must point to adopter-owned or planning-repo-owned profile paths.
- When ATM already knows the selected task during claim guidance, the recommended claim action should prefer an explicit task-scoped form such as `--task TASK-CID-XXXX` rather than forcing a second natural-language prompt hop.
- `tasks new` must be labeled as a low-level template generator/backend surface in help text and workflow docs.
- `tasks import` must be described as a backend/runtime synchronization surface, not as the ordinary official opener lane.
- `next`, `taskflow`, and the new-user workflow docs must use the same wording for:
  - operator lane;
  - fallback-only mode;
  - backend/emergency surfaces;
  - required next command examples.

## Acceptance Criteria

- A dry-run opener in fallback mode emits a user-facing readiness hint that clearly says `--write` will fail closed and what must be fixed.
- Workflow docs no longer instruct framework-repo users to rely on a nonexistent local `docs/taskflow.profile.json`.
- At least one `next` claim guidance path emits an explicit task-scoped claim command when the selected task is already known.
- Help/spec/docs label `tasks new` as generation-only and `tasks import` as backend/runtime sync, not as normal operator defaults.
- `npm run validate:cli` proves the new wording and recommended-action contract.

## Validation

```powershell
npm run typecheck
npm run validate:cli
git diff --check
```

## Report Back

Report the new fallback readiness hint, the updated profile-path examples, the claim-command normalization, the exact backend wording changes for `tasks new` / `tasks import`, and any small atom/map extraction retained or deferred after using the refactor skill.
