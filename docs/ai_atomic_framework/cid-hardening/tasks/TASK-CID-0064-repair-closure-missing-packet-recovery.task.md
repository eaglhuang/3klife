---
task_id: TASK-CID-0064
title: "Repair-closure missing packet recovery and deterministic closeout reconstruction"
status: ready
started_at: "2026-06-12T23:29:00+08:00"
started_by_agent: "007"
priority: P0
milestone: M13
target_repo: AI-Atomic-Framework
planning_repo: 3KLife
closure_authority: target_repo
depends_on:
  - TASK-CID-0060
  - TASK-CID-0061
scopePaths:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/tasks/closeout-signaling.ts"
  - "packages/cli/src/commands/tasks/public-surface.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "scripts/validate-cli.ts"
  - "scripts/validate-task-ledger-governance.ts"
deliverables:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/tasks/closeout-signaling.ts"
  - "scripts/validate-task-ledger-governance.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-task-ledger-governance.ts --mode validate"
  - "git diff --check"
atomizationImpact:
  ownerAtomOrMap: "atm.tasks.closeout-provenance"
  mapUpdates:
    - path_pattern: "packages/cli/src/commands/tasks.ts"
      atom_id: "atm.tasks.lifecycle"
      capability: "tasks repair-closure command orchestration"
      coverage_status: "active"
    - path_pattern: "packages/cli/src/commands/tasks/closeout-signaling.ts"
      atom_id: "atm.tasks.closeout-provenance"
      capability: "closeout provenance trust and recovery diagnostics"
      coverage_status: "active"
    - path_pattern: "scripts/validate-task-ledger-governance.ts"
      atom_id: "atm.tasks.ledger-governance-validator"
      capability: "residue and closeout regression coverage"
      coverage_status: "active"
outOfScope:
  - "Do not implement TASK-CID-0062 module extraction."
  - "Do not implement TASK-CID-0063 taskflow dual-repo auto-stage or auto-commit."
  - "Do not hand-edit or special-case TASK-CID-0041 live ledger as the implementation."
  - "Do not broaden broker/steward workflows or release packaging beyond validator-safe sync when required by build output."
  - "Do not weaken dependency closeout admission or treat source-done/planning-done as governed-done."
nonGoals:
  - "No manual closure packet authoring as a workflow."
  - "No bypass flag, no --no-verify guidance, no hidden advisory-only fallback."
contextMap:
  primary:
    - path: "packages/cli/src/commands/tasks.ts"
      reason: "repair-closure backend command and closeout artifact staging behavior"
    - path: "packages/cli/src/commands/tasks/closeout-signaling.ts"
      reason: "trusted closeout provenance gap classification and recovery command construction"
    - path: "scripts/validate-task-ledger-governance.ts"
      reason: "deterministic regression for missing packet recovery and source-done-governance-incomplete residue"
  secondary:
    - path: "packages/cli/src/commands/tasks/public-surface.ts"
      reason: "keep caller-facing tasks surface stable after TASK-CID-0061"
    - path: "packages/cli/src/commands/command-specs/tasks.spec.ts"
      reason: "help/command contract for repair-closure recovery behavior"
    - path: "scripts/validate-cli.ts"
      reason: "existing CLI regression suite and dependency closeout gate coverage"
  tests:
    - path: "scripts/validate-task-ledger-governance.ts"
      reason: "fixture-level closeout provenance recovery checks"
    - path: "scripts/validate-cli.ts"
      reason: "end-to-end CLI regression guard"
  patterns:
    - referencePath: "packages/cli/src/commands/tasks/closeout-signaling.ts"
      referenceTaskId: "TASK-CID-0060"
      description: "source-done vs governed-done residue bucket and fail-closed guidance"
    - referencePath: "packages/cli/src/commands/tasks/public-surface.ts"
      referenceTaskId: "TASK-CID-0061"
      description: "stable caller-facing tasks command surface"
---

## Goal

Make `tasks repair-closure` useful when a task is marked done but the closure packet is missing. The current failure mode blocks downstream work with `ATM_CLOSURE_REPAIR_PACKET_NOT_FOUND`, as seen on `TASK-CID-0041`, leaving the queue head stuck even though ATM can identify the residue bucket and an earlier delivery commit exists.

This task must turn that dead end into a deterministic recovery story:

- reconstruct the closure packet when enough delivery, evidence, task ledger, and transition-event provenance exists;
- otherwise fail closed with a precise recovery packet that explains which proof segment is missing and what command/operator action is required next;
- never accept source-done, planning-done, or mailbox-done as governed done without reconstructed or verified closeout provenance.

## Background

`TASK-CID-0041` currently reports:

- residue bucket: `source-done-governance-incomplete`
- missing proof segments: `closure-packet`, `close-transition-metadata`
- source delivery commit candidate: `70594a03`
- official repair attempt result: `ATM_CLOSURE_REPAIR_PACKET_NOT_FOUND`

That behavior is product-significant. ATM should not require humans to hand-author `.atm/history/evidence/<task>.closure-packet.json` in order to unblock a known closeout residue. It should either rebuild the packet deterministically or expose a deterministic fail-closed recovery command.

## Acceptance

- `tasks repair-closure --task <id> --actor <actor> --json` no longer ends at `ATM_CLOSURE_REPAIR_PACKET_NOT_FOUND` when the task has enough provenance to reconstruct a valid closure packet.
- Reconstructed packet uses the existing closure packet schema and records deterministic provenance: task id, delivery commit, changed files, evidence/validator references when available, recovered-from-missing-packet marker, and recovery actor/time.
- If reconstruction is impossible, the command returns a structured fail-closed result with a stable error code, missing segments, and deterministic recovery command; it must not silently succeed.
- The repair path remains stage-only by default: it may stage exact repair artifacts, but it must not commit unless an existing governed wrapper path is explicitly invoked by the operator.
- The repair path must not modify unrelated `.atm/history/**` tasks or source files.
- Dependency admission after repair must distinguish trusted governed done from source-done-governance-incomplete.
- `TASK-CID-0041` class fixture is covered as a regression, but the implementation must be generic and not hard-coded to `TASK-CID-0041`.
- `tasks status --residue` and claim/next gates keep the bucket `source-done-governance-incomplete` until repair output becomes trusted.
- Existing `TASK-CID-0061` public surface contract remains stable; do not import new internal helpers from `tasks.ts` directly if a public surface exists.

## Regression Scenarios

1. Missing closure packet, enough provenance:
   - fixture has done task ledger, delivery commit, evidence, and close/import task events;
   - `tasks repair-closure` reconstructs packet, stages exact artifacts, and after status no longer reports missing `closure-packet`.

2. Missing closure packet, insufficient provenance:
   - fixture lacks delivery commit or evidence required for trust;
   - command fails closed with missing segment list and recovery command.

3. Source-done remains not governed-done:
   - task marked done only by planning mirror or mailbox/source report;
   - claim/next dependency gates still block.

4. Dirty tree isolation:
   - unrelated dirty files outside the task repair artifacts do not enter the repair bundle;
   - in-scope dirty repair conflicts fail closed.

5. Stage-only behavior:
   - repair stages only `.atm/history/evidence/<task>.closure-packet.json`, matching evidence/head files if produced, and repair transition event;
   - no commit is created by `tasks repair-closure` itself.

## Verification

Run:

```bash
npm run typecheck
npm run validate:cli
node --strip-types scripts/validate-task-ledger-governance.ts --mode validate
git diff --check
```

Focused checks must include:

- a fixture reproducing the `TASK-CID-0041` missing-packet failure shape;
- assertion that `ATM_CLOSURE_REPAIR_PACKET_NOT_FOUND` is no longer the terminal path when reconstruction is possible;
- assertion that impossible reconstruction returns a structured fail-closed recovery result;
- assertion that no source, broker, release, or unrelated `.atm/history` files are staged.

## Closure & Reports

Worker report must include:

1. Exact implementation files changed.
2. Exact regression cases added.
3. Before/after behavior for the missing closure-packet fixture.
4. Validator commands and results.
5. Target repo delivery commit SHA and closeout ledger/evidence commit SHA if the worker is authorized to complete the governed close.
6. Explicit statement that `TASK-CID-0063` implementation was not touched.
