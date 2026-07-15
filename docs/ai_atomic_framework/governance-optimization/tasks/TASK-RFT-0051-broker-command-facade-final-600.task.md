---
task_id: TASK-RFT-0051
title: Finish broker command facade below 600 lines
status: done
owner: atm-core
priority: P1
depends_on: [TASK-TEAM-0076, ATM-GOV-0154]
related_plan: docs/ai_atomic_framework/governance-optimization/ATM瘝餌?瘚??eam-Agents????急.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/broker.ts
  - packages/cli/src/commands/broker/**/*.ts
  - tests/cli/broker-command-facade-final-600.test.ts
  - tests/cli/pre-team-foundation-gate.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
deliverables:
  - packages/cli/src/commands/broker.ts
  - packages/cli/src/commands/broker/**/*.ts
  - tests/cli/broker-command-facade-final-600.test.ts
validators:
  - node --strip-types tests/cli/broker-command-facade-final-600.test.ts
  - node --strip-types tests/cli/pre-team-foundation-gate.test.ts
  - npm run typecheck
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.broker-command-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.broker-command-facade
      pattern: Facade
      source: packages/cli/src/commands/broker.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-15T18:01:57.432Z"
completed_by_agent: "codex-task-rft-0051"
closedAt: "2026-07-15T18:01:57.432Z"
closedByActor: "codex-task-rft-0051"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-15T18-01-57-432Z-close-afe417c6d86e"
lastTransitionAt: "2026-07-15T18:01:57.432Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "6ec5b4d66ab6f239e8775ee10982f2fa108e1081"
---

# TASK-RFT-0051 - Finish broker command facade below 600 lines

## Acceptance

- Reduce `packages/cli/src/commands/broker.ts` to at or below 600 physical lines.
- Extract broker command contracts, persistence helpers, status/list/report rendering, cleanup, and mutation-admission command handlers into bounded modules under `packages/cli/src/commands/broker/`.
- Keep every new or touched broker command module at or below 600 physical lines.
- Preserve Broker CLI behavior for `status`, `list`, `admit`, `cleanup`, queue/freeze snapshots, and shared-surface coordination evidence.
- Do not touch `release/**` artifacts or unrelated Team legacy / next command RFT surfaces.

## Notes

- This is the final remaining >2,000-line source file after TASK-RFT-0048. Completing this card should make the current framework source tree free of TypeScript/JavaScript command files above 2,000 physical lines.
