---
task_id: TASK-PRF-0027
title: Repair release full-validation regressions before npm publish
status: planned
owner: owner-authorized-ci-steward
priority: P2
depends_on: [TASK-PRF-0025]
causalGraph:
  causalDependencies: []
  startConditions: []
  softRelations: []
  changedPublicSeams: []
  causalImpactEdges: []
  parallelFrontierInputs: []
  validatorReferences: []
  phaseOwner: null
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/validate-upgrade-proposal.ts
  - scripts/validate-governance-commands.ts
  - scripts/validate-git-hooks-enforcement.ts
  - scripts/validate-git-hooks-enforcement/pre-push-regressions.ts
  - scripts/validate-git-hooks-enforcement/closure-cross-checks.ts
  - scripts/validate-git-hooks-enforcement/initial-lanes.ts
  - tests
  - .github/workflows/release-npm.yml
deliverables:
  - release full-validation fixtures and assertions use the runtime evidence ledger contract
  - release dry-run runs all full validators without legacy git-head.jsonl references
  - regression evidence proving npm release gates remain fail-closed and reproducible
validators:
  - node --strip-types scripts/validate-upgrade-proposal.ts --mode validate
  - node --strip-types scripts/validate-governance-commands.ts --mode validate
  - node --strip-types scripts/validate-git-hooks-enforcement.ts --mode validate
  - npm run validate:release-prepublish -- --parallel
  - npm run validate:full -- --parallel
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-PRF-0027 Repair release full-validation regressions before npm publish

## Intent

The beta.5 release dry-run reached post-publish validation but failed three
full-profile validators because their isolated fixtures still expected the
retired `.atm/history/evidence/git-head.jsonl` ledger. Update only those
fixtures/contracts to the current runtime evidence ledger, preserving the
negative controls and fail-closed semantics. Then rerun the release dry-run
and record the exact run as evidence before any immutable npm publish.

## Acceptance

- [ ] `validate-upgrade-proposal`, `validate-governance-commands`, and
      `validate-git-hooks-enforcement` pass on clean isolated fixtures.
- [ ] No production validator is weakened, disabled, or changed from blocking
      to advisory to obtain a pass.
- [ ] Release dry-run passes the full validation gate and its artifact checks.
- [ ] Runtime evidence remains outside Git history; fixtures do not recreate or
      require the retired `git-head.jsonl` path.
- [ ] Rollback is a governed revert of only the scoped fixture/contract edits,
      followed by the same three validators.

## Evidence and rollback

Record validator output, the release workflow run URL/SHA, and the exact
tarball/version inputs. If any fixture change broadens a governance rule,
revert the scoped edits and rerun the prior negative controls before resuming
publication.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-11T18:35:53.950Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0027-repair-release-full-validation-regressions.task.md","contentDigest":"sha256:4ee69bb2d07661548d6dc877187bf0b8fa808bcc97d440ad3591c9b26ca9073a"} -->
