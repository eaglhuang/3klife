---
task_id: TASK-ERR-0005
title: Acceptance evidence and cross-authority closure ErrorCode contracts
status: done
owner: atm-error-governance
priority: P0
milestone: ATM-3.1-R0
severity: P0
depends_on:
  - ATM-GOV-0251
related_plan: error-governance/error-governance-plan.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - docs/governance/error-code-registry.json
  - docs/ERROR_CODES.md
  - packages/core/src/error-code-registry.generated.ts
  - tests/cli/acceptance-closure-error-contract.test.ts
deliverables:
  - docs/governance/error-code-registry.json
  - docs/ERROR_CODES.md
  - packages/core/src/error-code-registry.generated.ts
  - tests/cli/acceptance-closure-error-contract.test.ts
validators:
  - npm run generate:error-codes
  - node --strip-types tests/cli/acceptance-closure-error-contract.test.ts
  - npm run typecheck
errorCodes:
  - ATM_TASK_CLOSE_ACCEPTANCE_EVIDENCE_INSUFFICIENT
  - ATM_TASK_CLOSE_INDEPENDENT_VERIFIER_REQUIRED
  - ATM_TASKFLOW_CROSS_AUTHORITY_CLOSEBACK_PENDING
evidence:
  required: generated-errorcode-contract-parity
rollback:
  strategy: revert-commit
  notes: "Do not remove a code after any emitter ships; retire it through the registry lifecycle instead."
atomizationImpact:
  ownerAtomOrMap: atm.error-code.registry
  mapUpdates: []
  extractionCandidates:
    - atom: atm.error-code.registry-data
      pattern: Canonical Registry
      source: docs/governance/error-code-registry.json
      disposition: inline
      inlineReason: "The task adds three declarative rows to the existing single authority; splitting the registry would create a second writable source."
    - atom: atm.error-code.generated-docs
      pattern: Generated Projection
      source: docs/ERROR_CODES.md
      disposition: inline
      inlineReason: "This file is generated from the registry and must not be manually extracted or edited as an independent authority."
createdByCommand: atm plan card create
completed_at: "2026-07-22T08:46:41.104Z"
completed_by_agent: "codex-plan31-captain-2"
closedAt: "2026-07-22T08:46:41.104Z"
closedByActor: "codex-plan31-captain-2"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-22T08-46-41-104Z-close-6810e37abdd2"
lastTransitionAt: "2026-07-22T08:46:41.104Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "2cb296da9f3b95bb71b62b03035e105d582e82a7"
---

# TASK-ERR-0005 Acceptance evidence and cross-authority closure ErrorCode contracts

## Intent

Register the exact operator-facing failures introduced by acceptance-evidence
closure and cross-authority closeback. The registry remains the only owner of
code spelling, category, retryability, approval, and recovery semantics; GOV
tasks consume the generated contracts and must not create aliases or generic
fallback codes.

## Acceptance

- [ ] Register `ATM_TASK_CLOSE_ACCEPTANCE_EVIDENCE_INSUFFICIENT` for a closure-critical predicate whose source is unavailable, derivation fails, evidence is below required realness, a negative control lacks discrimination, or the result remains unresolved. Category is `task-ledger`; retryable is `true`; human approval is `false`; recovery reruns the evidence/verification step named in the returned manifest before task pre-close.
- [ ] Register `ATM_TASK_CLOSE_INDEPENDENT_VERIFIER_REQUIRED` when a closure-critical claim has neither a valid separate-actor verifier receipt nor a pre-sealed locked-policy verifier digest. Category is `task-ledger`; retryable is `true`; human approval is `false`; recovery executes the declared verifier before task pre-close.
- [ ] Register `ATM_TASKFLOW_CROSS_AUTHORITY_CLOSEBACK_PENDING` when target and planning closeback are not both durably committed, or when a sealed root/HEAD/source-card CAS moves between prepare and commit. Category is `taskflow`; retryable is `true`; human approval is `false`; recovery diagnoses and reconciles the existing saga receipt rather than replaying completed side effects.
- [ ] Every entry supplies exact trigger, source owner, registry owner `TASK-ERR-0005`, retryability, approval, required evidence, deterministic operator guidance, and executable/argv recovery manifest fields supported by the registry.
- [ ] Source owners are respectively the acceptance-evidence gate and cross-authority closeback saga modules; generated docs and generated TypeScript match the registry digest.
- [ ] Tests prove the three codes are distinct from the older generic `ATM_TASK_CLOSE_EVIDENCE_REQUIRED`, closure-packet-invalid, and planning-followup contracts.
- [ ] GOV implementations import generated codes and cannot redefine spelling, retryability, or recovery text locally.
- [ ] No task ID, plan name, repository path, actor, date, or provider is embedded in the trigger logic.
- [ ] Before the first delivery commit, the implementer reviews registry generator/readers and sibling generated outputs; any required touched path is added once through governed scope amendment, while unchanged generator code remains out of the delivery.

## ErrorCode contract catalog

| Code | Stable trigger | Source owner |
|---|---|---|
| `ATM_TASK_CLOSE_ACCEPTANCE_EVIDENCE_INSUFFICIENT` | Closure-critical semantic evidence is missing, below class, non-discriminating, or unresolved | `packages/cli/src/commands/tasks/close-orchestrator/acceptance-evidence-gate.ts` |
| `ATM_TASK_CLOSE_INDEPENDENT_VERIFIER_REQUIRED` | Neither permitted independent-verifier mode is proven | `packages/cli/src/commands/tasks/close-orchestrator/acceptance-evidence-gate.ts` |
| `ATM_TASKFLOW_CROSS_AUTHORITY_CLOSEBACK_PENDING` | A prepared cross-authority closeback has not committed both authorities | `packages/cli/src/commands/taskflow/cross-authority-closeback.ts` |

## Atomization impact

No extraction is needed. The registry must remain the single writable authority,
and the large public document is a generated projection rather than a module to
split by hand.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-22T04:45:48.158Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"error-governance/tasks/TASK-ERR-0005-acceptance-evidence-and-cross-authority-closure-errorcode-contracts.task.md","contentDigest":"sha256:5459ec5f7ea85d476236be84e60f76373aa4a83a0a8a0e435dbf7852d400aa61"} -->
