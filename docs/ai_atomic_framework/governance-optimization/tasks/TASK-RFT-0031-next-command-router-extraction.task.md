---
task_id: TASK-RFT-0031
title: Extract next.ts route resolution into bounded modules
status: planned
owner: atm-core
priority: P1
depends_on: [TASK-RFT-0030]
related_plan: docs/ai_atomic_framework/governance-optimization/ATM治理流程與Team-Agents加速優化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/next.ts
  - packages/cli/src/commands/next/**/*.ts
  - tests/cli/next-*.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
deliverables:
  - packages/cli/src/commands/next.ts
  - packages/cli/src/commands/next/**/*.ts
  - tests/cli/next-command-router-extraction.test.ts
validators:
  - node --strip-types tests/cli/next-command-router-extraction.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.next-command-router-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.next-route-resolution
      pattern: Route Resolver
      source: packages/cli/src/commands/next.ts
      disposition: extract
      inlineReason: null
    - atom: atm.next-playbook-projection
      pattern: Projection Builder
      source: packages/cli/src/commands/next.ts
      disposition: extract
      inlineReason: null
---

# TASK-RFT-0031 - Extract next.ts route resolution into bounded modules

## Acceptance

- Reduce `packages/cli/src/commands/next.ts` below 2,000 lines in this slice and leave a follow-up path to reach 600 lines.
- Extract route resolution and playbook projection into bounded modules.
- Preserve `node atm.mjs next --json` and `node atm.mjs next --prompt ... --json` behavior.

