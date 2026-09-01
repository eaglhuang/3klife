---
task_id: ATM-GOV-0321
title: Sealed quality authority, policy epoch, protected exam surfaces and role capabilities
status: planned
owner: unassigned
priority: P1
depends_on: [ATM-GOV-0277]
causalGraph:
  causalDependencies: [ATM-GOV-0277]
  startConditions: ["0277 quality semantics and certificate vocabulary are done with fresh evidence"]
  softRelations:
    - governance-optimization/end-to-end-auto-batch-performance-plan-v4.md
  changedPublicSeams: [atm.qualityAuthority.v1, atm.policyEpoch.v1, atm.examSurfaceCapability.v1]
  causalImpactEdges: ["writer capability overlap -> authority violation", "policy epoch drift -> certificate invalidation"]
  parallelFrontierInputs: [ATM-GOV-0277 quality semantics]
  validatorReferences: [node --strip-types tests/cli/plan4-quality-authority.test.ts, node --strip-types tests/cli/plan4-role-capabilities.test.ts]
  phaseOwner: Plan4-authority-foundation
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v4.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths: [packages/core/src/evidence, schemas/evidence, tests/cli/plan4-quality-authority.test.ts, tests/cli/plan4-role-capabilities.test.ts, tests/catalog/groups/test_group_plan4_authority_foundation.shard.json]
deliverables: [sealed quality authority adapter, policy epoch receipt, protected exam-surface capability matrix, focused tests, catalog shard]
validators: [node --strip-types tests/cli/plan4-quality-authority.test.ts, node --strip-types tests/cli/plan4-role-capabilities.test.ts, npm run typecheck, npm run validate:cli, npm run validate:git-head-evidence]
errorCodes: [ATM_QUALITY_AUTHORITY_OVERLAP, ATM_POLICY_EPOCH_MISMATCH]
testContributions:
  - caseId: test_task_atm_gov_0321_authority_5c8e1d42
    targetGroupId: test_group_plan4_authority_foundation
    semanticKey: plan4_sealed_quality_authority
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: ["writer capability overlap -> authority violation"]
    responsibility: task-required
  - caseId: test_task_atm_gov_0321_epoch_capability_8a3f6b19
    targetGroupId: test_group_plan4_authority_foundation
    semanticKey: plan4_policy_epoch_and_role_capabilities
    coversAcceptance: [ACC-3, ACC-4]
    coversImpactEdges: ["policy epoch drift -> certificate invalidation"]
    responsibility: task-required
requiredTestCaseIds: [test_task_atm_gov_0321_authority_5c8e1d42, test_task_atm_gov_0321_epoch_capability_8a3f6b19]
evidence:
  required: command-backed
  realness: fresh-sealed-and-independent-authority
rollback:
  strategy: preserve-prior-authority-and-disable-new-policy-epoch
  notes: Reopen legacy authority if capability or epoch evidence is incomplete.
atomizationImpact:
  ownerAtomOrMap: atm.evidence-validation
  mapUpdates: [atomic_workbench/atomization-coverage/path-to-atom-map.json]
createdByCommand: atm plan card create
---

# ATM-GOV-0321 Sealed quality authority, policy epoch, protected exam surfaces and role capabilities

## Intent

Make quality authority, policy epoch, protected exam surfaces, and role
capabilities sealed and independent from the writer lane.

## Acceptance

- [ ] Writer cannot alter policy, oracle, denominator, or verdict authority.
- [ ] Epoch drift invalidates certificates and preserves prior authority.
- [ ] Capability overlap and missing protected surfaces fail closed.
- [ ] Evidence includes rollback, provenance, and deep-module review.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-31T15:48:54.829Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0321-sealed-quality-authority-policy-epoch-protected-exam-surfaces-and-role-capabilities.task.md","contentDigest":"sha256:c1fdb70288a2e8fdc60cd1e5db93f1e9ea1788b1fad3492f8c6099b285efa9e6"} -->
