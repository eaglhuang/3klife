---
task_id: TASK-SKL-0026
title: Causal validator selector and phase-suite scheduler
status: done
owner: atm-agent-skills
priority: P0
milestone: ATM-SKL-VG-R0.5
depends_on:
  - TASK-SKL-0023
  - TASK-SKL-0024
related_plan: skl-tool-first-upgrade/SKL-validator-governance-test-case-catalog-plan.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/test-catalog.config.json
  - packages/cli/src/commands/test-catalog.ts
  - scripts/run-validators/implementation.ts
  - packages/core/src/evidence/validator-lifecycle.ts
  - packages/core/src/evidence/phase-suite.ts
  - packages/cli/src/commands/batch/plan-executor.ts
  - tests/cli/causal-validator-selector.test.ts
  - tests/cli/phase-suite-promotion-gate.test.ts
deliverables:
  - packages/cli/src/commands/test-catalog.ts
  - scripts/run-validators/implementation.ts
  - packages/core/src/evidence/validator-lifecycle.ts
  - packages/core/src/evidence/phase-suite.ts
  - tests/cli/causal-validator-selector.test.ts
  - tests/cli/phase-suite-promotion-gate.test.ts
validators:
  - node --strip-types tests/cli/causal-validator-selector.test.ts
  - node --strip-types tests/cli/phase-suite-promotion-gate.test.ts
  - npm run typecheck
errorCodes: []
evidence:
  required: causal-selection-and-phase-suite-checkpoint
rollback:
  strategy: revert-commit-and-select-legacy-all-run-profile
atomizationImpact:
  ownerAtomOrMap: atm.validator-runtime
  mapUpdates: []
  extractionCandidates:
    - atom: atm.causal-validator-selector
      pattern: Selection Policy
      source: packages/cli/src/commands/test-catalog.ts
      disposition: extract
    - atom: atm.phase-suite-checkpoint
      pattern: Promotion Gate
      source: packages/core/src/evidence/phase-suite.ts
      disposition: extract
createdByCommand: atm plan card create
completed_at: "2026-07-26T12:33:01.040Z"
completed_by_agent: "claude-004-skl-0026-captain"
closedAt: "2026-07-26T12:33:01.040Z"
closedByActor: "claude-004-skl-0026-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-26T12-33-01-040Z-close-49c92ad1b7d5"
lastTransitionAt: "2026-07-26T12:33:01.040Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "c778a76b8c2b0f6c8461bfb47713662c81cb8393"
---

# TASK-SKL-0026 Causal validator selector and phase-suite scheduler

## Intent

Select the smallest sound task-required case set from explicit references and
causal impact edges, then schedule broader suites at governed batch, milestone,
plan-verdict and release checkpoints.

## Acceptance

- [ ] Before implementation, invoke `atm-deep-module-refactor` on validator selection, evidence freshness, and phase scheduling. Seal the proposed `evaluateValidationContract(task, changeSet, catalog, evidence)` interface, adapter inventory, deletion test, and `deep-module-review:7144d296` baseline.
- [ ] The evaluator returns required/advisory case IDs, exact executable manifests, causal reasons, omissions, phase owners, freshness inputs, and unknown-boundary diagnostics without executing commands or mutating evidence.
- [ ] Every selection and omission has a deterministic causal reason.
- [ ] High risk deepens testing only inside the proven impact cone.
- [ ] Unknown boundaries request scope/impact clarification instead of silently
      running the full repository.
- [ ] Phase-suite receipts block promotion/release when missing, stale or failed.
- [ ] Cache, fan-out, queue wait, selection ratio, duration, false blocks and
      defect-detection tier are observable.
- [ ] Task-local tests may contribute integration cases to shared groups by stable case ID without taking ownership of the shared test file. Promotion from `test_task_*` to `test_model_*` preserves aliases and lineage in the decentralized catalog.
- [ ] Deletion tests remove required-set recomputation from runner and batch adapters. A missing evaluator makes required validation fail closed rather than defaulting to full-repository execution.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-24T03:32:35.866Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"skl-tool-first-upgrade/tasks/TASK-SKL-0026-causal-validator-selector-and-phase-suite-scheduler.task.md","contentDigest":"sha256:4ba8423fd039f63b7b5c9d6e6bfbb312ade51a378912779c7d3f62c81dd66118"} -->
