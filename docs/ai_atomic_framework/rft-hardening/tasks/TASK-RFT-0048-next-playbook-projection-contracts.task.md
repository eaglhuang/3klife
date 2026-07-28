---
task_id: TASK-RFT-0048
title: Extract next playbook projection contracts below 600 lines
status: done
owner: atm-core
priority: P1
depends_on: [TASK-RFT-0031, TASK-RFT-0046]
related_plan: docs/ai_atomic_framework/governance-optimization/ATM治理流程與Team-Agents加速優化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/next/playbook-projection.ts
  - packages/cli/src/commands/next/playbook-projection/**/*.ts
  - tests/cli/next-playbook-projection-contracts.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
deliverables:
  - packages/cli/src/commands/next/playbook-projection.ts
  - packages/cli/src/commands/next/playbook-projection/**/*.ts
  - tests/cli/next-playbook-projection-contracts.test.ts
validators:
  - node --strip-types tests/cli/next-playbook-projection-contracts.test.ts
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
    - atom: atm.next-playbook-projection-contracts
      pattern: Result Contract Object
      source: packages/cli/src/commands/next/playbook-projection.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-15T17:45:26.819Z"
completed_by_agent: "codex-task-rft-0048"
closedAt: "2026-07-15T17:45:26.819Z"
closedByActor: "codex-task-rft-0048"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-15T17-45-26-709Z-close-9c2e37f3cdd9"
lastTransitionAt: "2026-07-15T17:45:26.819Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "0cc68138dbde3bc2af3adce8c1f6dc8473e1a0ec"
---

# TASK-RFT-0048 - Extract next playbook projection contracts below 600 lines

## Acceptance

- Reduce `packages/cli/src/commands/next/playbook-projection.ts` to at or below 600 physical lines.
- Extract playbook builders, governance readiness projection, and message assembly contracts into bounded modules under `packages/cli/src/commands/next/playbook-projection/`.
- Keep every new or touched playbook-projection module at or below 600 physical lines.
- Preserve `next` channel playbook JSON shapes.
- Do not touch `TASK-RFT-0037`, `TASK-RFT-0045`, `packages/cli/src/commands/taskflow/__tests__/**`, or `release/**` artifacts.

## Notes

- This is a final-600 slice for the `next.ts` transitional extraction gap recorded after TASK-RFT-0031.
- Follow-up cards remain required for `next.ts` and any shared route contracts left above 600 lines.
