---
task_id: TASK-RFT-0030
title: Extract team-legacy command paths into bounded modules
status: done
owner: atm-core
priority: P1
depends_on: [TASK-RFT-0029]
related_plan: docs/ai_atomic_framework/governance-optimization/ATM治理流程與Team-Agents加速優化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/team-legacy.ts
  - packages/cli/src/commands/team/**/*.ts
  - tests/cli/team-*.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
deliverables:
  - packages/cli/src/commands/team-legacy.ts
  - packages/cli/src/commands/team/legacy/**/*.ts
  - tests/cli/team-legacy-command-extraction.test.ts
validators:
  - node --strip-types tests/cli/team-command-facade-atomization.test.ts
  - node --strip-types tests/cli/team-legacy-command-extraction.test.ts
  - node --strip-types tests/cli/team-plan-contract.test.ts
  - node --strip-types tests/cli/team-agents-dogfood.test.ts
  - npm run typecheck
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the extraction commit and restore team-legacy.ts behavior through the TASK-RFT-0029 facade.
atomizationImpact:
  ownerAtomOrMap: atm.team-agents-command-router-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.team-legacy-plan-path
      pattern: Extract Command Path
      source: packages/cli/src/commands/team-legacy.ts
      disposition: extract
      inlineReason: null
    - atom: atm.team-legacy-start-status-path
      pattern: Extract Command Path
      source: packages/cli/src/commands/team-legacy.ts
      disposition: extract
      inlineReason: null
    - atom: atm.team-legacy-report-cost-path
      pattern: Extract Command Path
      source: packages/cli/src/commands/team-legacy.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-15T11:21:17.017Z"
completed_by_agent: "codex-task-rft-0030"
closedAt: "2026-07-15T11:21:17.017Z"
closedByActor: "codex-task-rft-0030"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-15T11-21-16-925Z-close-a30acbc4e900"
lastTransitionAt: "2026-07-15T11:21:17.017Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "ced82953f385a16ed2133fb360c8a9374bda25bf"
---

# TASK-RFT-0030 - Extract team-legacy command paths into bounded modules

## Problem

`packages/cli/src/commands/team-legacy.ts` remains over 2,000 lines after TASK-RFT-0029. The facade and registry are in place, but command behavior still concentrates in one legacy module.

## Acceptance

- Extract the highest-readability command paths from `team-legacy.ts` into bounded modules under `packages/cli/src/commands/team/legacy/`.
- Keep each new or touched support module at or below 600 lines.
- Preserve current Team command behavior covered by the listed validators.
- Add a regression that fails if `team-legacy.ts` or extracted legacy modules exceed the card's configured line boundary.
- Register extracted paths in the CLI atom-map shard.

