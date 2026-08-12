---
task_id: ATM-GOV-0331
title: Wire deep evidence modules into production callers and remove shallow shells
status: done
owner: atm-evidence-integration
priority: P0
depends_on: [ATM-GOV-0330]
causalGraph:
  causalDependencies: [ATM-GOV-0330]
  startConditions:
    - Observed evidence interface and two adapters are green.
    - Production caller inventory is sealed and zero-caller candidates are named.
  softRelations: [ATM-GOV-0332]
  changedPublicSeams: [atm.evidenceRun.v1, atm.taskCloseEvidence.v1, atm.runnerReplayEvidence.v1]
  causalImpactEdges: [evidence-command, pre-close-gate, close-orchestration, runner-replay, shell-deletion]
  parallelFrontierInputs: [evidence-cli, taskflow-close, broker-replay]
  validatorReferences: [validate-governance-commands, validate-taskflow-close-atomicity, validate-state-replay, validate-module-boundaries]
  phaseOwner: correction-wave-4-integration
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo_plus_planning_closeback
scopePaths:
  - packages/cli/src/commands/evidence.ts
  - packages/cli/src/commands/evidence/
  - packages/cli/src/commands/taskflow/auto-evidence-mapper.ts
  - packages/cli/src/commands/taskflow/close-preflight.ts
  - packages/cli/src/commands/taskflow/close-orchestration.ts
  - packages/core/src/broker/replay/
  - packages/core/src/evidence/
deliverables:
  - packages/cli/src/commands/evidence/observed-source-loader.ts
  - packages/cli/src/commands/taskflow/auto-evidence-mapper.ts
  - packages/cli/src/commands/taskflow/close-preflight.ts
  - packages/core/src/broker/replay/lifecycle-receipt-observability.ts
  - tests/cli/observed-evidence-production-callers.test.ts
  - docs/reports/evidence-shell-deletion-receipt.json
validators:
  - node --strip-types tests/cli/observed-evidence-production-callers.test.ts
  - npm run validate:governance-commands
  - npm run validate:taskflow-close-atomicity
  - npm run validate:module-boundaries
testContributions:
  - caseId: test_observed_evidence_production_callers_0331
    semanticKey: observed_evidence_production_callers
    coversAcceptance: [ACC-1, ACC-2, ACC-3]
    coversImpactEdges: [evidence-command, pre-close-gate, close-orchestration, runner-replay]
    expectedRedPredicate: production close or replay cannot accept caller-authored outcome fields
    responsibility: task-required
    contractEdge: atm.taskCloseEvidence.v1
  - caseId: test_shallow_evidence_shell_deletion_0331
    semanticKey: shallow_evidence_shell_deletion
    coversAcceptance: [ACC-4, ACC-5]
    coversImpactEdges: [shell-deletion]
    expectedRedPredicate: deleting the deep module breaks all intended callers while deleted shallow shells have zero callers
    responsibility: task-required
    contractEdge: atm.evidenceRun.v1
requiredTestCaseIds: [test_observed_evidence_production_callers_0331, test_shallow_evidence_shell_deletion_0331]
phaseTestCaseIds: [test_group_plan4_incident_replay]
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [expand-contract, deep-module-refactor, tdd-oracle-fidelity]
evidence:
  required: command-backed
rollback:
  strategy: switch-production-callers-to-last-known-good-interface-and-retain-observations
atomizationImpact:
  ownerAtomOrMap: atm.evidence-integration
  mapUpdates: [atomic_workbench/maps/atm-cli-command-router-map.json, atomic_workbench/maps/atm-evidence-map.json]
  extractionCandidates: []
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-08-12T17:50:30.382Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-08-12T17:50:30.382Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-12T17-50-30-382Z-close-c2c263293174"
lastTransitionAt: "2026-08-12T17:50:30.382Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "d9ed2a68c1c2626c363a1351cbf428a012f78a8d"
---

# ATM-GOV-0331 Wire deep evidence modules into production callers and remove shallow shells

## Intent

把 0330 的深介面接入真正的 evidence、pre-close、close 與 replay 路徑，然後刪除或退役只被 focused fixture 呼叫的淺殼。介面測試取代 private-internal tests，migration 採 expand-contract 而非永久雙軌。

## Acceptance

- [ ] ACC-1: evidence run、auto-evidence、pre-close、close、replay 都消費同一 observed-source contract/digest，不各自重算 freshness。
- [ ] ACC-2: 舊 caller-supplied outcome 形式先相容讀取、停止新寫入、完成 migration，最後 old-form usage query 為零。
- [ ] ACC-3: production negative tests 覆蓋 forged realness、stale source、missing adapter、digest mismatch、rollback/retry。
- [ ] ACC-4: zero-caller/private-fixture-only shells 被刪除或正式標記 follow-up；刪除後 catalog、public interface、module-boundary 全綠。
- [ ] ACC-5: deletion receipt 證明刪除 deep module 會使預期 production callers 失敗，證明模組具有實際深度與 leverage。

## Dispatch and stop rules

shared close/evidence files只能走 broker/compose steward。不得保留兩套 completion path、不得用 compatibility fallback 產生 pass。任何 caller 尚未 migration 時停止刪除。報告需列 caller matrix、old-form query、interface tests、deletion test、production receipts、non-claims 與 rollback。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-09T07:22:41.859Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0331-wire-deep-evidence-modules-into-production-callers-and-remove-shallow-shells.task.md","contentDigest":"sha256:c93e6682cff9c0908ef1914150f179d659309b0f7aef13cc608e961b5ee7f435"} -->
