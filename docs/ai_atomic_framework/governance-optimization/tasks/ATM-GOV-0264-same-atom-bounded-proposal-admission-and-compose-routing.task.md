---
task_id: ATM-GOV-0264
title: Canonical Broker Admission Facade and same-atom bounded proposal routing
status: done
owner: atm-broker
priority: P0
milestone: ATM-3.1-R0Q
depends_on:
  - ATM-GOV-0262
  - ATM-GOV-0263
  - TASK-LANE-0021
  - TASK-SKL-0027
causalGraph:
  causalDependencies:
    - ATM-GOV-0262
    - ATM-GOV-0263
    - TASK-LANE-0021
    - TASK-SKL-0027
  startConditions:
    - ATM-GOV-0263 is done and atom-cli-router is released
    - TASK-LANE-0021 has proven borrowed-actor execution is fail-closed and reusable ticket keys are redacted
    - TASK-SKL-0027 has emitted a sealed deep-module review receipt for this scope
  softRelations:
    - TASK-SKL-0022
  changedPublicSeams:
    - atm.brokerAdmissionFacade.v1
  causalImpactEdges:
    - bounded-intent-to-canonical-admission-decision
    - same-atom-disjoint-resource-to-proposal-routing
    - admission-decision-to-claim-ticket-and-recovery-manifest
  parallelFrontierInputs:
    - ATM-GOV-0263
    - TASK-SKL-0027
  validatorReferences:
    - test_task_atm_gov_0264_same_atom_proposal_admission_5dcd8b13
    - test_int_plan3_same_atom_bounded_compose_0d1f4a72
  phaseOwner: atm-broker
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src/broker/admission/**
  - packages/core/src/broker/conflict-matrix.ts
  - packages/core/src/broker/decision.ts
  - packages/core/src/broker/decision/proposal-overlap.ts
  - packages/core/src/broker/proposal.ts
  - packages/cli/src/commands/next/claim-parallel-preflight.ts
  - packages/cli/src/commands/next/claim-admission.ts
  - packages/cli/src/commands/next/claim-conflict-log.ts
  - tests/core/broker-overlap-callsite-parity.test.ts
  - tests/core/broker-admission-facade.test.ts
  - tests/core/same-atom-bounded-proposal-routing.test.ts
  - packages/cli/src/commands/next/__tests__/same-atom-proposal-admission.test.ts
deliverables:
  - packages/core/src/broker/admission/evaluate-broker-admission.ts
  - packages/core/src/broker/admission/contracts.ts
  - packages/core/src/broker/decision.ts
  - packages/core/src/broker/decision/proposal-overlap.ts
  - packages/cli/src/commands/next/claim-parallel-preflight.ts
  - packages/cli/src/commands/next/claim-admission.ts
  - tests/core/broker-admission-facade.test.ts
  - tests/core/same-atom-bounded-proposal-routing.test.ts
  - packages/cli/src/commands/next/__tests__/same-atom-proposal-admission.test.ts
validators:
  - node --strip-types tests/core/broker-admission-facade.test.ts
  - node --strip-types tests/core/same-atom-bounded-proposal-routing.test.ts
  - node --strip-types tests/core/broker-overlap-callsite-parity.test.ts
  - node --strip-types packages/cli/src/commands/next/__tests__/same-atom-proposal-admission.test.ts
  - npm run typecheck
  - npm run validate:cli
errorCodes: []
evidence:
  required: canonical-admission-facade-same-atom-replay
rollback:
  strategy: revert-commit-and-restore-queue-only-admission
  notes: "Preserve the 0263/TASK-SKL-0022 negative replay and return same-atom ambiguity to queue-only; never restore divergent caller-local verdicts."
atomizationImpact:
  ownerAtomOrMap: atm.broker.admission
  mapUpdates: []
  extractionCandidates:
    - atom: atm.broker.admission-facade
      pattern: Facade
      source: packages/core/src/broker/admission/evaluate-broker-admission.ts
      disposition: extract
createdByCommand: atm plan card create
skl_validator_transition:
  schema_id: atm.validatorSelection.transition.v1
  enforcement: required-for-plan3-final-verdict
  causalImpactEdges:
    - bounded-intent-to-canonical-admission-decision
    - same-atom-disjoint-resource-to-proposal-routing
    - admission-decision-to-claim-ticket-and-recovery-manifest
  requiredTestCaseIds:
    - test_task_atm_gov_0264_same_atom_proposal_admission_5dcd8b13
  phaseTestCaseIds:
    - test_int_plan3_same_atom_bounded_compose_0d1f4a72
  advisoryTestCaseIds: []
  testContributions:
    - caseId: test_task_atm_gov_0264_same_atom_proposal_admission_5dcd8b13
      targetGroupId: test_group_broker_admission
      semanticKey: same-atom-bounded-proposal-admission
      coversImpactEdges:
        - bounded-intent-to-canonical-admission-decision
        - admission-decision-to-claim-ticket-and-recovery-manifest
    - caseId: test_int_plan3_same_atom_bounded_compose_0d1f4a72
      targetGroupId: test_group_plan3_parallel_replay
      semanticKey: same-atom-disjoint-resource-compose
      coversImpactEdges:
        - same-atom-disjoint-resource-to-proposal-routing
completed_at: "2026-07-24T16:32:51.195Z"
completed_by_agent: "codex-plan31-captain"
closedAt: "2026-07-24T16:32:51.195Z"
closedByActor: "codex-plan31-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-24T16-32-51-065Z-close-9c984ec0e7b3"
lastTransitionAt: "2026-07-24T16:32:51.195Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "5be3b43ba08feef8dbad79331dfc08adc425a68b"
---

# ATM-GOV-0264 Canonical Broker Admission Facade and same-atom bounded proposal routing

## Intent

Replace the scattered final-admission decisions in the seven-layer conflict
matrix, Broker decision, proposal overlap, claim preflight, and claim admission
with one deep module. Callers submit normalized intent, registry and policy
inputs to a small provider-neutral interface and consume one sealed decision,
ticket, seven-layer trace, executable recovery manifest, and metrics payload.

The 2026-07-24 ATM-GOV-0263 versus TASK-SKL-0022 replay is the red case:
both tasks mapped to `atom-cli-router`, had `sharedPaths: []`, and were frozen
before bounded proposal comparison. Same atom identity is a risk signal, not
proof of a logical collision.

## Acceptance

- [ ] `TASK-LANE-0021` is done and proves captain approval cannot be used as
      direct worker-lane execution authority; borrowed actor close/write,
      governed commit, framework-mode, runner-sync, and push are fail-closed
      unless a proxy/takeover receipt exists.
- [ ] A sealed TASK-SKL-0027 deep-module review receipt identifies the façade
      seam, hidden implementation, interface test surface, rollback, and caller
      migration before production edits begin.
- [ ] `evaluateBrokerAdmission(request, registry, policy)` is the single module
      that owns the final disposition. Its result includes `direct`,
      `proposal-required`, `compose`, `queue`, `revalidate`, or
      `true-conflict`, plus canonical ticket, seven-layer trace, decision
      reason, executable command manifests, evidence refs, and metrics.
- [ ] The seven semantic layers remain intact behind the façade:
      intent shape, lease fencing, shared surface, atom id, atom CID, read set,
      and file/range. No caller may convert an intermediate atom/CID match into
      a final freeze independently.
- [ ] Core decision, proposal overlap, claim preflight, claim admission, and
      conflict logging consume the same sealed façade result. Tests fail if a
      caller re-derives Broker verdict, queue state, or required command.
- [ ] Same atom id/CID with disjoint physical resources or disjoint bounded
      anchors/ranges routes to bounded proposal comparison and may admit direct
      or compose execution. It is not blocked merely because the atom id
      matches.
- [ ] A real logical collision, stale base/CAS, unsupported adapter, missing or
      malformed bounded proposal, and invalid/stale ticket remain fail-closed
      with an executable queue/revalidate/recovery manifest.
- [ ] The exact ATM-GOV-0263 × TASK-SKL-0022 incident is replayed as a generic
      fixture with task/actor names removed from control flow. The new path
      must reach proposal evaluation rather than bare `broker-conflict-blocked`.
- [ ] Negative controls prove same-file overlapping logical ranges still block
      or queue, while same-atom disjoint files and same-file disjoint ranges do
      not regress into atom-wide locking.
- [ ] Metrics record per-layer reason, proposal requests, direct admits,
      compose admits, true conflicts, queue/revalidate decisions, false-block
      rate, manual intervention count, and decision latency from canonical
      events.
- [ ] No task id, actor id, date, local path, or `atom-cli-router` special case
      appears in production control flow. The repair is generalized under
      INV-ATM-009 and preserves broker-ticket/compose-first semantics under
      INV-ATM-008/010.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-24T14:19:33.965Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0264-same-atom-bounded-proposal-admission-and-compose-routing.task.md","contentDigest":"sha256:e7f30229b9f85cd3c277ef7b05855dc026f90ccdddc42af351b7b98470f02b40"} -->
