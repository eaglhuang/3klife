---
task_id: TASK-RFT-0050
title: Finish team legacy facade below 600 lines
status: done
owner: atm-core
priority: P1
depends_on: [TASK-RFT-0044]
related_plan: docs/ai_atomic_framework/governance-optimization/ATM治理流程與Team-Agents加速優化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/team-legacy.ts
  - packages/cli/src/commands/team/legacy/**/*.ts
  - tests/cli/team-legacy-final-600.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
deliverables:
  - packages/cli/src/commands/team-legacy.ts
  - packages/cli/src/commands/team/legacy/**/*.ts
  - tests/cli/team-legacy-final-600.test.ts
validators:
  - node --strip-types tests/cli/team-legacy-final-600.test.ts
  - node --strip-types tests/cli/team-command-facade-atomization.test.ts
  - npm run typecheck
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.team-command-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.team-legacy-command-facade
      pattern: Facade
      source: packages/cli/src/commands/team-legacy.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-16T02:01:58.352Z"
completed_by_agent: "codex-task-rft-0050"
closedAt: "2026-07-16T02:01:58.352Z"
closedByActor: "codex-task-rft-0050"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-16T02-01-58-352Z-close-b2a2b5da97d9"
lastTransitionAt: "2026-07-16T02:01:58.352Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "c0adb1bafdcfe7367c19a658ebb2f5f875626e3a"
---

# TASK-RFT-0050 - Finish team legacy facade below 600 lines

## Acceptance

- Reduce `packages/cli/src/commands/team-legacy.ts` to at or below 600 physical lines.
- Keep `team-legacy.ts` as a bounded facade over `packages/cli/src/commands/team/legacy/**` atoms.
- Keep every new or touched Team legacy support module at or below 600 physical lines.
- Preserve `team plan`, `team start`, `team status`, `team execute`, admission, cost, and report behavior.
- Do not touch `TASK-RFT-0037`, `TASK-RFT-0045`, `packages/cli/src/commands/taskflow/__tests__/**`, or `release/**` artifacts.

## Notes

- This is the final-600 convergence card for the Team legacy split wave. Earlier RFT cards reduced the file below 2,000 lines but intentionally did not complete the 600-line target.
