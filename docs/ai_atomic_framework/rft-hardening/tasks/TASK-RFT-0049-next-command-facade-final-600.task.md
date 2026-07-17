---
task_id: TASK-RFT-0049
title: Finish next command facade below 600 lines
status: done
owner: atm-core
priority: P1
depends_on: [TASK-RFT-0046, TASK-RFT-0047, TASK-RFT-0048]
related_plan: docs/ai_atomic_framework/governance-optimization/ATM治理流程與Team-Agents加速優化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/next.ts
  - packages/cli/src/commands/next/**/*.ts
  - tests/cli/next-command-facade-final-600.test.ts
  - tests/cli/next-command-router-extraction.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
deliverables:
  - packages/cli/src/commands/next.ts
  - packages/cli/src/commands/next/**/*.ts
  - tests/cli/next-command-facade-final-600.test.ts
validators:
  - node --strip-types tests/cli/next-command-facade-final-600.test.ts
  - node --strip-types tests/cli/next-command-router-extraction.test.ts
  - npm run typecheck
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.next-command-router-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.next-command-facade
      pattern: Facade
      source: packages/cli/src/commands/next.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-16T01:45:25.769Z"
completed_by_agent: "codex-task-rft-0049"
closedAt: "2026-07-16T01:45:25.769Z"
closedByActor: "codex-task-rft-0049"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-16T01-45-25-769Z-close-cc960c79383c"
lastTransitionAt: "2026-07-16T01:45:25.769Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "fe4e05517347402309e8bd470c08cc660fc73c23"
---

# TASK-RFT-0049 - Finish next command facade below 600 lines

## Acceptance

- Reduce `packages/cli/src/commands/next.ts` to at or below 600 physical lines.
- Keep `next.ts` as a thin command facade that delegates to bounded `next/` modules.
- Keep every touched `next/` support module at or below 600 physical lines, or explicitly fail this card and open a narrower follow-up before close.
- Preserve `node atm.mjs next --json`, `node atm.mjs next --prompt ... --json`, and task-scoped claim behavior.
- Do not touch `TASK-RFT-0037`, `TASK-RFT-0045`, `packages/cli/src/commands/taskflow/__tests__/**`, or `release/**` artifacts.

## Notes

- This card is not allowed to close while any touched `next` command module remains above 600 physical lines.
