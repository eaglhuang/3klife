---
task_id: TASK-RFT-0047
title: Extract next route-resolution strategy map below 600 lines
status: done
owner: atm-core
priority: P1
depends_on: [TASK-RFT-0031, TASK-RFT-0046]
related_plan: docs/ai_atomic_framework/governance-optimization/ATM治理流程與Team-Agents加速優化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/next/route-resolution.ts
  - packages/cli/src/commands/next/route-resolution/**/*.ts
  - tests/cli/next-route-resolution-strategy-map.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
deliverables:
  - packages/cli/src/commands/next/route-resolution.ts
  - packages/cli/src/commands/next/route-resolution/**/*.ts
  - tests/cli/next-route-resolution-strategy-map.test.ts
validators:
  - node --strip-types tests/cli/next-route-resolution-strategy-map.test.ts
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
    - atom: atm.next-route-resolution-strategy-map
      pattern: Strategy Map
      source: packages/cli/src/commands/next/route-resolution.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-15T17:27:47.547Z"
completed_by_agent: "codex-task-rft-0047"
closedAt: "2026-07-15T17:27:47.547Z"
closedByActor: "codex-task-rft-0047"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-15T17-27-47-547Z-close-e034f6a9b04e"
lastTransitionAt: "2026-07-15T17:27:47.547Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "368189cad30ea83bab5a1aa40f5e491dd2d79a89"
---

# TASK-RFT-0047 - Extract next route-resolution strategy map below 600 lines

## Acceptance

- Reduce `packages/cli/src/commands/next/route-resolution.ts` to at or below 600 physical lines.
- Extract route buckets, prompt classifiers, and route result builders into bounded modules under `packages/cli/src/commands/next/route-resolution/`.
- Keep every new or touched route-resolution module at or below 600 physical lines.
- Preserve prompt-scoped `next` behavior and the existing `TASK-RFT-0031` extraction regression.
- Do not touch `TASK-RFT-0037`, `TASK-RFT-0045`, `packages/cli/src/commands/taskflow/__tests__/**`, or `release/**` artifacts.

## Notes

- This is a final-600 slice for the `next.ts` transitional extraction gap recorded after TASK-RFT-0031.
- Follow-up cards remain required for `next.ts` and `playbook-projection.ts`.
