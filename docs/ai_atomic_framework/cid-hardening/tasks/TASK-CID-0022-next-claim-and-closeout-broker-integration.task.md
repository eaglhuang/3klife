---
doc_id: doc_cid_0022
task_id: TASK-CID-0022
title: "Next claim and closeout broker integration"
status: planned
owner: atm-core
priority: P0
milestone: P0
depends_on:
  - "TASK-CID-0016"
  - "TASK-CID-0017"
  - "TASK-CID-0021"
related_plan: docs/ai_atomic_framework/cid-hardening/CID硬化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/core/src/broker/lifecycle.ts"
  - "packages/core/src/broker/index.ts"
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/tasks/task-transition-helpers.ts"
  - "package.json"
  - "scripts/validators.config.json"
  - "scripts/validate-prompt-scoped-next.ts"
  - "scripts/validate-broker-lifecycle.ts"
deliverables:
  - "packages/core/src/broker/lifecycle.ts"
  - "packages/core/src/broker/index.ts"
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/tasks/task-transition-helpers.ts"
  - "package.json"
  - "scripts/validators.config.json"
  - "scripts/validate-prompt-scoped-next.ts"
  - "scripts/validate-broker-lifecycle.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-prompt-scoped-next.ts"
  - "node --strip-types scripts/validate-broker-lifecycle.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the lifecycle integration commit if claim gating or broker cleanup leaves stale registry state."
atomizationImpact:
  ownerAtomOrMap: "atm.next-broker-lifecycle-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  notes: "This card connects broker intent registration and cleanup to claim and closeout lifecycle surfaces."
outOfScope:
  - "Adding a second scheduler"
  - "Changing Team role orchestration beyond what TASK-CID-0021 already defined"
  - "Manual mutation of .atm/history/** or .atm/runtime/**"
---

# TASK-CID-0022 - Next claim and closeout broker integration

## Goal

Integrate broker intent checks into `next --claim` and guarantee broker cleanup on release, handoff, and closeout transitions.

## Why This Exists

Even with registry, proposals, composition, and Team integration, brokered writes are not safe until claim-time blocking and closeout-time cleanup use the same lifecycle surface.

## Acceptance Criteria

- Claim preflight registers or checks broker intent before work starts.
- Blocked broker lanes fail closed through `next --claim`.
- Release, handoff, and closeout transitions clear broker runtime state so stale intent does not poison later work.
- Prompt-scoped next validation still holds after the broker lifecycle hooks are added.
- The broker lifecycle validator is registered through `package.json` and `scripts/validators.config.json`.
- This card does not add new Team role semantics beyond the existing integration lane.

## Notes

Compact captain cadence applies here too. Internal sidecars may inspect lifecycle edge cases and stale-intent cleanup evidence, but the formal worker roster remains `005` / `006` / `007`.
