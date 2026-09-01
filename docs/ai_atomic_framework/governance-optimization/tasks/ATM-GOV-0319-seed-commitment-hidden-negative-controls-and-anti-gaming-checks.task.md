---
task_id: ATM-GOV-0319
title: Seed commitment, hidden negative controls and anti-gaming checks
status: planned
owner: unassigned
priority: P1
depends_on: [ATM-GOV-0321, ATM-GOV-0322]
causalGraph:
  causalDependencies: [ATM-GOV-0321, ATM-GOV-0322]
  startConditions: ["0321 authority and 0322 planning contracts are done with fresh evidence"]
  softRelations:
    - governance-optimization/end-to-end-auto-batch-performance-plan-v4.md
  changedPublicSeams: [atm.antiGamingControl.v1, atm.hiddenNegativeControl.v1]
  causalImpactEdges: ["seed commitment -> replayable adversarial cases", "hidden negative control -> fail-closed anti-gaming verdict"]
  parallelFrontierInputs: [ATM-GOV-0321 authority contract, ATM-GOV-0322 planning contract]
  validatorReferences: [node --strip-types tests/cli/plan4-anti-gaming.test.ts, node --strip-types tests/cli/plan4-hidden-negative-controls.test.ts]
  phaseOwner: Plan4-anti-gaming
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v4.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths: [packages/core/src/evidence, schemas/evidence, tests/cli/plan4-anti-gaming.test.ts, tests/cli/plan4-hidden-negative-controls.test.ts, tests/catalog/groups/test_group_plan4_anti_gaming.shard.json]
deliverables: [seed commitment and replay receipt, hidden negative-control registry, anti-gaming verdict adapter, focused tests, catalog shard]
validators: [node --strip-types tests/cli/plan4-anti-gaming.test.ts, node --strip-types tests/cli/plan4-hidden-negative-controls.test.ts, npm run typecheck, npm run validate:cli, npm run validate:git-head-evidence]
testContributions:
  - caseId: test_task_atm_gov_0319_seed_commitment_0a7e4c92
    targetGroupId: test_group_plan4_anti_gaming
    semanticKey: plan4_seed_commitment_replay
    coversAcceptance: [ACC-1]
    coversImpactEdges: ["seed commitment -> replayable adversarial cases"]
    responsibility: task-required
  - caseId: test_task_atm_gov_0319_hidden_negative_control_6d2f1b84
    targetGroupId: test_group_plan4_anti_gaming
    semanticKey: plan4_hidden_negative_control_fail_closed
    coversAcceptance: [ACC-2, ACC-3, ACC-4]
    coversImpactEdges: ["hidden negative control -> fail-closed anti-gaming verdict"]
    responsibility: task-required
requiredTestCaseIds: [test_task_atm_gov_0319_seed_commitment_0a7e4c92, test_task_atm_gov_0319_hidden_negative_control_6d2f1b84]
evidence:
  required: command-backed
  realness: fresh-sealed-and-adversarial
rollback:
  strategy: disable-anti-gaming-publication-and-preserve-negative-controls
  notes: Keep hidden controls sealed and revert only the policy publication.
atomizationImpact:
  ownerAtomOrMap: atm.evidence-validation
  mapUpdates: [atomic_workbench/atomization-coverage/path-to-atom-map.json]
errorCodes: [ATM_ANTI_GAMING_CONTROL_MISSING, ATM_NEGATIVE_CONTROL_NOT_RED]
createdByCommand: atm plan card create
---

# ATM-GOV-0319 Seed commitment, hidden negative controls and anti-gaming checks

## Intent

Commit adversarial seeds and hidden negative controls outside the writer's
authority so a quality run cannot lower its own exam or convert a red control
into a pass.

## Acceptance

- [ ] Seed commitments are replayable and independent from task/actor/date identity.
- [ ] Hidden negative controls are not writable by the implementation lane and must be red when active.
- [ ] Missing, unsupported, or inconclusive controls fail closed.
- [ ] Evidence includes rollback, provenance, and deep-module review receipt.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-31T15:38:39.686Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0319-seed-commitment-hidden-negative-controls-and-anti-gaming-checks.task.md","contentDigest":"sha256:488e352391b3b25aae21e53154b3263bcc9958b04977705c228a5dd1d8345cb2"} -->
