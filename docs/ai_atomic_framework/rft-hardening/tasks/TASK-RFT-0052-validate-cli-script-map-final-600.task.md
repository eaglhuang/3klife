---
task_id: TASK-RFT-0052
title: Finish validate-cli script map below 600 lines
status: done
owner: atm-core
priority: P1
depends_on: [TASK-RFT-0051]
related_plan: docs/ai_atomic_framework/governance-optimization/ATM治理流程與Team-Agents加速優化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/validate-cli.ts
  - scripts/validate-cli/**/*.ts
  - tests/cli/validate-cli-final-600.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts.json
deliverables:
  - scripts/validate-cli.ts
  - scripts/validate-cli/**/*.ts
  - tests/cli/validate-cli-final-600.test.ts
validators:
  - node --strip-types tests/cli/validate-cli-final-600.test.ts
  - npm run validate:cli
  - npm run typecheck
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.validate-cli-script-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts.json
  extractionCandidates:
    - atom: atm.validate-cli-script-facade
      pattern: Facade
      source: scripts/validate-cli.ts
      disposition: extract
      inlineReason: null
    - atom: atm.validate-cli-validator-strategy-map
      pattern: Strategy Map
      source: scripts/validate-cli.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-16T02:19:43.449Z"
completed_by_agent: "codex-task-rft-0052"
closedAt: "2026-07-16T02:19:43.449Z"
closedByActor: "codex-task-rft-0052"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-16T02-19-43-363Z-close-ec439ca876dc"
lastTransitionAt: "2026-07-16T02:19:43.449Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "957917cee315295f6e0232a01bd6aea2fa032d26"
---

# TASK-RFT-0052 - Finish validate-cli script map below 600 lines

## Acceptance

- Reduce `scripts/validate-cli.ts` to at or below 600 physical lines.
- Extract validation suites, command execution helpers, fixture discovery, and result rendering into bounded modules under `scripts/validate-cli/**`.
- Keep every new or touched validate-cli support module at or below 600 physical lines.
- Preserve `npm run validate:cli` behavior and existing CLI validation coverage.
- Add a final-600 validator that checks `scripts/validate-cli.ts` and `scripts/validate-cli/**/*.ts`.
- Do not touch `release/**` artifacts or unrelated runner-sync work.

## Notes

- Current audit found `scripts/validate-cli.ts` at 2035 physical lines after TASK-RFT-0051 was done.
- This card is part of the RFT large-file atom-map/facade split series and should make the source tree free of TypeScript/JavaScript files above 2,000 physical lines outside generated/release outputs.
