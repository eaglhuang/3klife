---
task_id: TASK-RFT-0059
title: Split plugin bootstrap facade below 600 lines
status: done
owner: atm-core
priority: P1
depends_on: [TASK-RFT-0058]
related_plan: docs/ai_atomic_framework/governance-optimization/ATM-governance-optimization.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/plugin-governance-local/src/bootstrap/bootstrap.ts
  - packages/plugin-governance-local/src/bootstrap/bootstrap/**/*.ts
  - tests/plugin-governance-local/bootstrap-final-600.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-plugins*.json
deliverables:
  - packages/plugin-governance-local/src/bootstrap/bootstrap.ts
  - packages/plugin-governance-local/src/bootstrap/bootstrap/**/*.ts
  - tests/plugin-governance-local/bootstrap-final-600.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-plugins*.json
validators:
  - node --strip-types tests/plugin-governance-local/bootstrap-final-600.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.plugin-governance-bootstrap-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-plugins.json
  extractionCandidates:
    - atom: atm.plugin-governance-bootstrap-facade
      pattern: Facade
      source: packages/plugin-governance-local/src/bootstrap/bootstrap.ts
      disposition: extract
      inlineReason: null
    - atom: atm.plugin-governance-bootstrap-adapter-map
      pattern: Adapter/Port
      source: packages/plugin-governance-local/src/bootstrap/bootstrap.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-16T04:06:19.049Z"
completed_by_agent: "codex-task-rft-0059"
closedAt: "2026-07-16T04:06:19.049Z"
closedByActor: "codex-task-rft-0059"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-16T04-06-18-957Z-close-45237231618b"
lastTransitionAt: "2026-07-16T04:06:19.049Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "f450aaa77ea60a5478acdda1eeb66c828f80797f"
---

# TASK-RFT-0059 - Split plugin bootstrap facade below 600 lines

## Acceptance

- Reduce `packages/plugin-governance-local/src/bootstrap/bootstrap.ts` to at or below 600 physical lines.
- Move bootstrap/adopter implementation support into bounded modules under `packages/plugin-governance-local/src/bootstrap/bootstrap/**`.
- Keep every new or touched bootstrap support module at or below 600 physical lines.
- Preserve the existing public exports used by plugin callers, package exports, scripts, and tests.
- Add a final-600 validator for the facade and `packages/plugin-governance-local/src/bootstrap/bootstrap/**/*.ts`.
- Update plugin owner shard coverage for the extracted bootstrap implementation modules.

## Notes

- Current audit found `packages/plugin-governance-local/src/bootstrap/bootstrap.ts` at 1091 physical lines after TASK-RFT-0058.
- This card continues the RFT large-file atom-map/facade split series toward the physical-file limit of 600 lines.
