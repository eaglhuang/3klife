---
task_id: TASK-RFT-0064
title: Split team knowledge command below 600 lines
status: done
owner: atm-release
priority: P1
depends_on:
  - TASK-RFT-0063
related_plan: docs/ai_atomic_framework/governance-optimization/ATM-GOVERNANCE-OPTIMIZATION-HANDOFF.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/team-knowledge.ts
  - packages/cli/src/commands/team-knowledge/**/*.ts
  - tests/cli/team-knowledge-final-600.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli*.json
deliverables:
  - packages/cli/src/commands/team-knowledge.ts
  - packages/cli/src/commands/team-knowledge/**/*.ts
  - tests/cli/team-knowledge-final-600.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
validators:
  - node --strip-types tests/cli/team-knowledge-final-600.test.ts
  - npm run validate:team-agents
  - npm run typecheck
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.team-knowledge-command-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.team-knowledge-command-facade
      pattern: Facade
      source: packages/cli/src/commands/team-knowledge.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-16T05:16:52.359Z"
completed_by_agent: "codex-task-rft-0064"
closedAt: "2026-07-16T05:16:52.359Z"
closedByActor: "codex-task-rft-0064"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-16T05-16-52-277Z-close-ba8826da1ec1"
lastTransitionAt: "2026-07-16T05:16:52.359Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "f838a79e61f41bd0e161bd2aaee4ae01e46c2a48"
---

# TASK-RFT-0064

## Goal

Split the `team knowledge` CLI command implementation into a bounded module tree while preserving the existing public command behavior and exported `TeamKnowledgeSummary` contract.

## Scope

- Keep `packages/cli/src/commands/team-knowledge.ts` as the operator-facing facade.
- Move permission, build/query/stats/compact, ranking/rerank, runtime output, metadata parsing, and filesystem helpers into modules under `packages/cli/src/commands/team-knowledge/`.
- Keep every touched physical TypeScript file at or below 600 lines.
- Register the facade and module tree under `atm.team-knowledge-command-map`.

## Acceptance

- `node --strip-types tests/cli/team-knowledge-final-600.test.ts` passes.
- `npm run validate:team-agents` passes.
- `npm run typecheck` passes.
- Existing callers of `runTeamKnowledge` and `buildTeamKnowledgeSummary` do not need import changes.
