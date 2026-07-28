---
task_id: TASK-RFT-0041
title: Extract team legacy provider execution orchestration
status: done
owner: atm-core
priority: P1
depends_on: [TASK-RFT-0040]
related_plan: docs/ai_atomic_framework/governance-optimization/ATM治理優化-Team-Agents-巨檔拆分.md
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
  - packages/cli/src/commands/team/legacy/provider-execution.ts
  - tests/cli/team-legacy-provider-execution-extraction.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
validators:
  - node --strip-types tests/cli/team-legacy-command-extraction.test.ts
  - node --strip-types tests/cli/team-legacy-patrol-contract-extraction.test.ts
  - node --strip-types tests/cli/team-legacy-permission-lease-extraction.test.ts
  - node --strip-types tests/cli/team-legacy-provider-execution-extraction.test.ts
  - node --strip-types tests/cli/team-agents-dogfood.test.ts
  - npm run typecheck
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the provider execution extraction commit and restore the moved helpers inside team-legacy.ts.
atomizationImpact:
  ownerAtomOrMap: atm.team-agents-command-router-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.team-provider-execution-orchestration
      pattern: Strategy Map
      source: packages/cli/src/commands/team-legacy.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-15T15:09:35.621Z"
completed_by_agent: "codex-task-rft-0041"
closedAt: "2026-07-15T15:09:35.621Z"
closedByActor: "codex-task-rft-0041"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-15T15-09-35-525Z-close-23b8c404eb7c"
lastTransitionAt: "2026-07-15T15:09:35.621Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "d1eae285dc2cf2f59e4fadc5f0e5127507b3ac87"
---

# TASK-RFT-0041 - Extract team legacy provider execution orchestration

## Problem

`packages/cli/src/commands/team-legacy.ts` still remains above 4,000 lines after TASK-RFT-0040. The provider execution section owns direct role execution, bounded handoff context, vendor secret loading, provider observability events, and runtime provider id normalization inside the command facade.

## Acceptance

- Extract the Team provider execution / direct role handoff orchestration cluster from `team-legacy.ts` into `packages/cli/src/commands/team/legacy/provider-execution.ts`.
- Move one large atom map in this card, not just a small helper cluster.
- Keep every new or touched physical support module at or below 600 lines.
- Reduce `team-legacy.ts` below its current 4,019-line baseline.
- Preserve exported helper names currently imported by tests or downstream command surfaces.
- Add a regression that fails if the extracted provider execution module exceeds 600 lines or `team-legacy.ts` does not shrink.
- Register the new extracted module path in the CLI atom-map shard.

## Atom Refactor Plan

Atom: `atm.team-provider-execution-orchestration`
Pattern: Strategy Map
Owner module: `packages/cli/src/commands/team/legacy/provider-execution.ts`
Callers: `packages/cli/src/commands/team-legacy.ts`
Public surface: re-export provider execution helpers from `team-legacy.ts` if needed to preserve imports
Focused test: `tests/cli/team-legacy-provider-execution-extraction.test.ts`
CLI regression: `node --strip-types tests/cli/team-agents-dogfood.test.ts`
Out of scope: team plan captain sizing, patrol lifecycle, run storage, and full `team-legacy.ts` completion below 600 lines
Commit split: source/test/map update first, generated release sync only if frozen runner reports sync required
