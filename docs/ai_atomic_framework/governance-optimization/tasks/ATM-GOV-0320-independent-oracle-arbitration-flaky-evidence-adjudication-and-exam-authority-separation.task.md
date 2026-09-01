---
task_id: ATM-GOV-0320
title: Independent oracle arbitration, flaky evidence adjudication and exam-authority separation
status: planned
owner: unassigned
priority: P1
depends_on: [ATM-GOV-0321, ATM-GOV-0306, ATM-GOV-0319]
causalGraph:
  causalDependencies: [ATM-GOV-0321, ATM-GOV-0306, ATM-GOV-0319]
  startConditions: ["0321 authority, 0306 lineage, and 0319 anti-gaming evidence are fresh and sealed"]
  softRelations:
    - governance-optimization/end-to-end-auto-batch-performance-plan-v4.md
  changedPublicSeams: [atm.oracleArbitration.v1, atm.evidenceAdjudication.v1]
  causalImpactEdges: ["oracle disagreement -> non-pass adjudication", "exam-authority overlap -> writer separation failure"]
  parallelFrontierInputs: [ATM-GOV-0321 authority contract, ATM-GOV-0306 lineage/equivalence, ATM-GOV-0319 anti-gaming controls]
  validatorReferences: [node --strip-types tests/cli/plan4-oracle-arbitration.test.ts, node --strip-types tests/cli/plan4-authority-separation.test.ts]
  phaseOwner: Plan4-oracle-adjudication
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v4.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths: [packages/core/src/evidence, packages/cli/src/commands, schemas/evidence, tests/cli/plan4-oracle-arbitration.test.ts, tests/cli/plan4-authority-separation.test.ts, tests/catalog/groups/test_group_plan4_oracle_adjudication.shard.json]
deliverables: [independent oracle arbitration adapter, flaky/contradictory evidence receipt, authority separation guard, focused tests, catalog shard]
validators: [node --strip-types tests/cli/plan4-oracle-arbitration.test.ts, node --strip-types tests/cli/plan4-authority-separation.test.ts, npm run typecheck, npm run validate:cli, npm run validate:git-head-evidence]
testContributions:
  - caseId: test_task_atm_gov_0320_oracle_arbitration_3f8b1e62
    targetGroupId: test_group_plan4_oracle_adjudication
    semanticKey: plan4_flaky_contradictory_oracle_adjudication
    coversAcceptance: [ACC-1, ACC-3]
    coversImpactEdges: ["oracle disagreement -> non-pass adjudication"]
    responsibility: task-required
  - caseId: test_task_atm_gov_0320_authority_separation_8c4d6a17
    targetGroupId: test_group_plan4_oracle_adjudication
    semanticKey: plan4_exam_authority_separation
    coversAcceptance: [ACC-2, ACC-4]
    coversImpactEdges: ["exam-authority overlap -> writer separation failure"]
    responsibility: task-required
requiredTestCaseIds: [test_task_atm_gov_0320_oracle_arbitration_3f8b1e62, test_task_atm_gov_0320_authority_separation_8c4d6a17]
evidence:
  required: command-backed
  realness: fresh-sealed-and-independent-oracle
rollback:
  strategy: retain-independent-oracle-and-revert-adjudication-publication
  notes: Preserve contradictory observations and reopen the prior authority on rollback.
atomizationImpact:
  ownerAtomOrMap: atm.evidence-validation
  mapUpdates: [atomic_workbench/atomization-coverage/path-to-atom-map.json]
errorCodes: [ATM_ORACLE_EVIDENCE_CONTRADICTION, ATM_EXAM_AUTHORITY_OVERLAP]
createdByCommand: atm plan card create
---

# ATM-GOV-0320 Independent oracle arbitration, flaky evidence adjudication and exam-authority separation

## Intent

Separate the exam writer from independent oracle arbitration and adjudicate
flaky or contradictory evidence without turning uncertainty into pass.

## Acceptance

- [ ] Contradictory or flaky oracle output remains non-pass until independently adjudicated.
- [ ] The writer cannot author, alter, or approve its own oracle authority.
- [ ] Unsupported or unavailable oracle data fails closed with a recovery command.
- [ ] Evidence includes rollback, provenance, and deep-module review receipt.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-31T15:38:50.327Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0320-independent-oracle-arbitration-flaky-evidence-adjudication-and-exam-authority-separation.task.md","contentDigest":"sha256:e03f30392d55f505bd27e02314d40b99cd14ad8c2e698dd775ac77097c9a1b68"} -->
