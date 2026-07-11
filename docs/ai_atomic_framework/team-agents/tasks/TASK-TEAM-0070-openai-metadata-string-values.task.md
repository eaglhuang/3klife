---
doc_id: doc_team_0070
task_id: TASK-TEAM-0070
title: "Normalize OpenAI Responses metadata values to strings"
status: done
owner: atm-core
priority: P0
milestone: M10X
depends_on:
  - "TASK-TEAM-0067"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/core/src/team-runtime/providers/openai.ts"
  - "scripts/validate-team-agents.ts"
deliverables:
  - "packages/core/src/team-runtime/providers/openai.ts"
  - "scripts/validate-team-agents.ts"
validators:
  - "npm run typecheck"
  - "node --strip-types scripts/validate-team-agents.ts --case openai-azure-openai-bridges"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert OpenAI metadata normalization and regression together."
atomizationImpact:
  ownerAtomOrMap: "atm.team-provider-openai"
  mapUpdates: []
outOfScope:
  - "Changing provider credentials or models"
  - "Changing Team role assignment"
---
# TASK-TEAM-0070 Normalize OpenAI Responses metadata values to strings

## Trigger

Paid L5 dogfood reached OpenAI Responses for Coordinator and Review Agent, but
both calls returned HTTP 400 because `metadata.scopedPathCount` was an integer.
OpenAI requires metadata values to be strings.

## Acceptance Criteria

- OpenAI Team provider request metadata contains only string values.
- Deterministic provider coverage asserts `scopedPathCount` is serialized as a
  string.
- The paid mixed-provider L5 run is retried after the frozen runner is rebuilt.
