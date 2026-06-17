---
task_id: TASK-MAO-0028
doc_id: doc_mao_0028
title: "Worker report ingestion contract"
status: done
closeback_note: "Delivered + governed-closed in AI-Atomic-Framework on 2026-06-17 (actor claude-code-opus-4-7); planning mirror synced to done."
owner: atm-core
priority: P0
milestone: M6
closure_authority: target_repo
depends_on:
  - "TASK-MAO-0027"
  - "TASK-MAO-0008"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/MAO多AI並行治理計畫書2.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "schemas/team-worker-report.schema.json"
  - "packages/core/src/broker/team-worker-report.ts"
  - "packages/core/src/broker/__tests__/team-worker-report.test.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "schemas/team-worker-report.schema.json"
  - "packages/core/src/broker/team-worker-report.ts"
  - "packages/core/src/broker/__tests__/team-worker-report.test.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:schemas"
  - "node --strip-types packages/core/src/broker/__tests__/team-worker-report.test.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert worker report schema/module/tests and map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.team-worker-report-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Worker spawning"
  - "Task closure"
nonGoals:
  - "Do not parse arbitrary chat logs as authoritative evidence."
---

# TASK-MAO-0028 - Worker report ingestion contract

## Goal

Define and ingest concise worker reports from Team Agents wave execution.

## Implementation Contract

- Report fields include worker id, role, assigned task ids, changed files, commands run, pass/fail summary, deviations, and first failing diagnostic.
- Reports may reference patch envelopes or actual diff paths.
- Invalid reports cannot advance checkpoint.
- Chat summaries remain advisory unless normalized into this schema.

## Acceptance Criteria

- Valid worker reports are accepted and summarized.
- Missing task ids, unscoped changed files, or missing validator status fail validation.
- Report ingestion does not mutate task lifecycle.
