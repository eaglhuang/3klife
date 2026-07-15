---
task_id: TASK-RFT-0037
title: Split pre-commit hook guard implementation into bounded modules
status: planned
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
---

# TASK-RFT-0037 - Split pre-commit hook guard implementation into bounded modules

## Acceptance

- Split pre-commit hook guard checks into bounded modules.
- Preserve protected framework commit behavior.
- Keep each new or touched module at or below 600 lines.

