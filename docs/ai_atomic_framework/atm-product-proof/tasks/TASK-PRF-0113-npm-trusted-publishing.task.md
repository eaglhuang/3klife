---
task_id: TASK-PRF-0113
title: Move the npm release workflow to Trusted Publishing without token fallback
status: done
owner: unassigned
priority: P1
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions: ["Parked patch E-npm-trusted-publishing.patch applies cleanly to HEAD"]
  softRelations: [TASK-PRF-0054, TASK-PRF-0107]
  changedPublicSeams: [npm-release-authentication]
  causalImpactEdges: [publish-safety]
  parallelFrontierInputs: ["atm-benchmark-sink/ATM-PRODUCT-PROOF-20260917/parked-wip-20260917T2210/E-npm-trusted-publishing.patch"]
  validatorReferences: ["tests/release/release-trust.test.ts", "tests/cli/release-version-compatibility.test.ts"]
  phaseOwner: product-proof
related_plan: atm-product-proof/atm-convergence-plan.md
planning_repo: docs
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: adopter
scopePaths:
  - .github/workflows/release-npm.yml
  - scripts/validate-release-trust.ts
  - tests/release/release-trust.test.ts
  - tests/cli/release-version-compatibility.test.ts
deliverables:
  - .github/workflows/release-npm.yml
  - scripts/validate-release-trust.ts
validators:
  - "node --strip-types tests/release/release-trust.test.ts"
  - "node --strip-types tests/cli/release-version-compatibility.test.ts"
  - "npm run typecheck -- --pretty false"
  - "git diff --check"
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-17T15:46:11.701Z"
completed_by_agent: "claude-code-opus-5"
closedAt: "2026-09-17T15:46:11.701Z"
closedByActor: "claude-code-opus-5"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-17T15-46-11-701Z-close-6e47ad2aa94f"
lastTransitionAt: "2026-09-17T15:46:11.701Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "13b8882c8"
---

# TASK-PRF-0113 Move the npm release workflow to Trusted Publishing without token fallback

Series choice: PRF, the existing release-reliability line (PRF-0012 to PRF-0027).
TASK-PRF-0054 explicitly excludes npm token/2FA policy, so this change cannot be
folded into 0054.

## Intent

The package is configured for npm Trusted Publishing, but the release workflow still
creates a token-based `.npmrc` through `setup-node registry-url` and injects
`NODE_AUTH_TOKEN`, which silently selects the legacy token path. Land the already
written static workflow change and its release-trust assertions so the release path
cannot fall back to a long-lived token. Candidate-tarball install proof stays with
TASK-PRF-0107 (ACC-3) and post-publish proof with TASK-PRF-0054; this card has no
dependency on either and must not wait for them.

## Acceptance

- [ ] `release-npm.yml` grants `id-token: write`, has no token-based `registry-url`
  `.npmrc`, and has no `NODE_AUTH_TOKEN` on any publish step.
- [ ] `scripts/validate-release-trust.ts` fails when any of those three conditions
  regresses; the release-trust test proves each failure case.
- [ ] A `workflow_dispatch` run with `dry_run: true` skips the post-publish gate
  instead of reporting a registry proof.
- [ ] Validators pass in the canonical worktree; the change lands as one commit.
- [ ] No publish, no token creation, no 2FA or package-access change, no new
  governance command or evidence family.
- [ ] Stop rule: if the parked patch no longer applies or a validator fails twice
  after a fix, keep the patch parked and record the failure instead of iterating.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-16T23:00:44.709Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0113-npm-trusted-publishing.task.md","contentDigest":"sha256:24a14051725253aec88c2301911c28be23ef35a7d8007e6c30f5efbd93cc5309"} -->
