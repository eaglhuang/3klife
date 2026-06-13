---
doc_id: doc_cid_0062
task_id: TASK-CID-0062
title: "Tasks governance invariant module extraction"
status: done
owner: atm-core
priority: P1
milestone: M12
depends_on:
  - "TASK-CID-0059"
  - "TASK-CID-0061"
related_plan: docs/ai_atomic_framework/cid-hardening/atm-tasks-command-atomic-map-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/tasks/public-surface.ts"
  - "packages/cli/src/commands/tasks/closeout-signaling.ts"
  - "packages/cli/src/commands/tasks/dependency-gates.ts"
  - "packages/cli/src/commands/tasks/historical-delivery.ts"
  - "packages/cli/src/commands/tasks/surface-invariants.ts"
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
  - "scripts/validate-cli.ts"
  - "docs/reports/tasks-command-atomic-map.md"
deliverables:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/tasks/public-surface.ts"
  - "packages/cli/src/commands/tasks/closeout-signaling.ts"
  - "packages/cli/src/commands/tasks/dependency-gates.ts"
  - "packages/cli/src/commands/tasks/historical-delivery.ts"
  - "packages/cli/src/commands/tasks/surface-invariants.ts"
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
  - "scripts/validate-cli.ts"
  - "docs/reports/tasks-command-atomic-map.md"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-tasks-command-surface.ts"
  - "node --strip-types scripts/validate-tasks-atomic-map.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the extraction if any admission, closeout, or historical-delivery behavior regresses; preserve the hard gate from TASK-CID-0061."
atomizationImpact:
  ownerAtomOrMap: "atm.tasks-governance-invariant-modules-map"
  mapUpdates:
    - "docs/reports/tasks-command-atomic-map.md"
    - "docs/reports/tasks-command-surface-contract.md"
outOfScope:
  - "Changing task storage model"
  - "Changing planning repo task lifecycle"
  - "Unrelated CLI surface cleanup"
nonGoals:
  - "Do not perform a formatting-only breakup of tasks.ts."
  - "Do not remove the hard gate introduced by TASK-CID-0061."
completed_at: "2026-06-13T16:16:12.089Z"
completed_by_agent: "captain"
delivery_commit: "9f22c9fe"
---

# TASK-CID-0062 - Tasks governance invariant module extraction

## Goal

Reduce the blast radius of `tasks.ts` by extracting the highest-risk governance invariants into smaller ownership modules after the surface hard gate is in place.

## Problem

`tasks.ts` currently concentrates too many safety-critical behaviors in one place:

- closeout provenance
- dependency admission
- historical-delivery proof
- command-surface invariants shared with `next` and `taskflow`

That concentration makes parallel work and targeted fixes more fragile than they need to be. A worker can change one path and accidentally destabilize several others.

## Required Work

- Keep `packages/cli/src/commands/tasks/public-surface.ts` as the stable outward-facing contract while implementation moves behind it.
- Extract the most coupling-prone governance invariants into focused modules with explicit ownership boundaries.
- Keep `tasks.ts` as orchestration, not as the only home for every admission rule.
- Rewire `next.ts`, `taskflow.ts`, and close-orchestration surfaces to consume the extracted invariant modules instead of shadowing logic.
- Update the atomic map report so the new ownership boundaries are documented, not just implied by code layout.
- Preserve the `TASK-CID-0061` hard gate as a permanent guard during and after the extraction.

## Atom/Map Extraction Pattern

- Primary patterns: **Facade** plus **Policy Object** plus **Strategy Map**.
- Treat 0062 as cleanup after earlier atoms, not as a license to move unrelated logic. Every moved function must map to a named owner atom.
- Do not create a second public contract. Keep `public-surface.ts` as the facade boundary for callers and move implementation behind it.
- Prefer strategy maps for close modes, residue buckets, and backend lane selection; prefer policy objects for admission, waiver, and permission decisions.
- Any new module must have either a focused test or be covered by an existing validator named in the atomic map report.
- If a module cannot be assigned to an atom/map owner, leave it in place and document it as residual work.

## Acceptance Signals

- `tasks.ts` becomes thinner in responsibility, not merely shorter in line count.
- The caller-facing contract stays stable even while internal modules move.
- Required governance invariants have one clear owner module each.
- Shared admission paths stop depending on fragile implicit coupling to one giant file.
- Regression coverage proves the extraction did not reopen the abnormal-release class of bug.

## Validation

```powershell
npm run typecheck
npm run validate:cli
node --strip-types scripts/validate-tasks-command-surface.ts
node --strip-types scripts/validate-tasks-atomic-map.ts
git diff --check
```

## Report Back

Report which invariants moved, which callers were rewired, before/after ownership boundaries, validator results, and commit SHA.
