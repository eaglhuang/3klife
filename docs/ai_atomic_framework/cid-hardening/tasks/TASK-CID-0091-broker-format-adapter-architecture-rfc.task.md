---
task_id: TASK-CID-0091
doc_id: doc_cid_0091
title: "Broker format adapter architecture RFC"
status: planned
owner: atm-core
priority: P0
milestone: M19
related_plan: docs/ai_atomic_framework/cid-hardening/CID硬化計畫書2.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: planning_repo
depends_on:
  - "TASK-CID-0090"
scopePaths:
  - "docs/ai_atomic_framework/cid-hardening/CID硬化計畫書2.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0091-broker-format-adapter-architecture-rfc.task.md"
deliverables:
  - "docs/ai_atomic_framework/cid-hardening/CID硬化計畫書2.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0091-broker-format-adapter-architecture-rfc.task.md"
validators:
  - "git diff --check"
evidence:
  required: planning-attestation
rollback:
  strategy: revert-planning-doc
  notes: "Revert the RFC section and this planning task card."
atomizationImpact:
  ownerAtomOrMap: "atm.broker-format-adapter-rfc"
outOfScope:
  - "Implementing broker runtime code"
  - "Changing path-to-atom-map.json"
nonGoals:
  - "Do not claim format adapters already exist."
---

# TASK-CID-0091 - Broker format adapter architecture RFC

## Goal

Write the architecture RFC for Broker Core + Format Adapter Plugin + Domain Adapter separation.

## Required Behavior

- Define broker responsibilities separately from adapter responsibilities.
- Define fail-closed behavior for unknown formats.
- Define why `path-to-atom-map.json` needs record-level conflict handling.
- Preserve the rule that agents submit mutation requests to broker instead of writing shared mutable files directly.

## Acceptance Criteria

- `CID硬化計畫書2.md` contains the architecture, adapter contract sketch, conflict key model, and task order.
- The RFC explicitly separates format adapters from domain adapters.
- The RFC does not describe proposed features as already implemented.

## Validation

```powershell
git diff --check
```
