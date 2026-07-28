---
task_id: TASK-RFT-0034
title: Split closure-packet schema into bounded schema modules
status: done
owner: atm-core
priority: P2
depends_on: [TASK-RFT-0033]
related_plan: docs/ai_atomic_framework/governance-optimization/ATM治理流程與Team-Agents加速優化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/framework-development/closure-packet-schema.ts
  - packages/cli/src/commands/framework-development/closure-packet-schema/**/*.ts
  - tests/cli/framework-*.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
deliverables:
  - packages/cli/src/commands/framework-development/closure-packet-schema.ts
  - packages/cli/src/commands/framework-development/closure-packet-schema/**/*.ts
  - tests/cli/closure-packet-schema-extraction.test.ts
validators:
  - node --strip-types tests/cli/closure-packet-schema-extraction.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.framework-closure-packet-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.closure-packet-schema-core
      pattern: Schema Module
      source: packages/cli/src/commands/framework-development/closure-packet-schema.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-15T12:43:28.148Z"
completed_by_agent: "codex-task-rft-0034"
closedAt: "2026-07-15T12:43:28.148Z"
closedByActor: "codex-task-rft-0034"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-15T12-43-28-046Z-close-fe1d25c13f90"
lastTransitionAt: "2026-07-15T12:43:28.148Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "23ecb3658795c6e37aa5be1fc90e01ba57998ebd"
---

# TASK-RFT-0034 - Split closure-packet schema into bounded schema modules

## Acceptance

- Split closure-packet schema constants and validators into bounded schema modules.
- Preserve schema exports and current validation behavior.
- Keep each new or touched module at or below 600 lines.

