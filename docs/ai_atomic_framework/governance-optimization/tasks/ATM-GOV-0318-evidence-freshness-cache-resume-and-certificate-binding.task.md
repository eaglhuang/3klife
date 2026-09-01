---
task_id: ATM-GOV-0318
title: Evidence freshness, cache, resume and certificate binding
status: planned
owner: unassigned
priority: P1
depends_on: [ATM-GOV-0284, ATM-GOV-0270]
causalGraph:
  causalDependencies: [ATM-GOV-0284, ATM-GOV-0270]
  startConditions: ["0284 facade and 0270 freshness contract are done with fresh evidence"]
  softRelations:
    - governance-optimization/end-to-end-auto-batch-performance-plan-v4.md
  changedPublicSeams: [atm.evidenceFreshnessCertificate.v1, atm.resumeBinding.v1]
  causalImpactEdges: ["stale/cache/resume mismatch -> certificate invalidation", "partial evidence -> resumable non-claim"]
  parallelFrontierInputs: [ATM-GOV-0284 closure assurance events, ATM-GOV-0270 freshness evidence]
  validatorReferences: [node --strip-types tests/cli/plan4-evidence-freshness.test.ts, node --strip-types tests/cli/plan4-certificate-binding.test.ts]
  phaseOwner: Plan4-evidence-freshness
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v4.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths: [packages/core/src/evidence, schemas/evidence, tests/cli/plan4-evidence-freshness.test.ts, tests/cli/plan4-certificate-binding.test.ts, tests/catalog/groups/test_group_plan4_evidence_freshness.shard.json]
deliverables: [freshness/cache/resume certificate adapter, invalidation receipt, focused tests, catalog shard]
validators: [node --strip-types tests/cli/plan4-evidence-freshness.test.ts, node --strip-types tests/cli/plan4-certificate-binding.test.ts, npm run typecheck, npm run validate:cli, npm run validate:git-head-evidence]
testContributions:
  - caseId: test_task_atm_gov_0318_freshness_4e81c2a7
    targetGroupId: test_group_plan4_evidence_freshness
    semanticKey: plan4_evidence_freshness_cache_resume
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: ["stale/cache/resume mismatch -> certificate invalidation", "partial evidence -> resumable non-claim"]
    responsibility: task-required
  - caseId: test_task_atm_gov_0318_certificate_binding_9b2d7f40
    targetGroupId: test_group_plan4_evidence_freshness
    semanticKey: plan4_certificate_binding_stale_replay
    coversAcceptance: [ACC-3, ACC-4]
    coversImpactEdges: ["stale/cache/resume mismatch -> certificate invalidation", "partial evidence -> resumable non-claim"]
    responsibility: task-required
requiredTestCaseIds: [test_task_atm_gov_0318_freshness_4e81c2a7, test_task_atm_gov_0318_certificate_binding_9b2d7f40]
evidence:
  required: command-backed
  realness: fresh-sealed-and-resumable
rollback:
  strategy: disable-freshness-certificate-and-preserve-prior-authority
  notes: Retain sealed observations while reverting only the freshness binding publication.
atomizationImpact:
  ownerAtomOrMap: atm.evidence-validation
  mapUpdates: [atomic_workbench/atomization-coverage/path-to-atom-map.json]
errorCodes: [ATM_EVIDENCE_FRESHNESS_MISMATCH, ATM_EVIDENCE_RESUME_BINDING_MISMATCH]
createdByCommand: atm plan card create
---

# ATM-GOV-0318 Evidence freshness, cache, resume and certificate binding

## Intent

Bind freshness watermark, cache digest, resume cursor, and certificate input
identity so stale or replayed evidence cannot satisfy a newer obligation.

## Acceptance

- [ ] A stale watermark, cache digest, or resume cursor invalidates the certificate fail-closed.
- [ ] A valid resume reuses only sealed observations and preserves duplicate/idempotent semantics.
- [ ] Focused tests cover fresh, stale, cache collision, partial resume, and unknown input cases.
- [ ] Evidence includes rollback, runner provenance, and deep-module review receipt.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-31T15:38:26.866Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0318-evidence-freshness-cache-resume-and-certificate-binding.task.md","contentDigest":"sha256:f92466717428278823c32c3f5783b306cc209a89f2c2061bac90501c57943233"} -->
