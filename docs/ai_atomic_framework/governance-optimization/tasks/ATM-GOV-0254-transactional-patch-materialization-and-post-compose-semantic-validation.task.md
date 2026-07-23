---
task_id: ATM-GOV-0254
title: Transactional patch materialization and post-compose semantic validation
status: done
owner: atm-broker
priority: P0
milestone: ATM-3.1-R2
severity: P0
depends_on:
  - ATM-GOV-0241
  - ATM-GOV-0249
  - TASK-ERR-0006
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "GOV owns the Plan 3.1 compose-first proof; this card adds the generic semantic gate between serializable composition and steward side effects without creating a language-specific merge engine."
scopePaths:
  - packages/core/src/broker/patch-candidate-materializer.ts
  - packages/core/src/broker/post-compose-semantic-validation-policy.ts
  - packages/core/src/broker/semantic-contract.ts
  - packages/core/src/broker/semantic-adjudication/policy.ts
  - packages/core/src/broker/compose.ts
  - packages/core/src/broker/types.ts
  - packages/core/src/broker/index.ts
  - packages/cli/src/commands/broker/post-compose-semantic-validation.ts
  - schemas/governance/post-compose-semantic-validation.schema.json
  - tests/core/patch-candidate-materializer.test.ts
  - tests/core/post-compose-semantic-validation-policy.test.ts
  - tests/cli/post-compose-semantic-validation.test.ts
deliverables:
  - packages/core/src/broker/patch-candidate-materializer.ts
  - packages/core/src/broker/post-compose-semantic-validation-policy.ts
  - packages/cli/src/commands/broker/post-compose-semantic-validation.ts
  - schemas/governance/post-compose-semantic-validation.schema.json
  - tests/core/patch-candidate-materializer.test.ts
  - tests/core/post-compose-semantic-validation-policy.test.ts
  - tests/cli/post-compose-semantic-validation.test.ts
validators:
  - node --strip-types tests/core/patch-candidate-materializer.test.ts
  - node --strip-types tests/core/post-compose-semantic-validation-policy.test.ts
  - node --strip-types tests/cli/post-compose-semantic-validation.test.ts
  - npm run validate:schemas
  - npm run typecheck
errorCodes:
  - ATM_BROKER_COMPOSE_SEMANTIC_VALIDATION_FAILED
  - ATM_BROKER_COMPOSE_SEMANTIC_VALIDATION_UNAVAILABLE
createdByCommand: atm plan card create
evidence:
  required: post-compose-semantic-validation-red-green-receipts
rollback:
  strategy: revert-commit-and-trip-shared-compose-to-queue-only
  notes: "Retain immutable proposals and candidate evidence; no failed or unverified candidate may reach the canonical writer."
atomizationImpact:
  ownerAtomOrMap: atm.broker.post-compose-semantic-validation
  mapUpdates: []
  extractionCandidates:
    - atom: atm.broker.patch-candidate-materializer
      pattern: Pure Materializer
      source: packages/core/src/broker/patch-candidate-materializer.ts
      disposition: extract
    - atom: atm.broker.post-compose-semantic-validation
      pattern: Pure Policy
      source: packages/core/src/broker/post-compose-semantic-validation-policy.ts
      disposition: extract
completed_at: "2026-07-23T14:22:37.930Z"
completed_by_agent: "cursor-002-plan31-captain"
closedAt: "2026-07-23T14:22:37.930Z"
closedByActor: "cursor-002-plan31-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-23T14-22-37-930Z-close-1f583638cfbd"
lastTransitionAt: "2026-07-23T14:22:37.930Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "35a08fc6b243f6a4a6410211825afddedf9e53c5"
---

# ATM-GOV-0254 Transactional patch materialization and post-compose semantic validation

## Intent

Bridge the existing patch-proposal and transactional-composition paths into an
immutable candidate output, then prove that exact candidate is semantically
valid before the neutral steward may write it. Serializability is necessary
but not sufficient: two disjoint text ranges can still break imports, types,
schemas, or targeted behavior when combined.

The core owns pure materialization and policy. The CLI side-effect adapter
selects declared validators from task/proposal contracts, language-adapter
static checks, and the project test catalog, runs them against the candidate,
and emits command-backed receipts. No task id, path, language, validator name,
or file extension may alter the generic decision algorithm.

## Acceptance

- [ ] Patch proposals and transactional output are materialized from one immutable base into a non-canonical candidate tree/blob; materialization never mutates the live worktree.
- [ ] Candidate construction verifies proposal digests, anchors/ranges, legal order/permutation, base/HEAD, member attribution, and the exact candidate output digest before validation begins.
- [ ] Validator selection is the sealed union of card/proposal validators, the resolved language adapter's fast static checks, and catalog-selected targeted tests. Selection is capability-driven; core policy contains no TypeScript-, task-, path-, date-, or provider-specific branch.
- [ ] Seal ordering is auditable: validator-policy/union and selection-input digests are committed before participating producers can read the locked semantic-break fixture payload. Revealing or executing the negative control records a later event; any post-reveal union change invalidates the cell instead of weakening the oracle.
- [ ] The exact candidate output is validated after composition and before canonical write. A serializability proof alone can never authorize steward apply or shared commit.
- [ ] The validation receipt binds canonical root, base/HEAD, composition plan and proposal digests, candidate-output digest, selected validator references, executable/argv/cwd, runner/build digest, timestamps, exit status, and derived `pass`/`fail`/`inconclusive` result.
- [ ] All required validators must pass. A command-backed failure returns `ATM_BROKER_COMPOSE_SEMANTIC_VALIDATION_FAILED`; a missing, unsupported, unresolved, or unexecuted required validator returns `ATM_BROKER_COMPOSE_SEMANTIC_VALIDATION_UNAVAILABLE`. Both paths produce zero canonical writes.
- [ ] A locked negative control uses disjoint, individually applicable patches whose combined candidate breaks a static check or targeted test; it must be rejected before steward apply. A positive control proves the same generic path can validate and deliver a safe combined candidate.
- [ ] Steward admission consumes the exact passing candidate/receipt digest and rechecks base/HEAD CAS immediately before apply; changed candidate bytes, stale HEAD, or receipt replay cannot pass through a time-of-check/time-of-use gap.
- [ ] Existing semantic adjudication and language-adapter contracts are reused. This card does not introduce a second merge engine, test runner, task model, or validator registry.
- [ ] Core modules remain side-effect free; command execution and temporary candidate lifecycle stay in CLI adapters. Short English comments explain the post-compose/pre-write boundary and why serializability is not semantic correctness.
- [ ] The semantic safety gate cannot close on source-only tests. The same safe-candidate, semantic-break, and unavailable-validator behavior projection must pass through source and frozen `node atm.mjs`, with source/frozen/build digests and a card-attributable parity receipt. One shared runner-sync build may serve several cards.

## Evidence and rollback

Seal red-before/green-after receipts for the semantic-break negative control,
safe-compose positive control, missing-validator path, stale-CAS path, and zero
canonical-write instrumentation. Rollback preserves proposals and candidates,
then trips shared compose to queue-only until the semantic gate is restored.

## Atomization impact

- owner atom/map: `atm.broker.post-compose-semantic-validation`
- extraction candidates: one pure candidate materializer and one pure validation policy; CLI owns validator execution only.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-22T05:10:29.357Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0254-transactional-patch-materialization-and-post-compose-semantic-validation.task.md","contentDigest":"sha256:9cbe936de3e873ae92bf2e039e05627afb1f3eb253a16c3a6ae799ecfd40bc7d"} -->
