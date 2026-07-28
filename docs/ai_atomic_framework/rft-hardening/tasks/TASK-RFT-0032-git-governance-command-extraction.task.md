---
task_id: TASK-RFT-0032
title: Extract git-governance commit and push guards into bounded modules
status: done
owner: atm-core
priority: P1
depends_on: [TASK-RFT-0031]
related_plan: docs/ai_atomic_framework/governance-optimization/ATM治理流程與Team-Agents加速優化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/git-governance.ts
  - packages/cli/src/commands/git-governance/**/*.ts
  - tests/cli/git-*.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
deliverables:
  - packages/cli/src/commands/git-governance.ts
  - packages/cli/src/commands/git-governance/**/*.ts
  - tests/cli/git-governance-command-extraction.test.ts
validators:
  - node --strip-types tests/cli/git-governance-command-extraction.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.git-governance-command-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.git-commit-governance
      pattern: Command Handler
      source: packages/cli/src/commands/git-governance.ts
      disposition: extract
      inlineReason: null
    - atom: atm.git-push-governance
      pattern: Guard Orchestrator
      source: packages/cli/src/commands/git-governance.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-15T12:00:15.666Z"
completed_by_agent: "codex-task-rft-0032"
closedAt: "2026-07-15T12:00:15.666Z"
closedByActor: "codex-task-rft-0032"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-15T12-00-15-467Z-close-10ad76aefaa3"
lastTransitionAt: "2026-07-15T12:00:15.666Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "104b86e1bd5fb5e7ca984f06d04de661af5b2521"
---

# TASK-RFT-0032 - Extract git-governance commit and push guards into bounded modules

## Acceptance

- Split commit, pre-push, and evidence-boundary logic into bounded modules.
- Preserve protected branch guard behavior.
- Keep each new or touched module at or below 600 lines.

