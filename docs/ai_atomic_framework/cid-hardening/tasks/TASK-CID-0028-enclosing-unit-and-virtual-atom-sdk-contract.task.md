---
doc_id: doc_cid_0028
task_id: TASK-CID-0028
title: "EnclosingUnit and VirtualAtom SDK contract"
status: done
owner: atm-core
priority: P1
milestone: M1
depends_on:
  - "TASK-CID-0027"
related_plan: docs/ai_atomic_framework/cid-hardening/CID硬化計畫書2.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/plugin-sdk/src/atomization-planning.ts"
  - "packages/plugin-sdk/src/index.ts"
  - "tests/"
deliverables:
  - "packages/plugin-sdk/src/atomization-planning.ts"
  - "packages/plugin-sdk/src/index.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the SDK contract commit if downstream adapters cannot consume the surface safely."
atomizationImpact:
  ownerAtomOrMap: "atm.cid-agr-layer1-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Implementing adapter-specific enclose logic"
  - "Changing broker decision precedence"
nonGoals:
  - "Do not create a second atomization contract outside plugin-sdk"
---

# TASK-CID-0028 - EnclosingUnit and VirtualAtom SDK contract

## Goal

Add the formal SDK contract for AGR Layer 1 so adapters and broker logic can talk about the same virtual atom shape.

## Acceptance Criteria

- Define `EnclosingUnit`.
- Define `VirtualAtom`.
- Encode layer, detection method, confidence class, and deterministic CID handoff fields.
- Preserve backward compatibility for adapters that do not yet implement `enclose()`.
