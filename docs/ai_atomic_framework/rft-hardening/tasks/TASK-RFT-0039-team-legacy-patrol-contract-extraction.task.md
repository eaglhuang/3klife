---
task_id: TASK-RFT-0039
title: Extract team legacy patrol contract helpers
status: done
owner: atm-core
priority: P1
depends_on: [TASK-RFT-0038]
related_plan: docs/ai_atomic_framework/governance-optimization/ATM隊長模式暨Team-Agents治理優化.md
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
  - packages/cli/src/commands/team/legacy/**/*.ts
  - tests/cli/team-legacy-patrol-contract-extraction.test.ts
validators:
  - node --strip-types tests/cli/team-legacy-command-extraction.test.ts
  - node --strip-types tests/cli/team-legacy-patrol-contract-extraction.test.ts
  - node --strip-types tests/cli/team-agents-dogfood.test.ts
  - npm run typecheck
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the patrol contract extraction commit and restore the helpers inside team-legacy.ts.
atomizationImpact:
  ownerAtomOrMap: atm.team-agents-command-router-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.team-patrol-contract-builder
      pattern: Result Contract Object
      source: packages/cli/src/commands/team-legacy.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-15T14:38:54.079Z"
completed_by_agent: "codex-task-rft-0039"
closedAt: "2026-07-15T14:38:54.079Z"
closedByActor: "codex-task-rft-0039"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-15T14-38-53-993Z-close-9d9bf31177ca"
lastTransitionAt: "2026-07-15T14:38:54.079Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "20854c3869fb12240866b5d540fc7949871e5840"
---

# TASK-RFT-0039 - Extract team legacy patrol contract helpers

## Problem

`packages/cli/src/commands/team-legacy.ts` remains the only non-generated source file above 2,000 lines after TASK-RFT-0038. The lower Team patrol and lifecycle section builds required completion gates, patrol reports, patrol findings, follow-up suggestions, compact run projections, and lease conflict result details inside the same legacy command facade.

## Acceptance

- Extract the Team patrol / lifecycle result contract helper cluster from `team-legacy.ts` into bounded module(s) under `packages/cli/src/commands/team/legacy/`.
- Keep each new or touched support module at or below 600 lines.
- Reduce `team-legacy.ts` below its current 4,674-line baseline.
- Preserve exported helper names currently imported by tests or downstream command surfaces.
- Add a regression that fails if the extracted patrol contract module exceeds 600 lines or `team-legacy.ts` does not shrink.
- Register the new extracted module paths in the CLI atom-map shard.

## Atom Refactor Plan

Atom: `atm.team-patrol-contract-builder`
Pattern: Result Contract Object
Owner module: `packages/cli/src/commands/team/legacy/patrol-contracts.ts`
Callers: `packages/cli/src/commands/team-legacy.ts`
Public surface: re-export existing helper functions from `team-legacy.ts` when needed to preserve imports
Focused test: `tests/cli/team-legacy-patrol-contract-extraction.test.ts`
CLI regression: `node --strip-types tests/cli/team-agents-dogfood.test.ts`
Out of scope: taskflow mutex work, provider execution, broker conflict resolution, and full `team-legacy.ts` completion below 600 lines
Commit split: source/test/map update first, generated release sync only if frozen runner reports sync required
