---
task_id: TASK-SKL-0036
title: Incident-learning intake and backlog skill contract
status: planned
owner: atm-agent-skills
priority: P0
milestone: ATM-SKL-PLAN4-R0
depends_on:
  - TASK-SKL-0031
  - TASK-SKL-0033
causalGraph:
  causalDependencies:
    - TASK-SKL-0031
    - TASK-SKL-0033
  startConditions:
    - TASK-SKL-0031 is done and canonical skill templates are distributable.
    - TASK-SKL-0033 is done and command-backed diagnostic receipts are available.
  softRelations:
    - governance-optimization/end-to-end-auto-batch-performance-plan-v4.md
    - ATM-GOV-0293 fault fingerprint and semantic family policy
  changedPublicSeams:
    - atm.incidentLearningCandidate.v1
    - ATM bug backlog skill intake
    - First-layer incident intent routing
  causalImpactEdges:
    - reported defect -> evidence-bounded incident learning candidate
    - candidate breadth/depth hypotheses -> task and evidence obligations
    - missing or conflicting data -> explicit unknown/unavailable disposition
  parallelFrontierInputs:
    - Plan 4.0 section 14.6 through 14.8
    - Existing atm.governanceBacklogItem.v1 projection contract
  validatorReferences:
    - node --strip-types tests/cli/incident-learning-backlog-skill.test.ts
    - npm run validate:schemas
    - npm run validate:skill-templates
    - npm run validate:governance-projections
  phaseOwner: atm-captain-skill-lane
related_plan: skl-tool-first-upgrade/SKL-tool-first-upgrade-plan.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - schemas/skills/incident-learning-candidate.schema.json
  - packages/core/src/skills/incident-learning-candidate.ts
  - packages/core/src/skills/index.ts
  - templates/skills/atm-bug-backlog.skill.md
  - scripts/validate-governance-projections.ts
  - scripts/validate-skill-templates.ts
  - tests/catalog/groups/test_group_incident_learning_skill.shard.json
  - tests/cli/incident-learning-backlog-skill.test.ts
deliverables:
  - schemas/skills/incident-learning-candidate.schema.json
  - packages/core/src/skills/incident-learning-candidate.ts
  - templates/skills/atm-bug-backlog.skill.md
  - tests/catalog/groups/test_group_incident_learning_skill.shard.json
  - tests/cli/incident-learning-backlog-skill.test.ts
validators:
  - node --strip-types tests/cli/incident-learning-backlog-skill.test.ts
  - npm run validate:schemas
  - npm run validate:skill-templates
  - npm run validate:governance-projections
  - npm run typecheck
testContributions:
  - caseId: test_task_skl_0036_incident_candidate_7c3e0d41
    targetGroupId: test_group_incident_learning_skill
    semanticKey: incident_learning_candidate_intake
    coversAcceptance:
      - ACC-1
      - ACC-2
      - ACC-3
      - ACC-5
      - ACC-6
    coversImpactEdges:
      - reported defect -> evidence-bounded incident learning candidate
      - candidate breadth/depth hypotheses -> task and evidence obligations
    expectedRedPredicate: Legacy backlog intake cannot preserve typed breadth and depth learning hypotheses.
    responsibility: task-required
    contractEdge: incident-learning-intake
  - caseId: test_task_skl_0036_unknown_safe_2fb64c98
    targetGroupId: test_group_incident_learning_skill
    semanticKey: incident_learning_unknown_safe
    coversAcceptance:
      - ACC-4
    coversImpactEdges:
      - missing or conflicting data -> explicit unknown/unavailable disposition
    expectedRedPredicate: Missing evidence is guessed, promoted, or treated as confirmed.
    responsibility: task-required
    contractEdge: incident-learning-unknown-safety
requiredTestCaseIds:
  - test_task_skl_0036_incident_candidate_7c3e0d41
  - test_task_skl_0036_unknown_safe_2fb64c98
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
evidence:
  required: command-backed-candidate-schema-template-and-projection-proof
rollback:
  strategy: revert-commit-and-retain-record-only-backlog-routing
atomizationImpact:
  ownerAtomOrMap: atm.skill-growth
  mapUpdates: []
  extractionCandidates:
    - atom: atm.incident-learning-intake
      pattern: Policy Object
      source: packages/core/src/skills/incident-learning-candidate.ts
      disposition: extract
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-SKL-0036 Incident-learning intake and backlog skill contract

## Intent

Turn `atm-bug-backlog` from a finding-only recorder into an evidence-bounded
incident-learning intake without making the skill a root-cause, family, test,
or closure authority. Add the canonical source template that is currently
missing, preserve breadth/depth hypotheses and explicit unknowns, and keep the
existing backlog as the single record authority.

## Acceptance

- [ ] ACC-1: `atm.incidentLearningCandidate.v1` preserves symptom,
      invariant/acceptance refs, reproduction and receipt refs, public seam,
      state/transition, observed factors, source availability and disposition.
- [ ] ACC-2: breadth hypotheses cover upstream/downstream,
      same-policy callers, sibling adapters, adjacent transitions and shared
      invariants; depth hypotheses cover boundary, negative, rollback, retry,
      concurrency, mutation, property/metamorphic and independent-oracle gaps.
- [ ] ACC-3: the canonical source is
      `templates/skills/atm-bug-backlog.skill.md`; installed copies are derived,
      and refresh/reinstall cannot erase the incident-learning contract.
- [ ] ACC-4: missing or conflicting evidence remains
      `unknown/unavailable`; root-cause and family hints are candidate-only and
      cannot authorize merge, fix success, test exclusion or close.
- [ ] ACC-5: Existing `atm.governanceBacklogItem.v1` records remain readable and the
      Markdown projection remains generated rather than directly authored.
- [ ] ACC-6: No second backlog, task lifecycle, test catalog or evidence authority is
      introduced.

## Execution ownership

This card is retained by `atm-captain-skill-lane`. Other captains may perform
read-only review but receive no write authority for its skill templates,
schemas, projections or tests.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-30T14:04:57.860Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"skl-tool-first-upgrade/tasks/TASK-SKL-0036-incident-learning-intake-and-backlog-skill-contract.task.md","contentDigest":"sha256:c1182c7e66ab91a77d96c565aef8b3028dba5a91d7a69dc979a19fdd64ff7e1d"} -->
