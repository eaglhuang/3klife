---
task_id: TASK-RFT-0046
title: Extract next prompt-result contracts below 600 lines
status: done
owner: atm-core
priority: P1
depends_on: [TASK-RFT-0031]
related_plan: docs/ai_atomic_framework/governance-optimization/ATM治理流程與Team-Agents加速優化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/next/prompt-results.ts
  - packages/cli/src/commands/next/prompt-result-contracts.ts
  - tests/cli/next-prompt-results-contract-extraction.test.ts
  - tests/cli/next-command-router-extraction.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
deliverables:
  - packages/cli/src/commands/next/prompt-results.ts
  - packages/cli/src/commands/next/prompt-result-contracts.ts
  - tests/cli/next-prompt-results-contract-extraction.test.ts
validators:
  - node --strip-types tests/cli/next-prompt-results-contract-extraction.test.ts
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
    - atom: atm.next-prompt-result-contracts
      pattern: Result Contract Object
      source: packages/cli/src/commands/next/prompt-results.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-15T17:11:21.194Z"
completed_by_agent: "codex-task-rft-0046"
closedAt: "2026-07-15T17:11:21.194Z"
closedByActor: "codex-task-rft-0046"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-15T17-11-20-988Z-close-df03a8c50c71"
lastTransitionAt: "2026-07-15T17:11:21.194Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "008d4d62f0d792a7b19611ea474dfa6104ec590c"
---

# TASK-RFT-0046 - Extract next prompt-result contracts below 600 lines

## Acceptance

- Reduce `packages/cli/src/commands/next/prompt-results.ts` to at or below 600 physical lines.
- Extract prompt-scoped result contract assembly into `packages/cli/src/commands/next/prompt-result-contracts.ts`.
- Keep each new or touched next prompt-result module at or below 600 physical lines.
- Preserve `node atm.mjs next --json` and `node atm.mjs next --prompt ... --json` behavior.
- Add a focused regression that fails if `prompt-results.ts` or `prompt-result-contracts.ts` exceeds 600 lines.
- Do not touch `TASK-RFT-0037`, `TASK-RFT-0045`, `packages/cli/src/commands/taskflow/__tests__/**`, or `release/**` artifacts.

## Notes

- This is a final-600 slice for the `next.ts` transitional extraction gap recorded after TASK-RFT-0031.
- Follow-up cards remain required for `next.ts`, `route-resolution.ts`, and `playbook-projection.ts`.
