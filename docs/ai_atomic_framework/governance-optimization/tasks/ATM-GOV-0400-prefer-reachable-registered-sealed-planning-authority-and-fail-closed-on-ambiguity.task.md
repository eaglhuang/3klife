---
task_id: ATM-GOV-0400
title: Prefer reachable registered sealed planning authority and fail closed on ambiguity
status: ready
owner: gemini-captain
priority: P2
depends_on: []
causalGraph:
  startConditions:
    - Planning-root resolution can select a nonexistent or unregistered directory when a valid sealed registered planning authority exists.
  changedPublicSeams:
    - atm.planning-repo-root-canonical-resolution
  causalImpactEdges:
    - candidate-planning-root-validation -> canonical-planning-authority-preference
    - invalid-cached-candidate -> fail-closed-on-ambiguity
  parallelFrontierInputs:
    - Explicit --planning-root option always takes highest precedence.
    - Claude on 0369 and Cursor on 0341/0398 active scopes must remain completely untouched.
  validatorReferences:
    - node --strip-types tests/cli/planning-root-resolution-cache.test.ts
    - node --strip-types packages/cli/src/commands/next/__tests__/planning-root-preference.test.ts
    - npm run typecheck
  phaseOwner: Wave-1-framework-foundation
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/planning-repo-root.ts
  - packages/cli/src/commands/planning-root-resolution-cache.ts
  - packages/cli/src/commands/next/planning-root-preference.ts
  - tests/cli/planning-root-resolution-cache.test.ts
  - packages/cli/src/commands/next/__tests__/planning-root-preference.test.ts
deliverables:
  - packages/cli/src/commands/planning-repo-root.ts
  - packages/cli/src/commands/planning-root-resolution-cache.ts
  - packages/cli/src/commands/next/planning-root-preference.ts
  - tests/cli/planning-root-resolution-cache.test.ts
  - packages/cli/src/commands/next/__tests__/planning-root-preference.test.ts
validators:
  - node --strip-types tests/cli/planning-root-resolution-cache.test.ts
  - node --strip-types packages/cli/src/commands/next/__tests__/planning-root-preference.test.ts
  - npm run typecheck
testContributions:
  - caseId: test_prefer_registered_sealed_planning_authority_0400
    targetGroupId: null
    semanticKey: prefer-registered-sealed-planning-authority
    coversAcceptance: [ACC-1, ACC-2, ACC-3]
    coversImpactEdges: [candidate-planning-root-validation -> canonical-planning-authority-preference]
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: atm.planning-repo-root-canonical-resolution
    resourceKey: null
    expectedRedPredicate: resolution selects nonexistent or unregistered planning root over valid sealed registered authority
  - caseId: test_fail_closed_on_ambiguous_planning_roots_0400
    targetGroupId: null
    semanticKey: fail-closed-on-ambiguous-planning-roots
    coversAcceptance: [ACC-4, ACC-5]
    coversImpactEdges: [invalid-cached-candidate -> fail-closed-on-ambiguity]
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: atm.planning-repo-root-canonical-resolution
    resourceKey: null
    expectedRedPredicate: ambiguous multiple valid planning roots silently selects first instead of failing closed
requiredTestCaseIds:
  - test_prefer_registered_sealed_planning_authority_0400
  - test_fail_closed_on_ambiguous_planning_roots_0400
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
errorCodes: []
outOfScope:
  - release
  - templates
nonGoals:
  - Hard-coding user path, repo name, series name, or incident string
atomizationImpact:
  ownerAtomOrMap: atm.planning-repo-root
  mapUpdates: []
  extractionCandidates:
    - atom: atm.planning-root-canonical-preference
      pattern: Policy Object
      source: packages/cli/src/commands/planning-repo-root.ts
      disposition: extract
      inlineReason: null
createdByCommand: atm plan card create
---

# ATM-GOV-0400 Prefer reachable registered sealed planning authority and fail closed on ambiguity

## Intent

Resolve planning root selection by prioritizing reachable sealed/registered planning authorities over empty or unregistered directories, and fail closed when multiple valid planning authorities exist.

## Acceptance

- [ ] ACC-1: Explicit `--planning-root` option continues to have absolute highest precedence.
- [ ] ACC-2: Nonexistent, non-directory, or unregistered candidate paths are never selected as write planning roots over valid registered authorities.
- [ ] ACC-3: When exactly one reachable registered sealed planning authority exists, it is selected deterministically.
- [ ] ACC-4: When multiple reachable registered planning authorities exist without a canonical ancestor, resolution fails closed with `ATM_PLANNING_ROOT_AMBIGUOUS` and recovery guidance.
- [ ] ACC-5: Resolution cache invalidates upon topology or series-registry changes.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-16T01:24:44.707Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0400-prefer-reachable-registered-sealed-planning-authority-and-fail-closed-on-ambiguity.task.md","contentDigest":"sha256:79b40ffc4afb942eb5fcebeb063270d5ebfd234fc0edae67f9daf0197952dd63"} -->
