---
doc_id: doc_cid_0075
task_id: TASK-CID-0075
title: "Evidence operator lane simplification and raw-surface demotion"
status: done
owner: atm-core
priority: P1
milestone: M15
depends_on:
  - "TASK-CID-0065"
  - "TASK-CID-0070"
related_plan: docs/ai_atomic_framework/cid-hardening/atm-tasks-command-atomic-map-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/evidence.ts"
  - "packages/cli/src/commands/command-specs/evidence.spec.ts"
  - "scripts/validate-cli.ts"
  - "docs/ATM_NEW_USER_WORKFLOW.md"
  - "README.md"
deliverables:
  - "packages/cli/src/commands/evidence.ts"
  - "packages/cli/src/commands/command-specs/evidence.spec.ts"
  - "scripts/validate-cli.ts"
  - "docs/ATM_NEW_USER_WORKFLOW.md"
  - "README.md"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert if evidence guidance becomes more confusing or blocks legitimate governed evidence capture."
atomizationImpact:
  ownerAtomOrMap: "atm.evidence-operator-guidance-surface"
  mapUpdates:
    - "packages/cli/src/commands/command-specs/evidence.spec.ts"
outOfScope:
  - "Changing closeout evidence gate semantics"
  - "Changing validator execution itself"
  - "Allowing plain terminal runs to count as evidence without ATM capture"
nonGoals:
  - "Do not keep `evidence add` looking like the default first-choice operator path when `evidence run` can do the job."
  - "Do not weaken raw evidence requirements for advanced or admin-only cases."
completed_at: "2026-06-13T14:51:59.552Z"
completed_by_agent: "captain"
delivery_commit: "96eeaec4"
---

# TASK-CID-0075 - Evidence operator lane simplification and raw-surface demotion

## Goal

Align evidence docs, help text, and operator guidance so agents understand that `evidence run` is the normal governed lane for validator-backed evidence, while `evidence add` is the lower-level raw/admin surface for cases where the operator already has exact command-run metadata.

## Problem

The gap report showed that ATM's workflow docs increasingly rely on `evidence run`, but the product still leaves enough ambiguity that an agent can think "I ran a validator in the terminal" is already equivalent to command-backed task evidence. That is a governance UX bug even when the underlying evidence gate still works.

## Required Behavior

- Workflow docs and examples must prefer `node atm.mjs evidence run ...` for normal validator capture.
- `evidence add` help/spec/docs must explicitly say it is the raw/manual surface and list the extra fields required when using it correctly.
- CLI help and examples should make it obvious when to choose:
  - `evidence run`;
  - `evidence add`;
  - ordinary terminal execution followed by no evidence, which must not be implied as sufficient.
- Where ATM emits remediation or required-command guidance for missing validator evidence, it should prefer `evidence run` unless a raw/manual surface is specifically required.
- `validate:cli` coverage must prove the wording distinction and any required-command preference updates.

## Acceptance Criteria

- The new-user workflow and relevant CLI help show `evidence run` as the normal operator command for validator capture.
- `evidence add` is clearly marked as raw/manual/admin-oriented and no longer reads as the easiest default path.
- At least one missing-evidence remediation path recommends `evidence run` as the default governed recovery command.
- `npm run validate:cli` covers the wording and guidance distinction.

## Validation

```powershell
npm run typecheck
npm run validate:cli
git diff --check
```

## Report Back

Report the new operator guidance for `evidence run`, the exact wording change that demotes `evidence add` to a raw/manual surface, and the remediation paths now updated to prefer governed evidence capture.
