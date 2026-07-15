---
task_id: TASK-RFT-0037
title: Split pre-commit hook guard implementation into bounded modules
status: done
owner: atm-core
priority: P2
depends_on: [TASK-RFT-0036]
related_plan: docs/ai_atomic_framework/governance-optimization/ATM治理流程與Team-Agents加速優化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/hook/pre-commit.ts
  - packages/cli/src/commands/hook/**/*.ts
  - tests/cli/hook-*.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
deliverables:
  - packages/cli/src/commands/hook/pre-commit.ts
  - packages/cli/src/commands/hook/**/*.ts
  - tests/cli/pre-commit-hook-extraction.test.ts
validators:
  - node --strip-types tests/cli/pre-commit-hook-extraction.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.pre-commit-hook-guard-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.pre-commit-direction-lock-guard
      pattern: Guard Module
      source: packages/cli/src/commands/hook/pre-commit.ts
      disposition: extract
      inlineReason: null
    - atom: atm.pre-commit-framework-governance-guard
      pattern: Guard Module
      source: packages/cli/src/commands/hook/pre-commit.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-15T13:46:20.620Z"
completed_by_agent: "codex-task-rft-0037"
closedAt: "2026-07-15T13:46:20.620Z"
closedByActor: "codex-task-rft-0037"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-15T13-46-20-620Z-close-15936a2c4f50"
lastTransitionAt: "2026-07-15T13:46:20.620Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "195fb9a75015ff4e4831f3302c777711ff4e1f2e"
---

# TASK-RFT-0037 - Split pre-commit hook guard implementation into bounded modules

## Acceptance

- Split pre-commit hook guard checks into bounded modules.
- Preserve protected framework commit behavior.
- Keep each new or touched module at or below 600 lines.

