---
task_id: ATM-GOV-0399
title: Prefer reachable registered sealed planning authority and fail closed on ambiguity
status: done
owner: unassigned
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
  - caseId: test_prefer_registered_sealed_planning_authority_0399
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
  - caseId: test_fail_closed_on_ambiguous_planning_roots_0399
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
  - test_prefer_registered_sealed_planning_authority_0399
  - test_fail_closed_on_ambiguous_planning_roots_0399
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
completed_at: "2026-08-26T23:23:14.694Z"
completed_by_agent: "codex-captain"
closedAt: "2026-08-26T23:23:14.694Z"
closedByActor: "codex-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-26T23-23-14-694Z-close-d5cb47e969c6"
lastTransitionAt: "2026-08-26T23:23:14.694Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "f43c3c9e9"
---

# ATM-GOV-0399 Prefer reachable registered sealed planning authority and fail closed on ambiguity

## Intent

Fix planning-root resolution so that:
1. An explicit `--planning-root` argument or environment variable maintains highest precedence.
2. Candidate roots that do not exist, are not directories, or lack a valid registered series registry (`series-registry.json`) are never selected as write planning roots over a valid, reachable, registered sealed planning authority.
3. When multiple equally valid planning authorities are reachable and ambiguous, the resolution must fail closed with actionable diagnostics and candidates list instead of picking an arbitrary one.
4. Process-lifetime cache keys incorporate candidate validity facts so stale or invalid cached decisions never mask a valid reachable authority.
5. All implementations use data-driven, generalized checks without hard-coded paths, repository names, or series names.

## Acceptance

- [ ] ACC-1: Explicit `--planning-root` option always takes absolute precedence.
- [ ] ACC-2: When resolving candidate planning roots, candidates lacking `series-registry.json` or directory existence cannot outrank a reachable registered authority.
- [ ] ACC-3: If exactly one reachable candidate has a valid `series-registry.json` containing active series, it is selected as the canonical authority root.
- [ ] ACC-4: If multiple candidates share equal validity/reachability, resolution fails closed reporting all ambiguous candidates with actionable recovery guidance.
- [ ] ACC-5: Resolution cache invalidation accounts for candidate validity and never retains an invalid decision across environment/filesystem changes.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-16T01:12:18.400Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0399-prefer-reachable-registered-sealed-planning-authority-and-fail-closed-on-ambiguity.task.md","contentDigest":"sha256:0d07dfb0006366ed2881bdf61576e0589d80c3468176ea767a90af0580b0866e"} -->
