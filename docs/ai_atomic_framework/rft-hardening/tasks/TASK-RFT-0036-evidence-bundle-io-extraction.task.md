---
task_id: TASK-RFT-0036
title: Split evidence bundle IO into bounded modules
status: done
owner: atm-core
priority: P2
depends_on: [TASK-RFT-0035]
related_plan: docs/ai_atomic_framework/governance-optimization/ATM治理流程與Team-Agents加速優化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/evidence/bundle-io.ts
  - packages/cli/src/commands/evidence/**/*.ts
  - tests/cli/evidence-*.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
deliverables:
  - packages/cli/src/commands/evidence/bundle-io.ts
  - packages/cli/src/commands/evidence/**/*.ts
  - tests/cli/evidence-bundle-io-extraction.test.ts
validators:
  - node --strip-types tests/cli/evidence-bundle-io-extraction.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.evidence-bundle-io-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.evidence-bundle-reader
      pattern: IO Adapter
      source: packages/cli/src/commands/evidence/bundle-io.ts
      disposition: extract
      inlineReason: null
    - atom: atm.evidence-bundle-writer
      pattern: IO Adapter
      source: packages/cli/src/commands/evidence/bundle-io.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-15T13:11:16.750Z"
completed_by_agent: "codex-task-rft-0036"
closedAt: "2026-07-15T13:11:16.750Z"
closedByActor: "codex-task-rft-0036"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-15T13-11-16-750Z-close-cc086e37ee59"
lastTransitionAt: "2026-07-15T13:11:16.750Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "72ec5904e1cd092f3632f3e7be2fdbb5c5f0562f"
---

# TASK-RFT-0036 - Split evidence bundle IO into bounded modules

## Acceptance

- Split read/write/manifest helpers into bounded modules.
- Preserve evidence bundle read/write behavior.
- Keep each new or touched module at or below 600 lines.

