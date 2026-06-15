---
task_id: TASK-CID-0098
doc_id: doc_cid_0098
title: "Broker format adapter dogfood benchmark and adoption gate"
status: planned
owner: atm-core
priority: P0
milestone: M19
related_plan: docs/ai_atomic_framework/cid-hardening/CID硬化計畫書2.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
depends_on:
  - "TASK-CID-0094"
  - "TASK-CID-0097"
scopePaths:
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  - "docs/reports/broker-format-adapter-dogfood-report.md"
  - "packages/core/src/broker/__tests__/"
  - "packages/core/src/broker/__tests__/dogfood-adapter-benchmark.test.ts"
  - "scripts/validate-schemas.ts"
deliverables:
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  - "docs/reports/broker-format-adapter-dogfood-report.md"
  - "packages/core/src/broker/__tests__/dogfood-adapter-benchmark.test.ts"
validators:
  - "npm run typecheck"
  - "npm test"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert benchmark harness and adoption report."
atomizationImpact:
  ownerAtomOrMap: "atm.broker-format-adapter-adoption-gate"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Cross-machine broker service"
  - "Full external agent write authority"
nonGoals:
  - "Do not ship adapter batching without conflict regression coverage."
---

# TASK-CID-0098 - Broker format adapter dogfood benchmark and adoption gate

## Goal

Prove the format adapter broker design with focused dogfood scenarios and decide whether it is ready for broader adoption.

## Required Behavior

- Benchmark same-file / different JSON row batching.
- Benchmark same-row JSON conflict.
- Benchmark text range overlap.
- Benchmark numeric commutative merge.
- Benchmark unknown format fallback.
- Produce an adoption report with known limits and rollback guidance.

## Acceptance Criteria

- Benchmark report contains pass/fail results for all required scenarios.
- `path-to-atom-map.json` case demonstrates safe brokered batching without direct concurrent writes.
- Ship/no-ship recommendation is explicit and evidence-backed.

## Validation

```powershell
npm run typecheck
npm test
git diff --check
```
