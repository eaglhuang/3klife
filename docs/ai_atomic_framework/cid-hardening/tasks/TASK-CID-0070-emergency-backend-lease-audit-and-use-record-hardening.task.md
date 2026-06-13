---
task_id: TASK-CID-0070
doc_id: doc_cid_0070
title: "Emergency backend lease audit and use-record hardening"
status: done
started_at: "2026-06-13T16:02:10+08:00"
completed_at: "2026-06-13T16:15:54+08:00"
started_by_agent: "captain"
completed_by_agent: "captain"
target_delivery_commit: "2ba7ae1a521bec0c2ba0a3e16912f113fb453405"
target_close_commit: "d744289a194d78d698435a0758d554ff0cab216f"
owner: atm-core
priority: P0
milestone: M14
related_plan: docs/ai_atomic_framework/cid-hardening/atm-tasks-command-atomic-map-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
depends_on:
  - "TASK-CID-0065"
  - "TASK-CID-0069"
scopePaths:
  - "packages/cli/src/commands/emergency/registry.ts"
  - "packages/cli/src/commands/emergency/leases.ts"
  - "packages/cli/src/commands/emergency/gate.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/hook.ts"
  - "scripts/validate-cli.ts"
  - "scripts/validate-task-ledger-governance.ts"
  - "schemas/emergency-maintenance-lease.schema.json"
  - "schemas/emergency-maintenance-use.schema.json"
deliverables:
  - "packages/cli/src/commands/emergency/registry.ts"
  - "packages/cli/src/commands/emergency/leases.ts"
  - "packages/cli/src/commands/hook.ts"
  - "scripts/validate-cli.ts"
  - "scripts/validate-task-ledger-governance.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-task-ledger-governance.ts --mode validate"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert if emergency backend use records or audit guards block valid taskflow operator-lane work."
atomizationImpact:
  ownerAtomOrMap: "atm.emergency-maintenance-permission-lane"
  mapUpdates:
    - "packages/cli/src/commands/emergency/"
    - "packages/cli/src/commands/hook.ts"
outOfScope:
  - "Do not reopen TASK-CID-0065."
  - "Do not weaken taskflow open/close as the normal operator lane."
  - "Do not add a permanent superuser mode."
  - "Do not make read-only diagnostics require emergency approval."
  - "Do not clean unrelated historical untracked .atm residue."
nonGoals:
  - "No free-form approval text as the only gate."
  - "No long-lived global permission file."
  - "No second task lifecycle model."
---

# TASK-CID-0070 - Emergency backend lease audit and use-record hardening

## Goal

Finish the hardening gaps left after TASK-CID-0065 without reopening that governed-done task. The emergency lane already exists, but it must be richer and more auditable so direct backend mutation cannot quietly bypass TASK-CID-0063/0069 taskflow operator lanes.

## Required Work

- Expand the emergency permission registry entries so each permission exposes machine-readable fields for protected surfaces, normal lane, risk tier, default TTL, max uses, task/actor requirements, human approval requirement, audit requirement, and validator tags.
- Expand `atm.emergencyMaintenanceUse.v1` records to include result status plus deterministic before/after snapshots and touched-file summaries where the caller can provide them.
- Have `assertEmergencyApproval` return use/audit metadata that backend callers can attach to their command result evidence.
- Thread emergency use metadata through direct protected `tasks` backend mutation results.
- Add pre-commit / hook inspection that rejects staged emergency use files when the matching lease file is absent, mismatched, or not marked as used.
- Keep `taskflow open --write` and `taskflow close --write` unblocked through the operator-lane context.
- Add regression coverage for missing lease, wrong lease, allowed lease, and orphan use record audit failure.

## Acceptance Criteria

- `node atm.mjs emergency permissions --json` returns entries with `normalLane`, `riskTier`, `requiresTaskId`, `requiresActor`, `requiresHumanApprovalText`, `auditRequired`, and `validatorTags`.
- A consumed emergency lease writes `atm.emergencyMaintenanceUse.v1` with `result`, `before`, `after`, and `touchedFiles` fields.
- Direct protected tasks backend results include emergency use evidence when a lease is consumed.
- A staged emergency use record without a matching used lease fails `node atm.mjs hook pre-commit --json`.
- A staged emergency use record with a matching used lease passes the emergency audit portion of pre-commit.
- `taskflow close --write` remains exempt through `withTaskflowOperatorLane`.
- Existing TASK-CID-0065 denial behavior still emits `ATM_EMERGENCY_LANE_APPROVAL_REQUIRED`.

## Validation

```powershell
npm run typecheck
npm run validate:cli
node --strip-types scripts/validate-task-ledger-governance.ts --mode validate
git diff --check
```

## Report Back

Report:

- registry fields added;
- use record fields added;
- backend results that now include emergency use metadata;
- pre-commit/audit behavior for matching and orphan use records;
- regression scenarios added;
- validator results and commit SHAs.
