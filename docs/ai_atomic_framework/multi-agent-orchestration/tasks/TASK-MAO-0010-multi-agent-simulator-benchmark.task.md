---
task_id: TASK-MAO-0010
title: "multi-agent simulator benchmark"
status: planned
owner: atm-core
priority: P1
milestone: M4
closure_authority: target_repo
depends_on:
  - "TASK-MAO-0003"
  - "TASK-MAO-0006"
  - "TASK-MAO-0009"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/MAO多AI並行治理計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "scripts/validate-mao-parallel-routing.ts"
  - "scripts/fixtures/mao-parallel-routing/"
  - "docs/reports/mao-parallel-routing-benchmark.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "scripts/validate-mao-parallel-routing.ts"
  - "scripts/fixtures/mao-parallel-routing/"
  - "docs/reports/mao-parallel-routing-benchmark.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "node --strip-types scripts/validate-mao-parallel-routing.ts"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Remove simulator, fixtures, report, and atomization map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.mao-parallel-routing-benchmark-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Real multi-process load testing"
  - "Distributed broker consensus"
---

# TASK-MAO-0010 - multi-agent simulator benchmark

## Goal

Prove MAO v1 behavior with deterministic multi-agent scenarios before relying on it in real parallel development.

## Implementation Contract

- Add fixtures for same-file different atom, same atom write/write, write/read overlap, unknown scope, generated artifact drift, freeze/resume, steward apply, and blocked cases.
- Add a validator script that runs all scenarios and emits a concise report.
- Add a human-readable benchmark report summarizing pass/fail and remaining risks.
- Include lessons learned from the CID/AGR parallel development incident.

## Acceptance Criteria

- At least ten scenarios are covered.
- The simulator fails hard when a known unsafe case is allowed.
- The report identifies which MAO task introduced each capability.
- The benchmark can run without network access or external services.

