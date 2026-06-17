---
task_id: TASK-MAO-0033
doc_id: doc_mao_0033
title: "Team wave dogfood benchmark with CID Phase B shape"
status: done
closeback_note: "Delivered + governed-closed in AI-Atomic-Framework on 2026-06-17 (actor claude-code-opus-4-7); planning mirror synced to done."
owner: atm-core
priority: P0
milestone: M6
closure_authority: target_repo
depends_on:
  - "TASK-MAO-0030"
  - "TASK-MAO-0031"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/MAO多AI並行治理計畫書2.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "scripts/validate-team-wave-mode.ts"
  - "scripts/fixtures/team-wave-mode/"
  - "docs/reports/team-wave-mode-dogfood.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "scripts/validate-team-wave-mode.ts"
  - "scripts/fixtures/team-wave-mode/"
  - "docs/reports/team-wave-mode-dogfood.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "node --strip-types scripts/validate-team-wave-mode.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert team wave benchmark validator, fixtures, report, and map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.team-wave-dogfood-benchmark-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Running real external agents"
  - "Benchmarking networked distributed execution"
nonGoals:
  - "Do not declare wave mode ready without per-task evidence slicing."
  - "Do not update operator workflow docs or migration guides."
---

# TASK-MAO-0033 - Team wave dogfood benchmark with CID Phase B shape

## Goal

Prove Team Agents Wave Mode with a deterministic benchmark shaped like the CID Phase B broker adapter work.

## Implementation Contract

- Fixture includes a safe wave with adapter registry, JSON adapter, text adapter, and numeric adapter slices.
- Fixture excludes dependent integration/adoption tasks into later waves.
- Benchmark proves worker reports can be ingested, validators summarized, and evidence sliced per task.
- Benchmark includes unsafe cases: same shared file unknown range, same atom write/write, mismatched closure authority, and missing worker report.
- This task only produces benchmark artifacts and evidence; it does not change operator onboarding/migration docs.

## Acceptance Criteria

- Safe wave passes and produces per-task verdicts.
- Unsafe wave fails before worker writes.
- Report states which MAO primitives made the wave safe.


