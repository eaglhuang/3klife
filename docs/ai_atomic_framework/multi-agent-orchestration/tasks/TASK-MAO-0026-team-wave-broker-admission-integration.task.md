---
task_id: TASK-MAO-0026
doc_id: doc_mao_0026
title: "Team wave broker admission integration"
status: planned
owner: atm-core
priority: P0
milestone: M6
closure_authority: target_repo
depends_on:
  - "TASK-MAO-0024"
  - "TASK-MAO-0005"
  - "TASK-MAO-0006"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/MAO多AI並行治理計畫書2.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "packages/core/src/broker/conflict-matrix.ts"
  - "packages/core/src/broker/registry.ts"
  - "packages/core/src/broker/team-wave-admission.ts"
  - "packages/core/src/broker/__tests__/team-wave-admission.test.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/core/src/broker/team-wave-admission.ts"
  - "packages/core/src/broker/__tests__/team-wave-admission.test.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "node --strip-types packages/core/src/broker/__tests__/team-wave-admission.test.ts"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert wave admission integration, tests, and map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.team-wave-broker-admission-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Implementing new conflict semantics unrelated to waves"
  - "Direct worktree patch application"
nonGoals:
  - "Do not allow same-wave execution when Broker verdict is freeze/block."
---

# TASK-MAO-0026 - Team wave broker admission integration

## Goal

Use existing Broker registry and conflict matrix logic to admit or reject Team Agents waves before workers write.

## Implementation Contract

- Convert wave candidate tasks into declared read/write/atom intent records.
- Evaluate pairwise and shared-surface conflicts before wave start.
- Preserve Broker verdicts: allow, serialize, steward, freeze, block.
- Return actionable split-wave recommendations.

## Acceptance Criteria

- Same-file unknown-range writes block the wave or require more detail.
- Same atom write/write conflicts block same-wave execution.
- Different atom / different file cases are allowed when existing conflict rules allow them.
