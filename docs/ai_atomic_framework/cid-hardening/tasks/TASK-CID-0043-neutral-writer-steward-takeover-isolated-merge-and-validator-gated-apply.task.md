---
doc_id: doc_cid_0043
task_id: TASK-CID-0043
title: "Neutral writer, steward takeover, isolated merge, and validator-gated apply"
status: done
started_at: "2026-06-12T16:19:00+08:00"
started_by_agent: "007"
completed_at: "2026-06-12T16:22:00+08:00"
owner: atm-core
priority: P1
milestone: M5
depends_on:
  - "TASK-CID-0041"
  - "TASK-CID-0042"
related_plan: docs/ai_atomic_framework/cid-hardening/agr-conflict-arbitration-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/core/src/broker/steward.ts"
  - "packages/cli/src/commands/route.ts"
  - "packages/core/src/broker/__tests__/steward-arbitration.test.ts"
deliverables:
  - "packages/core/src/broker/steward.ts"
  - "packages/cli/src/commands/route.ts"
  - "packages/core/src/broker/__tests__/steward-arbitration.test.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types packages/core/src/broker/__tests__/steward-arbitration.test.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the neutral-writer / steward apply path if it can bypass validator gates or widen scope accidentally."
atomizationImpact:
  ownerAtomOrMap: "atm.cid-agr-steward-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "General-purpose semantic merge"
  - "Broad git add or hidden sweep behavior"
nonGoals:
  - "Do not let steward takeover erase the route ownership boundary."
---

# TASK-CID-0043 - Neutral writer, steward takeover, isolated merge, and validator-gated apply

## Goal

Implement the neutral writer path that can take over a blocked route, merge safely, and still require validator gates.

## Acceptance Criteria

- Steward takeover is only allowed after the conflict verdict says it is safe.
- Isolated merge cannot hide cross-route scope drift.
- Validator-gated apply remains the final authority before any source mutation closes.

