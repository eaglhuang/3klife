---
task_id: TASK-ERR-0004
title: Steward receipt required and invalid shared-write error contracts
status: planned
owner: atm-error-governance
priority: P0
milestone: ATM-3.1-R0
severity: P0
depends_on:
  - ATM-GOV-0249
related_plan: error-governance/error-governance-plan.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "ERR owns stable operator contracts for the new shared-write admission failures; GOV-0250 consumes the registered codes."
scopePaths:
  - docs/governance/error-code-registry.json
  - docs/ERROR_CODES.md
  - tests/cli/steward-receipt-error-contract.test.ts
deliverables:
  - docs/governance/error-code-registry.json
  - docs/ERROR_CODES.md
  - tests/cli/steward-receipt-error-contract.test.ts
validators:
  - npm run generate:error-codes
  - node --strip-types tests/cli/steward-receipt-error-contract.test.ts
errorCodes:
  - ATM_BROKER_STEWARD_RECEIPT_REQUIRED
  - ATM_BROKER_STEWARD_RECEIPT_INVALID
createdByCommand: atm plan card create
evidence:
  required: canonical-error-registry-and-runtime-contract-proof
rollback:
  strategy: revert-code-registration-with-dependent-gate
  notes: "Do not ship GOV-0250 with unregistered or generic fallback errors; dependent shared-write admission remains blocked."
atomizationImpact:
  ownerAtomOrMap: atm.error-code-registry
  mapUpdates: []
  extractionCandidates:
    - atom: atm.error-code-registry.steward-receipt-contracts
      pattern: Canonical Registry Entry
      source: docs/governance/error-code-registry.json
      disposition: inline
      inlineReason: "Owner-approved canonical registry and generated index must remain unified; splitting two entries into another registry would create competing authority."
---

# TASK-ERR-0004 Steward receipt required and invalid shared-write error contracts

## Intent

Register the two stable operator-facing failures required by receipt-bound
shared-write admission. The codes distinguish absent evidence from present but
untrustworthy evidence, while sharing one deterministic recovery route through
broker compose and neutral-steward delivery.

## Acceptance

- [ ] `ATM_BROKER_STEWARD_RECEIPT_REQUIRED` triggers only when a multi-claim shared mutation reaches a side-effect boundary without a steward composition/apply receipt.
- [ ] `ATM_BROKER_STEWARD_RECEIPT_INVALID` triggers when the receipt is malformed, unsupported, stale, already consumed, base/HEAD mismatched, attribution mismatched, file/blob digest mismatched, or does not prove `canonicalWriteCount: 1`.
- [ ] Both codes use category `team-broker`, are retryable, require no human approval, and provide a deterministic required command/guidance that reruns broker composition/steward delivery rather than permitting direct write.
- [ ] Registry records identify `packages/core/src/broker/shared-write-provenance-policy.ts` as source owner and `TASK-ERR-0004` as registry owner.
- [ ] Generated `docs/ERROR_CODES.md` is refreshed from the canonical registry; no hand-edited mirror contract is introduced.
- [ ] Focused tests prove exact code selection, `retryable: true`, `requiresHumanApproval: false`, required-command presence, source/registry owner parity, and generated-doc parity.
- [ ] Unknown receipt versions and ambiguous evidence fail as `ATM_BROKER_STEWARD_RECEIPT_INVALID`; callers do not collapse these failures into a generic hook or Git error.

## Planned code catalog

| Code | Trigger | Category | Retryable | Human approval | Recovery |
|---|---|---|---:|---:|---|
| `ATM_BROKER_STEWARD_RECEIPT_REQUIRED` | Shared mutation has no steward receipt | `team-broker` | yes | no | Re-enter broker compose/steward delivery |
| `ATM_BROKER_STEWARD_RECEIPT_INVALID` | Receipt is stale, malformed, mismatched, replayed, or incomplete | `team-broker` | yes | no | Rebuild composition and obtain a fresh steward receipt |

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-22T03:36:48.292Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"error-governance/tasks/TASK-ERR-0004-steward-receipt-required-and-invalid-shared-write-error-contracts.task.md","contentDigest":"sha256:d3c1fb6b33504859a715a32f7782550b4cfcefb7abf203faf8091a72c543bf38"} -->
