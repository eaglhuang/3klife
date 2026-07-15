---
task_id: ATM-GOV-0154
title: Add runner-sync steward release command
status: done
owner: atm-core
priority: P0
depends_on: [ATM-GOV-0150, ATM-GOV-0152]
related_plan: docs/ai_atomic_framework/governance-optimization/ATM治理流程與Team-Agents加速優化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src/broker/runner-sync-steward-queue.ts
  - packages/core/src/broker/__tests__/runner-sync-steward-queue.test.ts
  - packages/cli/src/commands/broker.ts
  - packages/cli/src/commands/command-specs/broker.spec.ts
  - docs/governance/error-code-registry.json
  - tests/cli/runner-sync-steward-release.test.ts
deliverables:
  - packages/core/src/broker/runner-sync-steward-queue.ts
  - packages/core/src/broker/__tests__/runner-sync-steward-queue.test.ts
  - packages/cli/src/commands/broker.ts
  - docs/governance/error-code-registry.json
validators:
  - node --strip-types packages/core/src/broker/__tests__/runner-sync-steward-queue.test.ts
  - node --strip-types tests/cli/runner-sync-steward-release.test.ts
  - npm run generate:error-codes
  - npm run typecheck
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.runner-sync.coalescing-steward-queue
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
  extractionCandidates:
    - atom: atm.runner-sync.steward-release
      pattern: Policy Object
      source: packages/core/src/broker/runner-sync-steward-queue.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-15T17:28:12.864Z"
completed_by_agent: "codex-gpt-5-5-captain"
closedAt: "2026-07-15T17:28:12.864Z"
closedByActor: "codex-gpt-5-5-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-15T17-28-12-864Z-close-165efef16a92"
lastTransitionAt: "2026-07-15T17:28:12.864Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "0b3f6df20e3b48bc88eaa48a1160321a69818aa3"
---

# ATM-GOV-0154 - Add runner-sync steward release command

## Acceptance

- Add a governed `broker runner-sync release` or equivalent source/frozen CLI route for a live queue-head steward work item.
- Release must require task id, steward work id, and a receipt reference or receipt digest for the completed runner-sync build.
- Release must clear the queue-head group, advance the next waiting group, and return owner, queue position, suggested next action, and empty-queue state when applicable.
- Stale cleanup must remain separate from live release and must not silently remove a live queue-head owner.
- Register `ATM_RUNNER_STALE_WRITE_REFUSED` in `docs/governance/error-code-registry.json`, regenerate error-code docs, and route its remediation through runner-sync steward guidance when active shared release surfaces exist.
- Add tests for live release, wrong owner/work-id refusal, stale cleanup, and queue advancement.
- Do not touch `TASK-RFT-0037`, `TASK-RFT-0045`, `packages/cli/src/commands/taskflow/__tests__/**`, or unrelated release artifacts as source delivery.

## Notes

- This card was opened from `ATM-BUG-2026-07-16-003` after TASK-RFT-0046 preflight found that the source steward queue can enqueue/status/cleanup but cannot complete a live queue-head without hand-editing `.atm/runtime`.
