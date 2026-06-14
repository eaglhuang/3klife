---
task_id: TASK-CID-0089
doc_id: doc_cid_0089
title: "Integration drift remediation UX"
status: planned
owner: atm-core
priority: P0
milestone: M18
related_plan: docs/ai_atomic_framework/cid-hardening/atm-tasks-command-atomic-map-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
depends_on:
  - "TASK-CID-0088"
scopePaths:
  - "packages/cli/src/commands/doctor.ts"
  - "packages/cli/src/commands/integration.ts"
  - "scripts/validate-agent-pack-onboarding.ts"
  - "scripts/validate-cli.ts"
deliverables:
  - "packages/cli/src/commands/doctor.ts"
  - "packages/cli/src/commands/integration.ts"
  - "scripts/validate-agent-pack-onboarding.ts"
  - "scripts/validate-cli.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:agent-pack-onboarding"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert if integration drift diagnostics become less actionable or hide hash mismatches."
atomizationImpact:
  ownerAtomOrMap: "atm.integration-drift-remediation"
  mapUpdates:
    - "packages/cli/src/commands/doctor.ts"
    - "packages/cli/src/commands/integration.ts"
outOfScope:
  - "Automatically overwriting user-modified integration files without an explicit command"
  - "Changing adapter installation layout"
nonGoals:
  - "Do not demote real hash mismatches to success."
---

# TASK-CID-0089 - Integration drift remediation UX

## Goal

Make integration drift diagnostics point operators to the exact verify and
repair commands needed for each failed adapter.

## Trigger

`doctor` can report `ATM_DOCTOR_INTEGRATION_DRIFT`, but the current operator
guidance is still generic and does not provide a precise remediation command
sequence for drifted files.

## Required Behavior

- `doctor` should expose failed adapter ids and drifted file paths in the
  recommended action payload.
- The remediation text should name verify and reinstall/refresh commands.
- Existing manifest hash mismatch detection must remain strict.

## Acceptance Criteria

- Drift diagnostics identify adapter id, manifest path, and drifted file paths.
- Operator guidance names the exact `integration verify` and `integration add`
  commands for affected adapters.
- Existing integration validators remain green.

## Validation

```powershell
npm run typecheck
npm run validate:agent-pack-onboarding
npm run validate:cli
git diff --check
```
