---
doc_id: doc_cid_0031
task_id: TASK-CID-0031
title: "Layer 2 decomposition trigger and threshold policy"
status: done
owner: atm-core
priority: P1
milestone: M2
depends_on:
  - "TASK-CID-0029"
related_plan: docs/ai_atomic_framework/cid-hardening/CID硬化計畫書2.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/core/src/broker/agr.ts"
  - "packages/core/src/broker/policy.ts"
  - "packages/core/src/broker/__tests__/agr-layer2.test.ts"
deliverables:
  - "packages/core/src/broker/agr.ts"
  - "packages/core/src/broker/policy.ts"
  - "packages/core/src/broker/__tests__/agr-layer2.test.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert Layer 2 trigger logic if threshold policy cannot fail closed."
atomizationImpact:
  ownerAtomOrMap: "atm.cid-agr-layer2-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Applying decomposition automatically to source files"
  - "Read-set decision precedence changes"
nonGoals:
  - "Do not turn decomposition request into direct mutation authority"
---

# TASK-CID-0031 - Layer 2 decomposition trigger and threshold policy

## Goal

Add the bounded policy that decides when Layer 2 may be proposed for a conflict region inside one enclosing function or unit.

## Acceptance Criteria

- Count and density thresholds are explicit.
- Trigger only fires for bounded conflict regions inside one target body.
- Output is a constrained decomposition request, not direct code rewrite.
