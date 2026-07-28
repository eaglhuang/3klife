---
task_id: TASK-RFT-0035
title: Split task-ledger validator suite implementation
status: done
owner: atm-core
priority: P2
depends_on: [TASK-RFT-0034]
related_plan: docs/ai_atomic_framework/governance-optimization/ATM治理流程與Team-Agents加速優化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/validators/task-ledger/suite-impl.ts
  - scripts/validators/task-ledger/**/*.ts
  - tests/cli/task-ledger-*.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts.json
deliverables:
  - scripts/validators/task-ledger/suite-impl.ts
  - scripts/validators/task-ledger/**/*.ts
  - tests/cli/task-ledger-suite-extraction.test.ts
validators:
  - node --strip-types tests/cli/task-ledger-suite-extraction.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.task-ledger-validator-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts.json
  extractionCandidates:
    - atom: atm.task-ledger-suite-runner
      pattern: Validator Suite
      source: scripts/validators/task-ledger/suite-impl.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-15T12:59:51.599Z"
completed_by_agent: "codex-task-rft-0035"
closedAt: "2026-07-15T12:59:51.599Z"
closedByActor: "codex-task-rft-0035"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-15T12-59-51-505Z-close-61da2180bd39"
lastTransitionAt: "2026-07-15T12:59:51.599Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "e905934fa988c02309a03fb0c2dd457fcf94cab2"
---

# TASK-RFT-0035 - Split task-ledger validator suite implementation

## Acceptance

- Split task-ledger suite implementation by validator concern.
- Preserve current validation results.
- Keep each new or touched module at or below 600 lines.

