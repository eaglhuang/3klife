---
task_id: TASK-ERR-0006
title: Post-compose semantic validation ErrorCode contracts
status: planned
owner: atm-error-governance
priority: P0
milestone: ATM-3.1-R2
severity: P0
depends_on:
  - ATM-GOV-0241
  - ATM-GOV-0249
related_plan: error-governance/error-governance-plan.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "ERR owns canonical ErrorCode registration; GOV-0254 consumes these contracts but must not define a parallel error taxonomy."
scopePaths:
  - docs/governance/error-code-registry.json
  - docs/ERROR_CODES.md
  - packages/generated/src/error-codes.ts
  - packages/core/src/broker/post-compose-semantic-validation-policy.ts
  - packages/cli/src/commands/broker/post-compose-semantic-validation.ts
  - tests/cli/post-compose-semantic-validation-error-contract.test.ts
deliverables:
  - docs/governance/error-code-registry.json
  - docs/ERROR_CODES.md
  - packages/generated/src/error-codes.ts
  - tests/cli/post-compose-semantic-validation-error-contract.test.ts
validators:
  - npm run generate:error-codes
  - node --strip-types tests/cli/post-compose-semantic-validation-error-contract.test.ts
  - npm run typecheck
errorCodes:
  - ATM_BROKER_COMPOSE_SEMANTIC_VALIDATION_FAILED
  - ATM_BROKER_COMPOSE_SEMANTIC_VALIDATION_UNAVAILABLE
createdByCommand: atm plan card create
evidence:
  required: post-compose-semantic-validation-error-contract-receipts
rollback:
  strategy: revert-registry-and-generated-projections-together
  notes: "Unknown or missing semantic-validation contracts remain fail-closed; do not replace exact codes with a generic broker failure."
atomizationImpact:
  ownerAtomOrMap: atm.error-governance.registry
  mapUpdates: []
  extractionCandidates: []
---

# TASK-ERR-0006 Post-compose semantic validation ErrorCode contracts

## Intent

Register the exact operator contracts used when a composed candidate either
fails its required semantic validators or cannot obtain a command-backed
result. These are different recovery states and must not collapse into a
generic compose, receipt, or steward failure.

## Acceptance

- [ ] Register `ATM_BROKER_COMPOSE_SEMANTIC_VALIDATION_FAILED` for a materialized candidate that ran one or more required validators and received a failing result.
- [ ] Register `ATM_BROKER_COMPOSE_SEMANTIC_VALIDATION_UNAVAILABLE` when a required language/project validator cannot be resolved or executed, or lacks a command-backed result.
- [ ] Both codes use category `team-broker`, are retryable, require no human approval, prohibit canonical write, and route recovery back through candidate repair/materialization plus semantic revalidation on current base/HEAD.
- [ ] The failed contract tells the operator to repair or recompute proposals and rerun the same sealed validator set; the unavailable contract tells the operator to restore/resolve the declared validator and rerun it. Neither authorizes skipping the validator or substituting a healthy boolean.
- [ ] Registry metadata identifies `packages/core/src/broker/post-compose-semantic-validation-policy.ts` and `packages/cli/src/commands/broker/post-compose-semantic-validation.ts` as source owners and `TASK-ERR-0006` as registry owner.
- [ ] Generated TypeScript, Markdown, operator guidance, and registry entries remain deterministic and parity-checked.
- [ ] Focused tests lock exact code selection for pass, fail, unavailable, malformed receipt, and no-write recovery paths; GOV-0254 imports generated constants rather than string literals or a local fallback taxonomy.

## Evidence and rollback

Seal registry generation parity and focused exact-code tests. Revert canonical
registry and generated projections together; semantic validation remains
fail-closed while the contracts are unavailable.

## Atomization impact

- owner atom/map: `atm.error-governance.registry`
- registry/generated projections remain inline governance surfaces; no new runtime atom is created.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-22T05:10:32.380Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"error-governance/tasks/TASK-ERR-0006-post-compose-semantic-validation-errorcode-contracts.task.md","contentDigest":"sha256:086359aaff4b572fe368d35144e81283e0c1f2a8bb17ce065dd97f13bf37aceb"} -->
