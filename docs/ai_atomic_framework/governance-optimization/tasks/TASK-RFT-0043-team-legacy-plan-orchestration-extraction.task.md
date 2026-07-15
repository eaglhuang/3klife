---
task_id: TASK-RFT-0043
title: Extract team legacy plan orchestration map
status: planned
owner: atm-core
priority: P1
depends_on: [TASK-RFT-0042]
related_plan: docs/ai_atomic_framework/governance-optimization/ATM瘝餌??芸?-Team-Agents-撌冽???.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/team-legacy.ts
  - packages/cli/src/commands/team/legacy/**/*.ts
  - tests/cli/team-*.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
deliverables:
  - packages/cli/src/commands/team-legacy.ts
  - packages/cli/src/commands/team/legacy/plan-orchestration.ts
  - tests/cli/team-legacy-plan-orchestration-extraction.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
validators:
  - node --strip-types tests/cli/team-legacy-command-extraction.test.ts
  - node --strip-types tests/cli/team-legacy-crew-decision-extraction.test.ts
  - node --strip-types tests/cli/team-legacy-plan-orchestration-extraction.test.ts
  - node --strip-types tests/cli/team-agents-dogfood.test.ts
  - npm run typecheck
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the plan orchestration extraction commit and restore the moved helpers inside team-legacy.ts.
atomizationImpact:
  ownerAtomOrMap: atm.team-agents-command-router-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.team-plan-orchestration
      pattern: Orchestrator
      source: packages/cli/src/commands/team-legacy.ts
      disposition: extract
      inlineReason: null
---

# TASK-RFT-0043 - Extract team legacy plan orchestration map

## Problem

`packages/cli/src/commands/team-legacy.ts` remains 2,975 lines after TASK-RFT-0042. The team plan assembly surface still mixes actor resolution, broker lane planning, plan contract composition, runtime pilot projection, and governance runtime fields inside the command facade.

## Acceptance

- Extract the Team plan orchestration map from `team-legacy.ts` into `packages/cli/src/commands/team/legacy/plan-orchestration.ts`.
- Move one coherent atom map in this card, not just a small helper cluster.
- Keep every new or touched physical support module at or below 600 lines.
- Reduce `team-legacy.ts` below its current 2,975-line baseline.
- Preserve exported helper names currently imported by tests or downstream command surfaces.
- Add a regression that fails if the extracted plan orchestration module exceeds 600 lines or `team-legacy.ts` does not shrink.
- Register the new extracted module path in the CLI atom-map shard.

## Atom Refactor Plan

Atom: `atm.team-plan-orchestration`
Pattern: Orchestrator
Owner module: `packages/cli/src/commands/team/legacy/plan-orchestration.ts`
Callers: `packages/cli/src/commands/team-legacy.ts`
Public surface: re-export plan orchestration helpers from `team-legacy.ts` if needed to preserve imports
Focused test: `tests/cli/team-legacy-plan-orchestration-extraction.test.ts`
CLI regression: `node --strip-types tests/cli/team-agents-dogfood.test.ts`
Out of scope: run storage, patrol reporting, lifecycle command execution, and full `team-legacy.ts` completion below 600 lines
Commit split: source/test/map update first, generated release sync only if frozen runner reports sync required
