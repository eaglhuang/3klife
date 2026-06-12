---
doc_id: doc_cid_0029
task_id: TASK-CID-0029
title: "Layer 1 syntactic enclosure broker refinement"
status: done
owner: atm-core
priority: P1
milestone: M1
depends_on:
  - "TASK-CID-0028"
related_plan: docs/ai_atomic_framework/cid-hardening/CID硬化計畫書2.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/core/src/broker/agr.ts"
  - "packages/core/src/broker/__tests__/agr.test.ts"
  - "packages/core/src/broker/"
deliverables:
  - "packages/core/src/broker/agr.ts"
  - "packages/core/src/broker/__tests__/agr.test.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the Layer 1 refinement commit if CID derivation or fallback behavior becomes non-deterministic."
atomizationImpact:
  ownerAtomOrMap: "atm.cid-agr-layer1-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Layer 2 decomposition policy"
  - "Adapter manifest canonicalization"
nonGoals:
  - "Do not bypass fail-closed fallback when no enclosure is available"
---

# TASK-CID-0029 - Layer 1 syntactic enclosure broker refinement

## Goal

Teach broker-side AGR logic to refine patch regions into virtual atoms using syntactic enclosure and derive deterministic candidate CID values from that refinement.

## Acceptance Criteria

- Same-file but syntactically separable cases produce virtual atoms.
- Candidate CID derivation is deterministic.
- Unsupported or null enclosure still falls back to conservative broker verdicts.
