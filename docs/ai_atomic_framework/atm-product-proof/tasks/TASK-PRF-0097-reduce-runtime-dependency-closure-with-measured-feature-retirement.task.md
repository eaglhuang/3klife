---
task_id: TASK-PRF-0097
title: Reduce runtime dependency closure with measured feature retirement
status: planned
owner: codex-product-proof
priority: P1
depends_on: ["TASK-PRF-0095"]
related_plan: atm-product-proof/atm-convergence-plan.md
planning_repo: C:/Users/User/3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/atm-public.ts
  - packages/cli/src/index.ts
  - scripts/build-cli-npm-runtime.ts
  - packages/cli/package.json
  - package-lock.json
  - tests/cli/npm-clean-install.test.ts
  - tests/cli/adopter-artifact-budget.test.ts
  - docs/reports/atm-runtime-convergence.md
deliverables:
  - packages/cli/src/atm-public.ts
  - packages/cli/src/index.ts
  - scripts/build-cli-npm-runtime.ts
  - packages/cli/package.json
  - package-lock.json
  - tests/cli/npm-clean-install.test.ts
  - tests/cli/adopter-artifact-budget.test.ts
  - docs/reports/atm-runtime-convergence.md
validators:
  - "node --strip-types tests/cli/npm-clean-install.test.ts"
  - "node --strip-types tests/cli/adopter-artifact-budget.test.ts"
  - "npm run typecheck"
methodProfiles: [deep-module-refactor]
tddMode: recommended
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert only this task's reviewed changes; preserve foreign WIP and external evidence.
atomizationImpact:
  ownerAtomOrMap: atm.cli-command-router-map
  mapUpdates: []
  extractionCandidates:
    - disposition: inline
      inlineReason: Owner explicitly prioritizes bounded quickfixes and deletion over additional abstraction; scope must shrink to observed behavior before editing.
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-PRF-0097 Reduce runtime dependency closure with measured feature retirement

## Intent

Use existing PRF-0068 footprint evidence and PRF-0069 review as inputs. Trace reachable runtime code and assets, remove unused or duplicate shipped features, and avoid a new npm package unless measured alternatives cannot meet the requirement.

Series: PRF, existing product-proof family. Authority: Owner convergence directive of 2026-09-14. No new governance feature is a deliverable.

## Acceptance

- [ ] ACC-1: Pin baseline commit, exact tarball hash, package version, lock and environment; count tarball bytes, all unpacked files including manifests and installed dependency bytes.
- [ ] ACC-2: Candidate actual unpacked bytes fall at least 20% from this frozen baseline; compressed bytes, file count and complete dependency bytes do not increase. Existing stricter caps remain in force.
- [ ] ACC-3: Core clean-install workflow passes on Windows and Linux with repo/cache isolation and no implicit download; missing runtime module/schema negative controls fail. No variable-import omission or splitting-only savings.
- [ ] ACC-4: Measure startup median/p95 with >=30 paired samples per environment, report cold/warm definition and no >10% p95 regression. Stop after two failed strategies and retain failed evidence.

## Execution and verification

Read the related plan and relevant predecessor evidence. Establish actual source/artifact baseline before edits; docs/ledger status alone does not prove delivery. Use the listed focused validators; add assertions to them when their existing coverage does not exercise an acceptance condition. New named test files must be implemented before they count as validators. Record test assertion counts, exact commands/exits, baseline/candidate versions and external evidence locations. Negative controls must fail for the intended behavioral reason.

Only this task's concrete files may change. Directory scopes are review envelopes, not authorization for bulk rewrites. Reduce scope to inspected files before code edits. Use existing ATM task or Owner-authorized quickfix maintenance route if tooling blocks; keep a reason, bounded diff, validation and rollback. No hand-written runtime ledger or fake completion.

## Stop and rollback

Stop the current hypothesis when correctness regresses, evidence is unavailable, two measured alternatives miss the threshold, or required external authority is missing. Report the failed metric without weakening acceptance. Revert only the owned patch or reviewed commit; do not reset a shared worktree. No publish, force-push or Git history rewrite is implied by card completion.

## Non-goals

New packages/commands/state machines for administrative completeness; republishing old measurements as candidate proof; reopening or rewriting predecessor provenance.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-14T15:08:52.966Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0097-reduce-runtime-dependency-closure-with-measured-feature-retirement.task.md","contentDigest":"sha256:d95d37d1c2e201279fccb9690797b86c8e750c3c48716ceca58cd658891ec60c"} -->
