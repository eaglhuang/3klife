---
task_id: TASK-RFT-0033
title: Extract tasks legacy implementation into command modules
status: done
owner: atm-core
priority: P1
depends_on: [TASK-RFT-0032]
related_plan: docs/ai_atomic_framework/governance-optimization/ATM治理流程與Team-Agents加速優化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/tasks/legacy-impl.ts
  - packages/cli/src/commands/tasks/**/*.ts
  - tests/cli/tasks-*.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
deliverables:
  - packages/cli/src/commands/tasks/legacy-impl.ts
  - packages/cli/src/commands/tasks/**/*.ts
  - tests/cli/tasks-legacy-impl-extraction.test.ts
validators:
  - node --strip-types tests/cli/tasks-legacy-impl-extraction.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.tasks-command-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.tasks-import-command
      pattern: Command Handler
      source: packages/cli/src/commands/tasks/legacy-impl.ts
      disposition: extract
      inlineReason: null
    - atom: atm.tasks-status-close-command
      pattern: Command Handler
      source: packages/cli/src/commands/tasks/legacy-impl.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-15T12:13:41.407Z"
completed_by_agent: "codex-task-rft-0033"
closedAt: "2026-07-15T12:13:41.407Z"
closedByActor: "codex-task-rft-0033"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-15T12-13-41-407Z-close-dd6a9b930da4"
lastTransitionAt: "2026-07-15T12:13:41.407Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "0fb6c49b84b36a54b61d0227d6e9bb45775f162a"
---

# TASK-RFT-0033 - Extract tasks legacy implementation into command modules

## Acceptance

- Split the oversized tasks legacy implementation into bounded command modules.
- Preserve import/status/close/audit behavior.
- Keep each new or touched module at or below 600 lines.

