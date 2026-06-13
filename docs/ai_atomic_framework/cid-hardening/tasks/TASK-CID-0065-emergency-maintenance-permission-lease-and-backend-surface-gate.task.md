---
task_id: TASK-CID-0065
doc_id: doc_cid_0065
title: "Emergency maintenance permission lease and backend surface gate"
status: done
owner: atm-core
priority: P0
milestone: M14
started_by_agent: captain
completed_at: 2026-06-13T13:33:30+08:00
related_plan: docs/ai_atomic_framework/cid-hardening/atm-tasks-command-atomic-map-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
depends_on:
  - "TASK-CID-0063"
scopePaths:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "packages/cli/src/commands/command-specs/taskflow.spec.ts"
  - "packages/cli/src/commands/command-specs/emergency.spec.ts"
  - "packages/cli/src/commands/emergency.ts"
  - "packages/cli/src/commands/emergency/"
  - "schemas/emergency-maintenance-lease.schema.json"
  - "schemas/emergency-maintenance-use.schema.json"
  - "scripts/validate-cli.ts"
  - "scripts/validate-task-ledger-governance.ts"
  - "docs/specs/taskflow-profile-v1.md"
deliverables:
  - "packages/cli/src/commands/emergency.ts"
  - "packages/cli/src/commands/emergency/"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/command-specs/emergency.spec.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "packages/cli/src/commands/command-specs/taskflow.spec.ts"
  - "schemas/emergency-maintenance-lease.schema.json"
  - "schemas/emergency-maintenance-use.schema.json"
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
  notes: "Revert if emergency lease enforcement blocks the normal taskflow open/close lane or fails to reject unapproved backend mutation."
atomizationImpact:
  ownerAtomOrMap: "atm.emergency-maintenance-permission-lane"
  mapUpdates:
    - "packages/cli/src/commands/emergency/"
    - "schemas/emergency-maintenance-lease.schema.json"
    - "schemas/emergency-maintenance-use.schema.json"
outOfScope:
  - "Do not weaken TASK-CID-0063 taskflow open/close as the normal operator lane."
  - "Do not implement TASK-CID-0062 module extraction."
  - "Do not create a permanent per-agent superuser mode."
  - "Do not make read-only diagnostics require emergency approval."
  - "Do not allow --no-verify or force-style bypasses as ordinary recommended commands."
nonGoals:
  - "No free-form approval text as the only gate."
  - "No long-lived global permission file that grants broad backend authority."
  - "No second task lifecycle model."
---

# TASK-CID-0065 - Emergency maintenance permission lease and backend surface gate

## Goal

Prevent AI agents from bypassing the TASK-CID-0063 `taskflow open` / `taskflow close` operator lane by directly invoking powerful backend mutation surfaces. Emergency backend repair must remain possible, but only through a short-lived, task-scoped, permission-scoped human approval lease that ATM can validate mechanically.

## Problem

TASK-CID-0063 makes taskflow the default open/close lane, but the old backend commands still exist because ATM needs them as execution engines and recovery tools. During the CID closeback cleanup, the following direct backend surfaces were all useful but dangerous if used as ordinary AI workflow:

- `tasks close`
- `tasks reconcile`
- `tasks import --write`
- `tasks repair-closure`
- lifecycle reset / force import / global stale lock cleanup
- historical-delivery waiver flags
- stale-runner and hook-bypass recovery flags

If these remain ordinary commands, an agent can still bypass the normal lane and recreate the same planning/target split, waiver misuse, stale-lock cleanup, or ungoverned closeout artifact problems that TASK-CID-0063 is trying to remove.

## Required Work

- Add an emergency command surface, tentatively:
  - `node atm.mjs emergency approve ...`
  - `node atm.mjs emergency show ...`
  - `node atm.mjs emergency revoke ...`
- Add a policy-driven emergency permission registry. The registry must be data-shaped so future tasks can add or tune permissions without scattering hard-coded command checks.
- Add lease schema `atm.emergencyMaintenanceLease.v1`.
- Add use/audit schema `atm.emergencyMaintenanceUse.v1`.
- Require `--emergency-approval <leaseId>` for protected backend mutation surfaces when they are called directly.
- Validate that a lease matches task id, actor, permission id, command surface, flags, TTL, use count, and scoped reason before allowing mutation.
- Fail closed before file mutation when the lease is missing, expired, mismatched, already used, or too broad.
- Keep `taskflow open --write` and `taskflow close --write` as normal lanes that do not require emergency approval when they can compute a safe governed story.
- Teach `next` to recommend taskflow by default and to emit a user-facing approval notice before any emergency backend suggestion.
- Update CLI help so protected backend commands are clearly marked as emergency backend surfaces.
- Extend audit/pre-commit validation so emergency artifacts without a matching lease/use event are rejected.
- Add regression coverage that an agent cannot bypass taskflow by calling backend close/reconcile/import/repair-closure directly.

## Permission Registry

Initial permissions:

| Permission | Protected surfaces | Normal lane | Risk tier |
| --- | --- | --- | --- |
| `backend.tasks.close` | direct `tasks close`, including historical delivery close | `taskflow close` | high |
| `backend.tasks.reconcile` | direct `tasks reconcile` | `taskflow close` | high |
| `backend.tasks.import.write` | `tasks import --write`, `--force`, `--force-overwrite-claims`, `--reset-open` | `taskflow open` / governed profile import | high |
| `backend.tasks.repairClosure` | direct `tasks repair-closure`; `--amend` is elevated | `taskflow close` closeback plan | high |
| `backend.tasks.reset` | lifecycle reset / reopen / rollback mutation | explicit recovery route | high |
| `backend.tasks.lockCleanupGlobal` | `tasks lock cleanup --all-stale` | scoped closeback cleanup | medium |
| `backend.tasks.scopeAmend` | `tasks scope add` outside an active guided claim | normal task claim/scope flow | medium |
| `backend.waiver.historicalDeliveryOutOfScope` | `--waiver-out-of-scope-delivery` | narrow historical delivery verification | high |
| `backend.runnerRecovery` | `--allow-stale-runner` | build/sync runner first | high |
| `backend.gitHookBypass` | `--no-verify` or equivalent hook bypass guidance | governed commit wrapper | critical |

Each registry entry must carry:

- `permissionId`
- `matchedCommand`
- `matchedAction`
- `protectedFlags`
- `normalLane`
- `riskTier`
- `defaultTtlMinutes`
- `maxUses`
- `requiresTaskId`
- `requiresActor`
- `requiresHumanApprovalText`
- `auditRequired`
- `validatorTags`

## Lease Contract

The lease must be narrow by default:

- one task;
- one actor or explicit actor set;
- one permission id;
- one command surface;
- short TTL;
- single use unless policy explicitly allows more;
- explicit human approval text and reason;
- immutable once created except revoke/use metadata.

Example:

```json
{
  "schemaId": "atm.emergencyMaintenanceLease.v1",
  "leaseId": "EMG-TASK-CID-0043-20260613-abc123",
  "taskId": "TASK-CID-0043",
  "actor": "004",
  "permissionId": "backend.tasks.reconcile",
  "surface": "tasks.reconcile",
  "approvedBy": "human",
  "approvalText": "Approved emergency closeback for legacy CID stale-import residue.",
  "reason": "Recover governed closeout provenance for a historical delivery.",
  "createdAt": "2026-06-13T00:00:00Z",
  "expiresAt": "2026-06-13T00:30:00Z",
  "maxUses": 1,
  "usedCount": 0,
  "scope": {
    "deliveryCommit": "00be417f",
    "allowedFlags": ["--delivery-commit"]
  },
  "status": "active"
}
```

## Acceptance

- Direct `tasks close`, `tasks reconcile`, `tasks import --write`, and `tasks repair-closure` mutation without `--emergency-approval` fails before mutation with `ATM_EMERGENCY_LANE_APPROVAL_REQUIRED`.
- Free-form approval text without a valid lease id is rejected.
- A valid lease permits only its matching task, actor, permission, surface, and allowed flags.
- Expired, revoked, over-used, wrong-task, wrong-actor, wrong-permission, and wrong-surface leases fail closed.
- `taskflow close --write` remains usable without emergency approval when it can compute a normal governed closeback bundle.
- `taskflow close --dry-run` identifies when a backend action would require emergency approval if invoked directly.
- `next` never recommends direct backend close/reconcile/import/repair-closure as ordinary work; it either recommends taskflow or emits an explicit human approval notice for the emergency lane.
- `--waiver-out-of-scope-delivery`, `--allow-stale-runner`, `--force-overwrite-claims`, `--amend`, and `tasks lock cleanup --all-stale` are each covered by named emergency permissions.
- Emergency use writes `atm.emergencyMaintenanceUse.v1` evidence that includes lease id, command, actor, task, before/after status, files touched, and result.
- `tasks audit --staged` rejects emergency backend artifacts that do not have a matching lease/use event pair.
- Regression coverage proves that backend command bypass attempts cannot recreate the TASK-CID-0043 through TASK-CID-0047 closeback failure pattern after TASK-CID-0063.

## Validation

```powershell
npm run typecheck
npm run validate:cli
node --strip-types scripts/validate-task-ledger-governance.ts --mode validate
git diff --check
```

## Report Back

Report:

- permission registry entries added;
- lease schema and use/audit schema;
- exact backend surfaces protected;
- exact normal surfaces left unblocked;
- example denied backend command without a lease;
- example approved backend command with a lease;
- `next` and help text wording changes;
- audit/pre-commit enforcement;
- regression scenarios added;
- validator results and commit SHA.
