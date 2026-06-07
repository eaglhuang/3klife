---
doc_id: doc_cid_0017
task_id: TASK-CID-0017
title: "CID advisor uses broker decision model"
status: done
started_at: "2026-06-07T05:33:05Z"
started_by_agent: "007"
completed_at: "2026-06-07T06:31:39Z"
completed_by_agent: "007"
owner: atm-core
priority: P0
milestone: P0
depends_on:
  - "TASK-CID-0015"
  - "TASK-CID-0016"
related_plan: docs/ai_atomic_framework/cid-hardening/CID硬化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/core/src/broker/advisor.ts"
  - "packages/core/src/broker/decision.ts"
  - "packages/core/src/broker/index.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "package.json"
  - "scripts/validators.config.json"
  - "scripts/validate-task-parallel-advisor.ts"
deliverables:
  - "packages/core/src/broker/advisor.ts"
  - "packages/core/src/broker/decision.ts"
  - "packages/core/src/broker/index.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "package.json"
  - "scripts/validators.config.json"
  - "scripts/validate-task-parallel-advisor.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-task-parallel-advisor.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the advisor precedence commit and restore the prior tasks-parallel logic if the shared decision model regresses existing CLI behavior."
atomizationImpact:
  ownerAtomOrMap: "atm.cid-parallel-advisor-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  notes: "This card moves the parallel advisor onto the shared broker decision model instead of file-first bespoke logic."
outOfScope:
  - "proposal create/show/list/validate runtime"
  - "steward apply flow"
  - "team or next lifecycle cleanup integration"
  - "Manual mutation of .atm/history/** or .atm/runtime/**"
---

# TASK-CID-0017 - CID advisor uses broker decision model

## Goal

Make `tasks parallel` use the same broker decision model as the upcoming runtime so all CID advice, blocked lanes, and shared-surface reasoning come from one verdict engine.

## Why This Exists

The current advisor can already detect CID conflicts, but the precedence rules are still fragmented between raw file overlap logic and downstream consumers. This card centralizes that reasoning before proposal/steward integration starts.

## Acceptance Criteria

- Same atom/CID conflicts fail closed as `blocked-cid-conflict`.
- Same file but CID-disjoint work returns the physical split / brokerable verdict path instead of raw file-first collapse.
- Shared generator, projection, validator, artifact, or lease surfaces are surfaced as explicit blockers or serial-only lanes.
- `tasks parallel` and its validator reflect the same broker decision vocabulary.
- The existing `scripts/validate-task-parallel-advisor.ts` surface is promoted into the formal validator chain through `package.json` and `scripts/validators.config.json` instead of a second aggregator.
- This card does not yet register proposal payloads or apply final patches.

## Notes

This card is still expected to close in one implementation wave plus one closeout wave. Internal sidecars may verify verdict matrices and guard against scope drift, but they do not replace the formal `005` / `006` / `007` worker cadence.

This card assumes `TASK-CID-0016` already created the shared broker subtree; it should extend only the `tasks parallel` decision surface and not widen into unrelated task lifecycle logic.
